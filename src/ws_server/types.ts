export type RequestType =
  | "reg"
  | "create_room"
  | "add_user_to_room"
  | "add_ships"
  | "attack"
  | "randomAttack";

export type ResponseType =
  | "reg"
  | "update_winners"
  | "create_game"
  | "update_room"
  | "start_game"
  | "attack"
  | "turn"
  | "finish";

export interface IWsMessage {
  type: RequestType;
  data: string;
  clients: Set<WebSocket>;
}

export interface ISocket {
  send: (data: string) => void;
}

export interface WinnerToUpdate {
  name: string;
  wins: number;
}

export interface RoomToUpdate {
  roomId: string;
  roomUsers: RoomUser[];
}

export type UpdateWinnersResponse = WinnerToUpdate[];

export type AddPlayerToRoomRequest = {
  indexRoom: string;
};

export type CreateGameResponse = {
  idGame: string;
  idPlayer: string;
};

export interface Game {
  idGame: string;
  players: GamePlayer[];
  roomId: string;
}

export interface GamePlayer {
  ships?: Ship[];
  playerIdInPlayerDb: string;
  idPlayerInGame: string;
}

export type UpdateRoomResponse = RoomToUpdate[];

export type AddShipsRequest = {
  gameId: string;
  ships: Ship[];
  indexPlayer: string;
};

export type StartGameResponse = {
  ships: Ship[];
  currentPlayerIndex: string;
};

export type AttackRequest = {
  gameId: string;
  x: number;
  y: number;
  indexPlayer: string;
};

export type AttackResponse = {
  position: CellPosition;
  currentPlayer: string;
  status: "miss" | "killed" | "shot";
};

export type RandomAttackRequest = {
  gameId: string;
  indexPlayer: string;
};

export type TurnResponse = {
  currentPlayer: string;
};

export type FinishResponse = {
  winPlayer: string;
};

export type RegistrationRequest = Omit<Player, "index">;

export type RegistrationResponse = Omit<Player, "password" | "wins"> & {
  error: boolean;
  errorText: string;
};

export interface Player extends RoomUser {
  password: string;
  wins: number;
}

export interface RoomUser {
  name: string;
  index: string;
}

export interface Ship {
  position: CellPosition;
  direction: boolean;
  length: number;
  type: "small" | "medium" | "large" | "huge";
}

export interface CellPosition {
  x: number;
  y: number;
}
