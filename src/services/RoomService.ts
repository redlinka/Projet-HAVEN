import type { Message } from "../components/Chat/ChatDisplayer";

/**
 * Interface définissant le contrat d'un gestionnaire de chat.
 * Toute implémentation (WebSocket, Mock, etc.) doit respecter ce contrat.
 */
export interface RoomService {
  // ── État ──────────────────────────────────────────────────────
  /** Messages accumulés depuis le début de la session */
  readonly messages: Message[];
  /** Identifiant du salon actif, null si non connecté */
  readonly roomId: string | null;
  /** True si l'utilisateur est actuellement dans un salon */
  readonly isInRoom: boolean;

  /**
   * Crée un nouveau salon et retourne son identifiant.
   * Met à jour roomId et isInRoom en cas de succès.
   * Lance une exception en cas d'échec de connexion.
   */
  createRoom(userName: string, gameId: string): Promise<string>;

  /**
   * Rejoint un salon existant via son identifiant.
   * Retourne la liste des utilisateurs déjà connectés.
   * Lance une exception si le salon est introuvable ou complet.
   */
  joinRoom(userName: string, roomId: string, gameId: string): Promise<string[]>;

  /**
   * Définit le listener appelé à chaque message reçu (ou système).
   */
  setMessageListener(listener: (message: Message) => void | null): void;

  /**
   * Définit le listener appelé quand la liste des joueurs change (join/leave).
   */
  setRoomUpdateListener(listener: (users: string[]) => void): void;

  /**
   * Définit le listener appelé quand l'admin ferme le salon.
   */
  setRoomClosedListener(listener: () => void): void;

  /**
   * Définit le listener appelé quand la partie est lancée par l'admin.
   */
  setGameStartedListener(listener: () => void): void;

  /**
   * Définit le listener appelé quand l'admin sélectionne la difficulté de la partie.
   */
  setDifficultyListener(
    listener: (mod: { cols: number; rows: number }) => void,
  ): void;

  /**
   * Envoie un message texte dans le salon.
   */
  sendMessage(content: string): void;

  /**
   * Lance la partie (réservé à l'admin du salon).
   */
  startGame(): void;

  /**
   * Sélectionne le niveau de difficulté pour la partie.
   */
  selectDifficulty(mod: { cols: number; rows: number }): void;

  /**
   * Ferme proprement la connexion.
   */
  close(): void;

  /**
   * Quitte le salon actuel sans fermer la connexion WebSocket.
   * Permet de rejoindre un autre salon ou d'en créer un nouveau.
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
}
