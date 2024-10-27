// import * as http from 'http';

import { Game, ISocket, RoomToUpdate } from "src/ws_server/types";

// const DB_PORT = Number(process.env.DB_PORT) || 5152;

// const dbServer = http.createServer((req, res) => {
// });

// dbServer.listen(DB_PORT, () => {
//   console.log(`\ndb works on ${DB_PORT} port\n`);
// })

export const playersDb = new Map();
export const roomsDb: Map<string, RoomToUpdate> = new Map();
export const gamesDb: Map<string, Game> = new Map();
export const playerToSocketMap: Record<string, ISocket> = {};
