import { WebSocketServer } from "ws";
import * as http from 'http';
import { url } from "inspector";
import { IWsMessage } from "./types.js";
import Handler from './handlers.js';



const WS_PORT = Number(process.env.WS_PORT) || 3000;
const DB_PORT = Number(process.env.DB_PORT);

const ws = new WebSocketServer({ port: WS_PORT });

ws.on("connection", (socket) => {

  const handlerInstance = new Handler(socket);

  socket.on('message', (message) => {
    const {type, data} = JSON.parse(message.toString()) as IWsMessage;
    
    handlerInstance.handle({type, data});

  // const options = {
  //   hostname: "localhost",
  //   port: process.env.DB_PORT,
  //   method: 'GET',
  //   url:'/'
  // };

  // const req = http.request(options, (res) => {
  //   console.log(res, 'res from db')
  // })

  // req.on('error', console.log)
  })

});
