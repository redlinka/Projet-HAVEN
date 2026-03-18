import type { Message } from '../components/Chat/ChatDisplayer';

/**
 * Interface définissant le contrat d'un gestionnaire de chat.
 * Toute implémentation (WebSocket, Mock, etc.) doit respecter ce contrat.
 */
export interface ChatManager {
  /**
   * Crée un nouveau salon et retourne son identifiant.
   * Lance une exception en cas d'échec de connexion.
   */
  createRoom(userName: string): Promise<string>;

  /**
   * Rejoint un salon existant via son identifiant.
   * Retourne la liste des utilisateurs déjà connectés.
   * Lance une exception si le salon est introuvable ou complet.
   */
  joinRoom(userName: string, roomId: string): Promise<string[]>;

  /**
   * Définit le listener appelé à chaque message reçu (ou système).
   */
  setMessageListener(listener: (message: Message) => void): void;

  /**
   * Définit le listener appelé quand la liste des joueurs change (join/leave).
   */
  setRoomUpdateListener(listener: (users: string[]) => void): void;

  /**
   * Définit le listener appelé quand la partie est lancée par l'admin.
   */
  setGameStartedListener(listener: () => void): void;

  /**
   * Envoie un message texte dans le salon.
   */
  sendMessage(content: string): void;

  /**
   * Lance la partie (réservé à l'admin du salon).
   */
  startGame(): void;

  /**
   * Ferme proprement la connexion.
   */
  close(): void;
}