import {
  AddPlayerToRoomRequest,
  AddShipsRequest,
  CreateGameResponse,
  ISocket,
  IWsMessage,
  RegistrationRequest,
  RegistrationResponse,
  StartGameResponse,
  UpdateWinnersResponse,
} from "./types";
import {
  addShips,
  addUserToRoom,
  checkIfBothPlayersReady,
  checkIfPlayerExists,
  checkIfPlayerInRoom,
  createGame,
  createRoom,
  getPlayer,
  getPlayersForCreateGame,
  getRoomsWithSinglePlayer,
  getWinners,
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
        }
        break;
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
}
