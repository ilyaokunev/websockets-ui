import { ISocket, IWsMessage, RegistrationRequest, UpdateWinnersResponse } from "./types";

export default class WsHandler {
  private socket: ISocket;
  // сетается при регистрации
  private playerId: string | undefined;

  constructor(socket: ISocket) {
    this.handle = this.handle.bind(this);
    this.socket = socket;
  }

  public handle(message: IWsMessage) {
    const { type, data } = message;

    switch (type) {
      case "reg":
        this.registration(data as RegistrationRequest);
        break;
    }
  }

  private registration(data: RegistrationRequest) {}

}
