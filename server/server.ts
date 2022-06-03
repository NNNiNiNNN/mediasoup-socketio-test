import { Server, Socket } from 'socket.io';
import http from 'http';
import { Router } from 'mediasoup/node/lib/Router';
import { Transport } from 'mediasoup/node/lib/Transport';
import { Producer } from 'mediasoup/node/lib/Producer';

const server: http.Server = http.createServer();
const io = new Server(server, {
  cors: {
    origin: "http://localhost:1234",
  }
});

var port = 5000;
server.listen(port);

io.on('connection', (socket: Socket) => {

  // メッセージを受け取った時
  socket.on('message', async(msg: any) => {
    // 必要な処理は以下の関数で行う
    const res: any = await getClientMessage(msg);
    console.log("emit: " + res.type);
    socket.emit("message", res);
  });


});




const { createWorker } = require('mediasoup');

let router: Router;
let transports: { [key: string]: Transport } = {};
let producers: { [key: string]: Producer } = {};

const initMediaSoupServer = async () => {
  const worker = await createWorker();
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

  router = await worker.createRouter({ mediaCodecs });
}

initMediaSoupServer();

const getClientMessage = async(msg: any) => {
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


}

const getCapabilities = () => {
  return { "type": "rtpCapabilities", "rtpCapabilities": router.rtpCapabilities };
}

const get2Transports =async () => {
  const sendTransport = await getTransport();
  const recvTransport = await getTransport();
  return {
    "type": "transport",
    "sendTransport": sendTransport,
    "recvTransport": recvTransport,
  }
}

const getTransport = async () => {
  const transport = await router.createWebRtcTransport({
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
}

const getConnect = async (msg: any) => {
  const { id, dtlsParameters } = msg;
  const transport = transports[id];
  await transport.connect({ dtlsParameters });
  return {"type": "connect"};
}

const getProduce = async (msg: any) => {
  const { id, parameters } = msg;
  const transport = transports[id];
  const producer = await transport.produce(parameters);
  producers[producer.id] = producer;
  return ({ "type": "produce", id: producer.id });
}

const getConsume = async (msg: any) => {
  const { id, producerId, rtpCapabilities } = msg;
  const transport = transports[id];
  const consumer = await transport.consume({ producerId, rtpCapabilities });

  return ({
    "type": "consume",
    id: consumer.id,
    kind: consumer.kind,
    rtpParameters: consumer.rtpParameters
  });
}
