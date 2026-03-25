import type { ChatManager } from './ChatManager';
import type { Message } from '../components/Chat/ChatDisplayer';

const WS_URL = import.meta.env.VITE_WS_URL ?? 'ws://localhost:2025';

/**
 * Implémentation de ChatManager utilisant les WebSockets natives du navigateur.
 * Gère la connexion au serveur, la réception et l'envoi de messages.
 */
export class WebSocketChatManager implements ChatManager {
  private ws: WebSocket | null = null;
  private messageListener: ((message: Message) => void) | null = null;
  private roomUpdateListener: ((users: string[]) => void) | null = null;
  private gameStartedListener: (() => void) | null = null;

  /** Liste locale des utilisateurs connectés (maintenue à jour via les événements serveur) */
  private currentUsers: string[] = [];

  // ─── Enregistrement des listeners ──────────────────────────────────────────

  setMessageListener(listener: (message: Message) => void): void {
    this.messageListener = listener;
  }

  setRoomUpdateListener(listener: (users: string[]) => void): void {
    this.roomUpdateListener = listener;
  }

  setGameStartedListener(listener: () => void): void {
    this.gameStartedListener = listener;
  }

  // ─── Connexion et initialisation du salon ──────────────────────────────────

  async createRoom(userName: string): Promise<string> {
    return new Promise((resolve, reject) => {
      try {
        this.ws = new WebSocket(WS_URL);

        this.ws.onopen = () => {
          this.ws!.send(JSON.stringify({ kind: 'create_room', user_name: userName }));
        };

        this.ws.onmessage = (event: MessageEvent) => {
          const data = JSON.parse(event.data as string);

          if (data.kind === 'room_created') {
            this.currentUsers = [userName];
            // On bascule vers le handler de messages normaux
            this.ws!.onmessage = this.handleMessage.bind(this);
            resolve(data.room_id as string);
          } else if (data.kind === 'error') {
            reject(new Error(data.message as string));
            this.ws?.close();
          }
        };

        this.ws.onerror = () =>
          reject(new Error('Impossible de se connecter au serveur'));

        this.ws.onclose = () => {
          // Ignoré si déjà résolu
        };
      } catch (err) {
        reject(err);
      }
    });
  }

  async joinRoom(userName: string, roomId: string): Promise<string[]> {
    return new Promise((resolve, reject) => {
      try {
        this.ws = new WebSocket(WS_URL);

        this.ws.onopen = () => {
          this.ws!.send(
            JSON.stringify({ kind: 'join_room', user_name: userName, room_id: roomId })
          );
        };

        this.ws.onmessage = (event: MessageEvent) => {
          const data = JSON.parse(event.data as string);

          if (data.kind === 'room_joined') {
            const existingUsers = (data.users as string[]) ?? [];
            // On inclut soi-même dans la liste locale
            this.currentUsers = [...existingUsers, userName];
            this.ws!.onmessage = this.handleMessage.bind(this);
            resolve(existingUsers);
          } else if (data.kind === 'error') {
            reject(new Error(data.message as string));
            this.ws?.close();
          }
        };

        this.ws.onerror = () =>
          reject(new Error('Impossible de se connecter au serveur'));

        this.ws.onclose = () => {
          // Ignoré si déjà résolu
        };
      } catch (err) {
        reject(err);
      }
    });
  }

  // ─── Handler principal des messages entrants ───────────────────────────────

  private handleMessage(event: MessageEvent): void {
    let data: Record<string, unknown>;

    try {
      data = JSON.parse(event.data as string);
    } catch {
      console.error('[WebSocketChatManager] Message non-JSON reçu :', event.data);
      return;
    }

    switch (data.kind) {
      case 'message_received':
        this.messageListener?.({
          kind: 'received_message',
          sender: data.sender as string,
          content: data.content as string,
          date: new Date(),
        });
        break;

      case 'user_joined': {
        const newUser = data.user_name as string;
        if (!this.currentUsers.includes(newUser)) {
          this.currentUsers = [...this.currentUsers, newUser];
        }
        this.roomUpdateListener?.(this.currentUsers);
        this.messageListener?.({
          kind: 'system',
          sender: null,
          content: `${newUser} a rejoint la partie`,
          date: new Date(),
        });
        break;
      }

      case 'user_left': {
        const leftUser = data.user_name as string;
        this.currentUsers = this.currentUsers.filter((u) => u !== leftUser);
        this.roomUpdateListener?.(this.currentUsers);
        this.messageListener?.({
          kind: 'system',
          sender: null,
          content: `${leftUser} a quitté la partie`,
          date: new Date(),
        });
        break;
      }

      case 'game_started':
        this.gameStartedListener?.();
        break;

      case 'error':
        console.error('[WebSocketChatManager] Erreur serveur :', data.message);
        break;

      default:
        console.warn('[WebSocketChatManager] Type de message inconnu :', data.kind);
    }
  }

  // ─── Actions ───────────────────────────────────────────────────────────────

  sendMessage(content: string): void {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({ kind: 'send_message', content }));
    } else {
      console.warn('[WebSocketChatManager] sendMessage : connexion non ouverte');
    }
  }

  startGame(): void {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({ kind: 'start_game' }));
    }
  }

  close(): void {
    if (this.ws) {
      if (this.ws.readyState === WebSocket.OPEN) {
        this.ws.send(JSON.stringify({ kind: 'disconnect' }));
      }
      this.ws.close();
      this.ws = null;
    }
    this.currentUsers = [];
  }
}