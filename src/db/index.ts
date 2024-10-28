
import { Game, ISocket, RoomToUpdate } from "src/ws_server/types";

export const playersDb = new Map();
export const roomsDb: Map<string, RoomToUpdate> = new Map();
export const gamesDb: Map<string, Game> = new Map();
export const playerToSocketMap: Record<string, ISocket> = {};
