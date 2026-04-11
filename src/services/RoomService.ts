import type { Message } from "../components/Chat/ChatDisplayer";

/**
 * Interface defining the contract for a chat manager.
 * Any implementation (WebSocket, Mock, etc.) must respect this contract.
 */
export interface RoomService {
  // State
  /** Messages accumulated since the beginning of the session */
  readonly messages: Message[];
  /** ID of the active room, null if not connected */
  readonly roomId: string | null;
  /** True if the user is currently in a room */
  readonly isInRoom: boolean;

  /**
   * Creates a new room and returns its identifier.
   * Updates roomId and isInRoom on success.
   * Throws an exception on connection failure.
   */
  createRoom(userName: string, gameId: string): Promise<string>;

  /**
   * Joins an existing room via its identifier.
   * Returns the list of already connected users.
   * Throws an exception if the room is not found or is full.
   */
  joinRoom(userName: string, roomId: string, gameId: string): Promise<string[]>;

  /**
   * Sets the listener called for each received message (or system message).
   */
  setMessageListener(listener: (message: Message) => void | null): void;

  /**
   * Sets the listener called when the player list changes (join/leave).
   */
  setRoomUpdateListener(listener: (users: string[]) => void): void;

  /**
   * Sets the listener called when the admin closes the room.
   */
  setRoomClosedListener(listener: () => void): void;

  /**
   * Sets the listener called when the game is started by the admin.
   */
  setGameStartedListener(listener: () => void): void;

  /**
   * Sets the listener called when the admin selects the game difficulty.
   */
  setDifficultyListener(
    listener: (mod: { cols: number; rows: number }) => void,
  ): void;

  /**
   * Sends a text message to the room.
   */
  sendMessage(content: string): void;

  /**
   * Starts the game (reserved for the room admin).
   */
  startGame(): void;

  /**
   * Selects the difficulty level for the game.
   */
  selectDifficulty(mod: { cols: number; rows: number }): void;

  /**
   * Closes the connection cleanly.
   */
  close(): void;

  /**
   * Leaves the current room without closing the WebSocket connection.
   * Allows joining another room or creating a new one.
   */
  leaveRoom(): void;

  rejoinRoom(
    userName: string,
    roomId: string,
    gameId: string,
  ): Promise<{
    users: string[];
    isAdmin: boolean;
    gameStarted: boolean;
    difficulty: { cols: number; rows: number } | null;
  }>;

  setUserRejoiningListener(listener: (userName: string) => void): void;

  sendWebRTCOffer(sdp: RTCSessionDescriptionInit): void;
  sendWebRTCAnswer(sdp: RTCSessionDescriptionInit): void;
  sendWebRTCIceCandidate(candidate: RTCIceCandidateInit): void;
  setWebRTCOfferListener(
    listener: (sdp: RTCSessionDescriptionInit) => void,
  ): void;
  setWebRTCAnswerListener(
    listener: (sdp: RTCSessionDescriptionInit) => void,
  ): void;
  setWebRTCIceCandidateListener(
    listener: (candidate: RTCIceCandidateInit) => void,
  ): void;
  sendWebRTCReady(): void;
  setWebRTCReadyListener(listener: () => void): void;

  /**
   * Sends the end-of-game score to other players
   */
  sendGameEndScore(score: number, game: string, difficulty: string): void;

  /**
   * Receives the end-of-game score from another player
   */
  setGameEndScoreListener(
    listener: (data: {
      opponentScore: number;
      game: string;
      difficulty: string;
    }) => void,
  ): void;
}
