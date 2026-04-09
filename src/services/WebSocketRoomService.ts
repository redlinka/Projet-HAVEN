import type { RoomService } from "./RoomService";
import type { Message } from "../components/Chat/ChatDisplayer";

const WS_URL = import.meta.env.VITE_WS_URL ?? "ws://localhost:2025";

/**
 * Implémentation de RoomService utilisant les WebSockets natives du navigateur.
 * Gère la connexion au serveur, la réception et l'envoi de messages.
 */
export class WebSocketRoomService implements RoomService {
  private ws: WebSocket | null = null;
  private messageListener: ((message: Message) => void) | null = null;
  private roomUpdateListener: ((users: string[]) => void) | null = null;
  private gameStartedListener: (() => void) | null = null;
  private roomClosedListener: (() => void) | null = null;
  private userRejoiningListener: ((userName: string) => void) | null = null;
  private difficultyListener:
    | ((mod: { cols: number; rows: number }) => void)
    | null = null;

  private webRTCOfferListener:
    | ((sdp: RTCSessionDescriptionInit) => void)
    | null = null;
  private webRTCAnswerListener:
    | ((sdp: RTCSessionDescriptionInit) => void)
    | null = null;
  private webRTCIceCandidateListener:
    | ((candidate: RTCIceCandidateInit) => void)
    | null = null;
  private webRTCReadyListener: (() => void) | null = null;
  private gameEndScoreListener:
    | ((data: {
        opponentScore: number;
        game: string;
        difficulty: string;
      }) => void)
    | null = null;

  private currentUsers: string[] = [];
  private _messages: Message[] = [];
  private _roomId: string | null = null;
  private _pendingOpponentScore: {
    opponentScore: number;
    game: string;
    difficulty: string;
  } | null = null;

  get messages() {
    return this._messages;
  }
  get roomId() {
    return this._roomId;
  }
  get isInRoom() {
    return this._roomId !== null;
  }

  // ─── Listeners ─────────────────────────────────────────────────
  setMessageListener(listener: (message: Message) => void | null): void {
    this.messageListener = listener;
  }
  setRoomUpdateListener(listener: (users: string[]) => void): void {
    this.roomUpdateListener = listener;
  }
  setRoomClosedListener(listener: () => void): void {
    this.roomClosedListener = listener;
  }
  setGameStartedListener(listener: () => void): void {
    this.gameStartedListener = listener;
  }
  setDifficultyListener(
    listener: (mod: { cols: number; rows: number }) => void,
  ): void {
    this.difficultyListener = listener;
  }
  setUserRejoiningListener(listener: (userName: string) => void): void {
    this.userRejoiningListener = listener;
  }
  setWebRTCOfferListener(l: (sdp: RTCSessionDescriptionInit) => void) {
    this.webRTCOfferListener = l;
  }
  setWebRTCAnswerListener(l: (sdp: RTCSessionDescriptionInit) => void) {
    this.webRTCAnswerListener = l;
  }
  setWebRTCIceCandidateListener(l: (c: RTCIceCandidateInit) => void) {
    this.webRTCIceCandidateListener = l;
  }
  setWebRTCReadyListener(l: () => void) {
    this.webRTCReadyListener = l;
  }
  setGameEndScoreListener(
    listener: (data: {
      opponentScore: number;
      game: string;
      difficulty: string;
    }) => void,
  ): void {
    this.gameEndScoreListener = listener;
    if (listener && this._pendingOpponentScore) {
      listener(this._pendingOpponentScore);
      this._pendingOpponentScore = null;
    }
  }
  // ─── Connexion ─────────────────────────────────────────────────
  async createRoom(userName: string, gameId: string): Promise<string> {
    const data = await this.establishConnection(
      { kind: "create_room", user_name: userName, game_id: gameId },
      "room_created",
    );
    this.currentUsers = [userName];
    return data.room_id as string;
  }

