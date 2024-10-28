import {
  AddShipsRequest,
  AttackRequest,
  AttackResult,
  Game,
  Player,
  RegistrationRequest,
  RoomToUpdate,
  RoomUser,
  Ship,
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

export function getRoomIdByPlayerId(roomDb: Map<string, RoomToUpdate>, playerId: string) {
  const roomsWithPlayer = Array.from(roomDb.values()).filter(
    (room) => !!room.roomUsers.find((user) => user.index === playerId)
  );

  return roomsWithPlayer.length ? roomsWithPlayer[0].roomId : null;
}

export function deleteRoom(roomDb: Map<string, RoomToUpdate>, roomId: string) {
  roomDb.delete(roomId);
}

export function getRoomPlayers(roomDb: Map<string, RoomToUpdate>, roomId: string) {
  return roomDb.get(roomId)!.roomUsers;
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

export function addUserToRoom(
  roomDb: Map<string, RoomToUpdate>,
  roomId: string,
  player: Player
): number {
  const room = roomDb.get(roomId)!;

  const checkIfUserInRoomIsCurrent = room.roomUsers.filter((user) => user.index === player.index);

  if (room.roomUsers.length === 0) {
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
        shipsLeft: 10,
      },
      {
        playerIdInPlayerDb: roomUsers[1].index,
        idPlayerInGame: playerTwoId,
        shipsLeft: 10,
      },
    ],
    currentTurn: playerOneId,
  };

  gamesDb.set(idGame, game);
  return game;
}

export function addShips(gamesDb: Map<string, Game>, shipsData: AddShipsRequest) {
  const game = gamesDb.get(shipsData.gameId)!;
  const playerInGame = game.players.find(
    (player) => player.idPlayerInGame === shipsData.indexPlayer
  )!;

  const ships = shipsData.ships.map((ship) => ({
    ...ship,
    hits: [],
  }));

  playerInGame.ships = ships;
}

export function checkIfBothPlayersReady(gamesDb: Map<string, Game>, gameId: string) {
  const game = gamesDb.get(gameId)!;
  return game.players.every((player) => !!player.ships?.length);
}

export function getPlayersForCreateGame(gamesDb: Map<string, Game>, gameId: string) {
  const game = gamesDb.get(gameId)!;
  return game.players;
}

export function getCurrentPlayerIdForTurn(gamesDb: Map<string, Game>, gameId: string) {
  return gamesDb.get(gameId)!.currentTurn;
}

export function changeTurn(gamesDb: Map<string, Game>, gameId: string) {
  const game = gamesDb.get(gameId)!;

  const newCurrentPlayer = game.players.find(
    (player) => player.idPlayerInGame !== game.currentTurn
  );

  game.currentTurn = newCurrentPlayer!.idPlayerInGame;
}

export function checkIsPlayersTurn(gamesDb: Map<string, Game>, gameId: string, playerId: string) {
  const game = gamesDb.get(gameId)!;

  return game.currentTurn !== playerId;
}

export function makeAttack(gamesDb: Map<string, Game>, attackData: AttackRequest): AttackResult {
  const game = gamesDb.get(attackData.gameId)!;

  const playerToCheckAttack = game.players.find(
    (player) => player.idPlayerInGame === game.currentTurn
  )!;
  const shipsToCheck = playerToCheckAttack.ships!;

  const attackResult = getAttackResult(attackData.x, attackData.y, shipsToCheck);

  if (attackResult === "killed") {
    --playerToCheckAttack.shipsLeft;
  }
  return attackResult;
}

export function getAttackResult(x: number, y: number, shipsToCheck: Ship[]): AttackResult {
  for (let ship of shipsToCheck) {
    let shipCells = [];

    for (let i = 0; i < ship.length; i++) {
      const currentCell = {
        x: ship.direction ? ship.position.x : ship.position.x + i,
        y: ship.direction ? ship.position.y + i : ship.position.y,
      };

      const isHitted = ship.hits.find(
        (hittedCell) => hittedCell.x === currentCell.x && hittedCell.y === currentCell.y
      );

      shipCells.push({
        ...currentCell,
        isHit: isHitted,
      });
    }

    for (let cell of shipCells) {
      if (cell.x === x && cell.y === y) {
        if (cell.isHit) {
          continue;
        } else {
          ship.hits.push({
            x: cell.x,
            y: cell.y,
          });
          let shipKilled = shipCells.length === ship.hits.length;
          return shipKilled ? "killed" : "shot";
        }
      }
    }
  }
  return "miss";
}

export function checkIfGameFinish(gamesDb: Map<string, Game>, attackData: AttackRequest) {
  const game = gamesDb.get(attackData.gameId)!;
  const playerToCheck = game.players.find((player) => player.idPlayerInGame === game.currentTurn)!;

  return !playerToCheck.shipsLeft;
}

export function addWin(playersDb: Map<string, Player>, winnerId: string) {
  const player = playersDb.get(winnerId)!;
  player.wins++;
}

export function getPlayerIdFromGamePlayerId(
  gamesDb: Map<string, Game>,
  gameId: string,
  playerId: string
) {
  const game = Array.from(gamesDb.values()).find((game) => game.idGame === gameId)!;

  return game.players.find((player) => player.idPlayerInGame === playerId)!.playerIdInPlayerDb;
}

export function gameFinish(gamesDb: Map<string, Game>, gameId: string) {
  gamesDb.get(gameId)!.finished = true;
}

export function getGamePlayerIdAndGameIdFromPlayerId(gamesDb: Map<string, Game>, playerId: string) {
  const gameWithCurrentPlayer = Array.from(gamesDb.values()).filter(
    (game) => game.players[0].playerIdInPlayerDb === playerId || game.players[1].playerIdInPlayerDb
  );

  const currentGame = gameWithCurrentPlayer.find((game) => !game.finished)!;

  return {
    gameId: currentGame.idGame,
    player: currentGame.players.find((gamePlayer) => gamePlayer.playerIdInPlayerDb !== playerId),
  };
}
