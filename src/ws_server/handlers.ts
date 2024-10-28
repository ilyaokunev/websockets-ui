import {
  AddPlayerToRoomRequest,
  AddShipsRequest,
  AttackRequest,
  AttackResponse,
  CreateGameResponse,
  FinishResponse,
  ISocket,
  IWsMessage,
  RandomAttackRequest,
  RegistrationRequest,
  RegistrationResponse,
  StartGameResponse,
  TurnResponse,
  UpdateWinnersResponse,
} from "./types";
import {
  addShips,
  addUserToRoom,
  addWin,
  changeTurn,
  checkIfBothPlayersReady,
  checkIfGameFinish,
  checkIfPlayerExists,
  checkIfPlayerInRoom,
  checkIsPlayersTurn,
  createGame,
  createRoom,
  deleteRoom,
  gameFinish,
  getCurrentPlayerIdForTurn,
  getGamePlayerIdAndGameIdFromPlayerId,
  getPlayer,
  getPlayerIdFromGamePlayerId,
  getPlayersForCreateGame,
  getRoomIdByPlayerId,
  getRoomPlayers,
  getRoomsWithSinglePlayer,
  getWinners,
  makeAttack,
  registration,
} from "../db/utils.js";
import { v4 as uuid } from "uuid";
import { playersDb, roomsDb, playerToSocketMap, gamesDb } from "../db/index.js";

export default class WsHandler {
  private socket: ISocket;
  private playerId: string | undefined;

  constructor(socket: ISocket) {
    this.handle = this.handle.bind(this);
    this.socket = socket;
  }

  public handle(message: IWsMessage) {
    const { type, data, clients } = message;

    switch (type) {
      case "reg":
        this.registration(JSON.parse(data) as RegistrationRequest);
        this.updateWinners(clients);
        this.updateRoom(clients);
        this.setPlayerToSocketMap();
        break;

      case "create_room":
        this.createRoom();
        this.updateRoom(clients);
        break;

      case "add_user_to_room":
        const roomId = (JSON.parse(data) as AddPlayerToRoomRequest).indexRoom;
        const usersInRoom = this.addUserToRoom(roomId);
        this.updateRoom(clients);
        if (usersInRoom === 2) {
          this.createGame(roomId);
        }
        break;

      case "add_ships":
        const shipsData = JSON.parse(data) as AddShipsRequest;
        this.addShips(shipsData);
        if (this.checkIsReady(shipsData.gameId)) {
          this.startGame(shipsData.gameId);
          this.turn(shipsData.gameId);
        }
        break;

      case "attack": {
        const attackData = JSON.parse(data) as AttackRequest;
        if (this.isPlayerTurn(attackData)) {
          this.makeAttack(attackData);
          if (this.isGameFinish(attackData)) {
            this.updateWinners(clients);
            this.cleanupAfterGame(attackData);
          }
          this.turn(attackData.gameId);
        }
        break;
      }

      case "randomAttack": {
        const randomAttackData = JSON.parse(data) as RandomAttackRequest;

        const attackData: AttackRequest = {
          gameId: randomAttackData.gameId,
          indexPlayer: randomAttackData.indexPlayer,
          x: this.getRandom(0, 9),
          y: this.getRandom(0, 9),
        };
        if (this.isPlayerTurn(attackData)) {
          this.makeAttack(attackData);
          if (this.isGameFinish(attackData)) {
            this.updateWinners(clients);
            this.cleanupAfterGame(attackData);
          }
          this.turn(attackData.gameId);
        }
        break;
      }
    }
  }

  public close(clients: Set<WebSocket>) {
    const roomId = getRoomIdByPlayerId(roomsDb, this.playerId!);

    if (roomId) {
      const roomPlayers = getRoomPlayers(roomsDb, roomId);
      const playerToWin = roomPlayers.filter((player) => player.index != this.playerId)[0];

      if (playerToWin) {
        const { gameId, player } = getGamePlayerIdAndGameIdFromPlayerId(gamesDb, this.playerId!)!;

        const responseObj: FinishResponse = {
          winPlayer: player!.idPlayerInGame,
        };

        const response = {
          type: "finish",
          id: 0,
          data: JSON.stringify(responseObj),
        };

        gameFinish(gamesDb, gameId);
        playerToSocketMap[player!.playerIdInPlayerDb].send(JSON.stringify(response));
        addWin(playersDb, playerToWin.index);
        this.updateWinners(clients);
      }

      deleteRoom(roomsDb, roomId);
      this.updateRoom(clients);
    }
  }

  private registration(data: RegistrationRequest) {
    const player = checkIfPlayerExists(playersDb, data);

    if (player) {
      this.playerId = player.index;

      const responseObj: RegistrationResponse = {
        name: player.name,
        index: player.index,
        error: true,
        errorText: "You have been already registered",
      };

      const response = {
        data: responseObj,
        type: "reg",
        id: 0,
      };

      this.socket.send(JSON.stringify(response));
    } else {
      this.playerId = registration(playersDb, data).index;

      const player = getPlayer(playersDb, this.playerId);

      const responseObj: RegistrationResponse = {
        name: player.name,
        index: player.index,
        error: false,
        errorText: "",
      };

      const response = {
        data: JSON.stringify(responseObj),
        type: "reg",
        id: 0,
      };

      this.socket.send(JSON.stringify(response));
    }
  }

