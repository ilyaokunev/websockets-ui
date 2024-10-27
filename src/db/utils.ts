import {
  AddShipsRequest,
  Game,
  Player,
  RegistrationRequest,
  RoomToUpdate,
  RoomUser,
} from "src/ws_server/types";
import { v4 as uuid } from "uuid";

export function checkIfPlayerExists(db: Map<string, Player>, playerData: RegistrationRequest) {
  const arrOfUsers = Array.from(db.values());
  return arrOfUsers.find(
    (user) => user.name === playerData.name && user.password === playerData.password
  );
}

export function registration(db: Map<string, Player>, data: RegistrationRequest) {
  const user = {
    ...data,
    wins: 0,
    index: uuid(),
  };

  db.set(user.index, user);
  return user;
}

export function getPlayer(db: Map<string, Player>, playerId: string): Player {
  return db.get(playerId)!;
}

export function getWinners(db: Map<string, Player>) {
  return Array.from(db.values())
    .filter((player) => player.wins !== 0)
    .map((player) => ({ name: player.name, wins: player.wins }));
}

export function getRoomsWithSinglePlayer(roomDb: Map<string, RoomToUpdate>) {
  return Array.from(roomDb.values()).filter((room) => room.roomUsers.length === 1);
}

export function checkIfPlayerInRoom(roomDb: Map<string, RoomToUpdate>, player: Player) {
  const roomsWithPlayer = Array.from(roomDb.values()).filter(
    (room) => !!room.roomUsers.find((user) => user.index === player.index)
  );
  return !!roomsWithPlayer.length;
}

export function createRoom(roomDb: Map<string, RoomToUpdate>, player: Player) {
  const roomId = uuid();

  const room: RoomToUpdate = {
    roomId,
    roomUsers: [
      {
        name: player.name,
        index: player.index,
      },
    ],
  };

  roomDb.set(roomId, room);
}

export function addUserToRoom(roomDb: Map<string, RoomToUpdate>, roomId: string, player: Player): number {
  const room = roomDb.get(roomId)!;

  const checkIfUserInRoomIsCurrent = room.roomUsers.filter((user) => user.index === player.index);

  if(room.roomUsers.length === 0) {
    room.roomUsers.push({ name: player.name, index: player.index });
  }

  if (room.roomUsers.length === 1 && !checkIfUserInRoomIsCurrent.length) {
    room.roomUsers.push({ name: player.name, index: player.index });
  }

  return room.roomUsers.length;
}

export function createGame(gamesDb: Map<string, Game>, roomUsers: RoomUser[], roomId: string) {
  const idGame = uuid();
  const playerOneId = uuid();
  const playerTwoId = uuid();

  const game: Game = {
    idGame,
    roomId,
    players: [
      {
        playerIdInPlayerDb: roomUsers[0].index,
        idPlayerInGame: playerOneId,
      },
      {
        playerIdInPlayerDb: roomUsers[1].index,
        idPlayerInGame: playerTwoId,
      },
    ],
  };

  gamesDb.set(idGame, game);
  return game;
}

export function addShips(gamesDb: Map<string, Game>, shipsData: AddShipsRequest) {
  const game = gamesDb.get(shipsData.gameId)!;
  const playerInGame = game.players.find(
    (player) => player.idPlayerInGame === shipsData.indexPlayer
  )!;

  playerInGame.ships = shipsData.ships;
}

export function checkIfBothPlayersReady(gamesDb: Map<string, Game>, gameId: string) {
  const game = gamesDb.get(gameId)!;
  return game.players.every((player) => !!player.ships?.length);
}

export function getPlayersForCreateGame(gamesDb: Map<string, Game>, gameId: string) {
  const game = gamesDb.get(gameId)!;
  return game.players;
}
