import { io } from 'socket.io-client';

const socket = io('http://localhost:5000');

// サーバーへの送信用
const emitTo = (msg: any) => {
  console.log("emit: " + msg.type);
  socket.emit('message', msg);
}

socket.on('message', (msg) => {
  // 必要な処理は以下の関数で行う
  getServerMessage(msg);
});

import { Device } from "mediasoup-client";
import { Transport } from "mediasoup-client/lib/Transport";
const localVideo = <HTMLVideoElement>document.getElementById("localVideo");
const remoteVideo = <HTMLVideoElement>document.getElementById("remoteVideo");
const myProducerId = <HTMLTextAreaElement>document.getElementById('myProducerId');
const producerId = <HTMLTextAreaElement>document.getElementById('callProducerId');
const callButton = <HTMLButtonElement>document.getElementById('call');
let device: Device;
let sendTransport: Transport;
let recvTransport: Transport;
let stream: MediaStream;

const initMediaSoupClient = async () => {
  stream = await navigator.mediaDevices.getUserMedia({
    video: true,
  });
  localVideo.srcObject = stream;
  device = new Device();
  emitTo({"type": "rtpCapabilities"});
}




initMediaSoupClient();


const getServerMessage = (msg: any) => {
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
}

const setCapabilities = async (msg: any) => {
  const routerRtpCapabilities = msg.rtpCapabilities;
  console.log(msg.rtpCapabilities);
  device.load({ routerRtpCapabilities });
  emitTo({ "type": "transport" });
}

const setTransport = async (msg: any) => {

  sendTransport = await createTransport(msg.sendTransport, "send");
  recvTransport = await createTransport(msg.recvTransport, "recv");
  console.log("transport ready");
  produceMedia();
}

const createTransport = async(params: any, dir: string) => {
  
  let transport: Transport;
  if(dir == "send")
  {
    transport = device.createSendTransport(params);
  }
  else
  {
    transport = device.createRecvTransport(params);
  }
  transport.on("connect", async ({ dtlsParameters }, callback, errback) => {
    emitTo({ "type": "connect", id: transport.id, "dtlsParameters": dtlsParameters });
    callback();
  });

  transport.on("produce", async (parameters, callback, errback) => {
    emitTo({ "type": "produce", id: transport.id, parameters });
  });
  return transport;
}

const setProduce = (msg: any) => {
  myProducerId.value = msg.id;
  console.log("produce ready");
}

const produceMedia = async () => {
  const track = stream.getVideoTracks()[0];
  const producer = await sendTransport.produce({ track });
}

const call = () => {
  emitTo({
    "type": "consume", 
    id: recvTransport.id,
    producerId: producerId.value,
    rtpCapabilities: device.rtpCapabilities,
  })
}

callButton.onclick = () => {
  call();
}

const setConsume = async(msg: any) =>
{
  const consumerOptions = msg;
  console.log({consumerOptions});
  
  const consumer = await recvTransport.consume({
    id: consumerOptions.id,
    producerId: producerId.value,
    kind: consumerOptions.kind,
    rtpParameters: consumerOptions.rtpParameters,
  });
  
  remoteVideo.srcObject = new MediaStream([consumer.track]);
  
}