  private updateRoom(clients: Set<WebSocket>) {
    const rooms = getRoomsWithSinglePlayer(roomsDb);
    const response = {
      data: JSON.stringify(rooms),
      type: "update_room",
      id: 0,
    };

    clients.forEach((client) => client.send(JSON.stringify(response)));
  }

  private updateWinners(clients: Set<WebSocket>) {
    const updateObj: UpdateWinnersResponse = getWinners(playersDb);

    const response = {
      data: JSON.stringify(updateObj),
      type: "update_winners",
      id: 0,
    };

    clients.forEach((client) => client.send(JSON.stringify(response)));
  }

  private createRoom() {
    const player = getPlayer(playersDb, this.playerId!);
    if (!checkIfPlayerInRoom(roomsDb, player)) {
      createRoom(roomsDb, player);
    }
  }

  private addUserToRoom(roomId: string) {
    return addUserToRoom(roomsDb, roomId, getPlayer(playersDb, this.playerId!));
  }

  private createGame(roomId: string) {
    const roomUsers = roomsDb.get(roomId)!.roomUsers!;

    const game = createGame(gamesDb, roomUsers, roomId);

    const responseObjForFirstPlayer: CreateGameResponse = {
      idGame: game.idGame,
      idPlayer: game.players[0].idPlayerInGame,
    };

    const responseObjForSecondPlayer: CreateGameResponse = {
      idGame: game.idGame,
      idPlayer: game.players[1].idPlayerInGame,
    };

    const responseForFirstPlayer = {
      type: "create_game",
      id: 0,
      data: JSON.stringify(responseObjForFirstPlayer),
    };

    const responseForSecondPlayer = {
      type: "create_game",
      id: 0,
      data: JSON.stringify(responseObjForSecondPlayer),
    };

    const firstUser = roomUsers.find((user) => user.index === game.players[0].playerIdInPlayerDb);
    const secondUser = roomUsers.find((user) => user.index === game.players[1].playerIdInPlayerDb);

    playerToSocketMap[firstUser!.index].send(JSON.stringify(responseForFirstPlayer));
    playerToSocketMap[secondUser!.index].send(JSON.stringify(responseForSecondPlayer));
  }

  private setPlayerToSocketMap() {
    playerToSocketMap[this.playerId!] = this.socket;
  }

  private addShips(shipsData: AddShipsRequest) {
    addShips(gamesDb, shipsData);
  }

  private checkIsReady(gameId: string) {
    return checkIfBothPlayersReady(gamesDb, gameId);
  }

  private startGame(gameId: string) {
    getPlayersForCreateGame(gamesDb, gameId).forEach((player) => {
      const responseObj: StartGameResponse = {
        currentPlayerIndex: player.idPlayerInGame,
        ships: player.ships!,
      };

      const response = {
        type: "start_game",
        id: 0,
        data: JSON.stringify(responseObj),
      };

      playerToSocketMap[player.playerIdInPlayerDb].send(JSON.stringify(response));
    });
  }

  private turn(gameId: string) {
    const currentTurn = getCurrentPlayerIdForTurn(gamesDb, gameId);

    getPlayersForCreateGame(gamesDb, gameId).forEach((player) => {
      const responseObj: TurnResponse = {
        currentPlayer: currentTurn,
      };

      const response = {
        type: "turn",
        id: 0,
        data: JSON.stringify(responseObj),
      };

      playerToSocketMap[player.playerIdInPlayerDb].send(JSON.stringify(response));
    });

    changeTurn(gamesDb, gameId);
  }

  private isPlayerTurn(attackData: AttackRequest) {
    return checkIsPlayersTurn(gamesDb, attackData.gameId, attackData.indexPlayer);
  }

  private makeAttack(attackData: AttackRequest) {
    const attackResult = makeAttack(gamesDb, attackData);

    getPlayersForCreateGame(gamesDb, attackData.gameId).forEach((player) => {
      const responseObj: AttackResponse = {
        status: attackResult,
        currentPlayer: attackData.indexPlayer,
        position: {
          x: attackData.x,
          y: attackData.y,
        },
      };

      const response = {
        type: "attack",
        id: 0,
        data: JSON.stringify(responseObj),
      };

      playerToSocketMap[player.playerIdInPlayerDb].send(JSON.stringify(response));
    });
  }

  private isGameFinish(attackData: AttackRequest) {
    const isFinishes = checkIfGameFinish(gamesDb, attackData);

    if (isFinishes) {
      getPlayersForCreateGame(gamesDb, attackData.gameId).forEach((player) => {
        const responseObj: FinishResponse = {
          winPlayer: attackData.indexPlayer,
        };

        const response = {
          type: "finish",
          id: 0,
          data: JSON.stringify(responseObj),
        };

        playerToSocketMap[player.playerIdInPlayerDb].send(JSON.stringify(response));
      });

      const playerId = getPlayerIdFromGamePlayerId(
        gamesDb,
        attackData.gameId,
        attackData.indexPlayer
      );

      addWin(playersDb, playerId);
      gameFinish(gamesDb, attackData.gameId);
    }

    return isFinishes;
  }

  private cleanupAfterGame(attackData: AttackRequest) {
    const playerId = getPlayerIdFromGamePlayerId(
      gamesDb,
      attackData.gameId,
      attackData.indexPlayer
    );
    const roomId = getRoomIdByPlayerId(roomsDb, playerId);

    if (roomId) {
      deleteRoom(roomsDb, roomId);
    }
  }

  private getRandom(min: number, max: number) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }
}