  async joinRoom(
    userName: string,
    roomId: string,
    gameId: string,
  ): Promise<string[]> {
    const data = await this.establishConnection(
      {
        kind: "join_room",
        user_name: userName,
        room_id: roomId,
        game_id: gameId,
      },
      "room_joined",
    );
    const existingUsers = (data.users as string[]) ?? [];
    this.currentUsers = [...existingUsers, userName];
    return existingUsers;
  }

  private establishConnection(
    payload: Record<string, unknown>,
    successEvent: string,
  ): Promise<Record<string, unknown>> {
    return new Promise((resolve, reject) => {
      try {
        this.ws = new WebSocket(WS_URL);

        this.ws.onopen = () => {
          this.ws?.send(JSON.stringify(payload));
        };

        this.ws.onmessage = (event: MessageEvent) => {
          try {
            const data = JSON.parse(event.data as string);
            if (data.kind === successEvent) {
              this._roomId = (data.room_id || payload.room_id) as string;
              this.ws!.onmessage = this.handleMessage.bind(this);
              resolve(data);
            } else if (data.kind === "error") {
              this.ws?.close();
              reject(new Error(data.message as string));
            }
          } catch (err) {
            reject(err);
          }
        };

        this.ws.onerror = () => {
          reject(new Error("Impossible de se connecter au serveur"));
        };
      } catch (err) {
        reject(err);
      }
    });
  }

  // ─── Réception ─────────────────────────────────────────────────
  private handleMessage(event: MessageEvent): void {
    let data: Record<string, unknown>;
    try {
      data = JSON.parse(event.data as string);
    } catch {
      console.error(
        "[WebSocketChatManager] Message non-JSON reçu :",
        event.data,
      );
      return;
    }

    switch (data.kind) {
      case "message_received":
        this.handleMessageReceived(data);
        break;
      case "user_joined":
        this.handleUserJoined(data);
        break;
      case "user_left":
        this.handleUserLeft(data);
        break;
      case "room_closed":
        this.handleRoomClosed();
        break;
      case "user_rejoined":
        this.userRejoiningListener?.(data.user_name as string);
        break;
      case "user_reconnecting":
        this.handleUserReconnecting(data);
        break;
      case "game_started":
        this.gameStartedListener?.();
        break;
      case "difficulty_selected":
        this.difficultyListener?.({
          cols: data.cols as number,
          rows: data.rows as number,
        });
        break;
      case "webrtc_offer":
        this.webRTCOfferListener?.(data.sdp as RTCSessionDescriptionInit);
        break;
      case "webrtc_answer":
        this.webRTCAnswerListener?.(data.sdp as RTCSessionDescriptionInit);
        break;
      case "webrtc_ice_candidate":
        this.webRTCIceCandidateListener?.(
          data.candidate as RTCIceCandidateInit,
        );
        break;
      case "webrtc_ready":
        this.webRTCReadyListener?.();
        break;
      case "game_end_score":
        const scoreData = {
          opponentScore: data.score as number,
          game: data.game as string,
          difficulty: data.difficulty as string,
        };

        // Toujours stocker le score pour le deuxième joueur
        this._pendingOpponentScore = scoreData;

        if (this.gameEndScoreListener) {
          this.gameEndScoreListener(scoreData); // listener déjà enregistré
        }
        break;
      case "error":
        console.error("[WebSocketChatManager] Erreur serveur :", data.message);
        break;
      default:
        console.warn("[WebSocketChatManager] Type inconnu :", data.kind);
    }
  }

  private handleMessageReceived(data: Record<string, unknown>): void {
    const msg: Message = {
      kind: "received_message",
      sender: data.sender as string,
      content: data.content as string,
      date: new Date(),
    };
    this._messages.push(msg);
    this.messageListener?.(msg);
  }

  private handleUserJoined(data: Record<string, unknown>): void {
    const newUser = data.user_name as string;
    if (!this.currentUsers.includes(newUser)) {
      this.currentUsers = [...this.currentUsers, newUser];
    }
    this.roomUpdateListener?.(this.currentUsers);
    const msg: Message = {
      kind: "system",
      sender: null,
      content: `${newUser} a rejoint la partie`,
      date: new Date(),
    };
    this._messages.push(msg);
    this.messageListener?.(msg);
  }

