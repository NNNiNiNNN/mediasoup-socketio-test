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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const socket_io_1 = require("socket.io");
const http_1 = __importDefault(require("http"));
const server = http_1.default.createServer();
const io = new socket_io_1.Server(server, {
    cors: {
        origin: "http://localhost:1234",
    }
});
var port = 5000;
server.listen(port);
io.on('connection', (socket) => {
    // メッセージを受け取った時
    socket.on('message', (msg) => __awaiter(void 0, void 0, void 0, function* () {
        // 必要な処理は以下の関数で行う
        const res = yield getClientMessage(msg);
        console.log("emit: " + res.type);
        socket.emit("message", res);
    }));
});
const { createWorker } = require('mediasoup');
let router;
let transports = {};
let producers = {};
const initMediaSoupServer = () => __awaiter(void 0, void 0, void 0, function* () {
    const worker = yield createWorker();
    const mediaCodecs = [
        {
            kind: 'audio',
            mimeType: 'audio/opus',
            clockRate: 48000,
            channels: 2,
        },
        {
            kind: 'video',
            mimeType: 'video/H264',
            clockRate: 90000,
            parameters: {
                'packetization-mode': 1,
                'profile-level-id': '42e01f',
                'level-asymmetry-allowed': 1,
            },
        },
    ];
    router = yield worker.createRouter({ mediaCodecs });
});
initMediaSoupServer();
const getClientMessage = (msg) => __awaiter(void 0, void 0, void 0, function* () {
    if (msg.type == "rtpCapabilities") {
        return getCapabilities();
    }
    if (msg.type == "transport") {
        return get2Transports();
    }
    if (msg.type == "connect") {
        return getConnect(msg);
    }
    if (msg.type == "produce") {
        return getProduce(msg);
    }
    if (msg.type == "consume") {
        return getConsume(msg);
    }
});
const getCapabilities = () => {
    return { "type": "rtpCapabilities", "rtpCapabilities": router.rtpCapabilities };
};
const get2Transports = () => __awaiter(void 0, void 0, void 0, function* () {
    const sendTransport = yield getTransport();
    const recvTransport = yield getTransport();
    return {
        "type": "transport",
        "sendTransport": sendTransport,
        "recvTransport": recvTransport,
    };
});
const getTransport = () => __awaiter(void 0, void 0, void 0, function* () {
    const transport = yield router.createWebRtcTransport({
        listenIps: [{ ip: '0.0.0.0', announcedIp: '192.168.0.110' }],
    });
    const { id, iceParameters, iceCandidates, dtlsParameters } = transport;
    transports[id] = transport;
    return {
        id,
        iceParameters,
        iceCandidates,
        dtlsParameters,
    };
});
const getConnect = (msg) => __awaiter(void 0, void 0, void 0, function* () {
    const { id, dtlsParameters } = msg;
    const transport = transports[id];
    yield transport.connect({ dtlsParameters });
    return { "type": "connect" };
});
const getProduce = (msg) => __awaiter(void 0, void 0, void 0, function* () {
    const { id, parameters } = msg;
    const transport = transports[id];
    const producer = yield transport.produce(parameters);
    producers[producer.id] = producer;
    return ({ "type": "produce", id: producer.id });
});
const getConsume = (msg) => __awaiter(void 0, void 0, void 0, function* () {
    const { id, producerId, rtpCapabilities } = msg;
    const transport = transports[id];
    const consumer = yield transport.consume({ producerId, rtpCapabilities });
    return ({
        "type": "consume",
        id: consumer.id,
        kind: consumer.kind,
        rtpParameters: consumer.rtpParameters
    });
});
