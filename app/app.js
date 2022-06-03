"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
const socket_io_client_1 = require("socket.io-client");
const socket = (0, socket_io_client_1.io)('http://localhost:5000');
// サーバーへの送信用
const emitTo = (msg) => {
    console.log("emit: " + msg.type);
    socket.emit('message', msg);
};
socket.on('message', (msg) => {
    // 必要な処理は以下の関数で行う
    getServerMessage(msg);
});
const mediasoup_client_1 = require("mediasoup-client");
const localVideo = document.getElementById("localVideo");
const remoteVideo = document.getElementById("remoteVideo");
const myProducerId = document.getElementById('myProducerId');
const producerId = document.getElementById('callProducerId');
const connectButton = document.getElementById('connect');
const callButton = document.getElementById('call');
let device;
let sendTransport;
let recvTransport;
let stream;
const initMediaSoupClient = () => __awaiter(void 0, void 0, void 0, function* () {
    stream = yield navigator.mediaDevices.getUserMedia({
        video: true,
    });
    localVideo.srcObject = stream;
    device = new mediasoup_client_1.Device();
    emitTo({ "type": "rtpCapabilities" });
});
initMediaSoupClient();
const getServerMessage = (msg) => {
    if (msg.type == "rtpCapabilities") {
        return setCapabilities(msg);
    }
    if (msg.type == "transport") {
        return setTransport(msg);
    }
    if (msg.type == "produce") {
        return setProduce(msg);
    }
    if (msg.type == "consume") {
        return setConsume(msg);
    }
};
const setCapabilities = (msg) => __awaiter(void 0, void 0, void 0, function* () {
    const routerRtpCapabilities = msg.rtpCapabilities;
    console.log(routerRtpCapabilities);
    device.load({ routerRtpCapabilities });
    emitTo({ "type": "transport" });
});
const setTransport = (msg) => __awaiter(void 0, void 0, void 0, function* () {
    sendTransport = yield createTransport(msg.sendTransport, "send");
    recvTransport = yield createTransport(msg.recvTransport, "recv");
    console.log("transport ready");
    produceMedia();
});
const createTransport = (params, dir) => __awaiter(void 0, void 0, void 0, function* () {
    let transport;
    if (dir == "send") {
        transport = device.createSendTransport(params);
    }
    else {
        transport = device.createRecvTransport(params);
    }
    transport.on("connect", ({ dtlsParameters }, callback, errback) => __awaiter(void 0, void 0, void 0, function* () {
        emitTo({ "type": "connect", id: transport.id, "dtlsParameters": dtlsParameters });
        callback();
    }));
    transport.on("produce", (parameters, callback, errback) => __awaiter(void 0, void 0, void 0, function* () {
        emitTo({ "type": "produce", id: transport.id, parameters });
    }));
    return transport;
});
const setProduce = (msg) => {
    myProducerId.value = msg.id;
    console.log("produce ready");
};
const produceMedia = () => __awaiter(void 0, void 0, void 0, function* () {
    console.log("producing media...");
    const track = stream.getVideoTracks()[0];
    const producer = yield sendTransport.produce({ track });
});
const call = () => {
    emitTo({
        "type": "consume",
        id: recvTransport.id,
        producerId: producerId.value,
        rtpCapabilities: device.rtpCapabilities,
    });
};
callButton.onclick = () => {
    call();
};
const setConsume = (msg) => __awaiter(void 0, void 0, void 0, function* () {
    const consumerOptions = msg;
    console.log({ consumerOptions });
    const consumer = yield recvTransport.consume({
        id: consumerOptions.id,
        producerId: producerId.value,
        kind: consumerOptions.kind,
        rtpParameters: consumerOptions.rtpParameters,
    });
    remoteVideo.srcObject = new MediaStream([consumer.track]);
});