  private handleUserLeft(data: Record<string, unknown>): void {
    const leavingUser = data.user_name as string;
    this.currentUsers = this.currentUsers.filter((u) => u !== leavingUser);
    this.roomUpdateListener?.(this.currentUsers);
    const msg: Message = {
      kind: "system",
      sender: null,
      content: `${leavingUser} a quitté la partie`,
      date: new Date(),
    };
    this._messages.push(msg);
    this.messageListener?.(msg);
  }

  private handleUserReconnecting(data: Record<string, unknown>): void {
    const userName = data.user_name as string;
    const msg: Message = {
      kind: "system",
      sender: null,
      content: `${userName} est en train de se reconnecter...`,
      date: new Date(),
    };
    this._messages.push(msg);
    this.messageListener?.(msg);
  }

  private handleRoomClosed(): void {
    this.roomClosedListener?.();
    this.currentUsers = [];
    this._roomId = null;
    this._messages = [];
    // Nettoyer aussi les données de fin de partie
    this.gameEndScoreListener = null;
    this._pendingOpponentScore = null;
  }

  // ─── Actions ───────────────────────────────────────────────────
  sendWebRTCOffer(sdp: RTCSessionDescriptionInit): void {
    this.ws?.send(JSON.stringify({ kind: "webrtc_offer", sdp }));
  }
  sendWebRTCAnswer(sdp: RTCSessionDescriptionInit): void {
    this.ws?.send(JSON.stringify({ kind: "webrtc_answer", sdp }));
  }
  sendWebRTCIceCandidate(candidate: RTCIceCandidateInit): void {
    this.ws?.send(JSON.stringify({ kind: "webrtc_ice_candidate", candidate }));
  }
  sendWebRTCReady(): void {
    this.ws?.send(JSON.stringify({ kind: "webrtc_ready" }));
  }
  sendMessage(content: string): void {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({ kind: "send_message", content }));
    } else {
      console.warn(
        "[WebSocketChatManager] sendMessage : connexion non ouverte",
      );
    }
  }

  selectDifficulty(mod: { cols: number; rows: number }): void {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({ kind: "select_difficulty", ...mod }));
    }
  }

  startGame(): void {
    // Réinitialiser les données de fin de partie avant de commencer
    this.gameEndScoreListener = null;
    this._pendingOpponentScore = null;

    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({ kind: "start_game" }));
    }
  }

  sendGameEndScore(score: number, game: string, difficulty: string): void {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(
        JSON.stringify({
          kind: "game_end_score",
          score,
          game,
          difficulty,
        }),
      );
    } else {
      console.warn(
        "[WebSocketRoomService] sendGameEndScore: connexion non ouverte",
      );
    }
  }

  leaveRoom(): void {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({ kind: "disconnect" }));
    }
    this.ws?.close();
    this.ws = null;
    this.currentUsers = [];
    this._messages = [];
    this._roomId = null;
    // Nettoyer les données de fin de partie
    this.gameEndScoreListener = null;
    this._pendingOpponentScore = null;
  }

  async rejoinRoom(userName: string, roomId: string, gameId: string) {
    const data = await this.establishConnection(
      {
        kind: "rejoin_room",
        user_name: userName,
        room_id: roomId,
        game_id: gameId,
      },
      "room_rejoined",
    );
    this._roomId = roomId;
    const users = (data.users as string[]) ?? [];
    this.currentUsers = [...users, userName];
    return {
      users,
      isAdmin: data.is_admin as boolean,
      gameStarted: data.game_started as boolean,
      difficulty: data.difficulty as { cols: number; rows: number } | null,
    };
  }

  close(): void {
    this.ws?.close();
    this.ws = null;
    this.currentUsers = [];
    this._messages = [];
    this._roomId = null;
  }
}
