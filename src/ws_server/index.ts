import { WebSocketServer } from "ws";
import * as http from "http";
import { url } from "inspector";
import { IWsMessage } from "./types.js";
import Handler from "./handlers.js";

const WS_PORT = Number(process.env.WS_PORT) || 3000;
const DB_PORT = Number(process.env.DB_PORT);

const ws = new WebSocketServer({ port: WS_PORT });

ws.on("connection", (socket) => {
  const handlerInstance = new Handler(socket);

  socket.on("message", (message) => {
    const { type, data } = JSON.parse(message.toString()) as IWsMessage;

    handlerInstance.handle({ type, data, clients: ws.clients as unknown as Set<WebSocket> });
  });

  socket.on("close", () =>  handlerInstance.close( ws.clients as unknown as Set<WebSocket>));
});
