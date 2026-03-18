import { WebSocketServer, WebSocket } from 'ws';
import { randomBytes } from 'crypto';
import type { Server } from 'http';

// ─── Types ────────────────────────────────────────────────────────────────────

interface Room {
  id: string;
  adminUserName: string;
  members: Map<string, WebSocket>;
  gameStarted: boolean;
}

// ─── État global des rooms ────────────────────────────────────────────────────

const rooms = new Map<string, Room>();

// ─── Utilitaires ──────────────────────────────────────────────────────────────

function generateRoomId(): string {
  return randomBytes(3).toString('hex').toUpperCase();
}

function send(ws: WebSocket, payload: object): void {
  if (ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify(payload));
  }
}

function broadcast(room: Room, payload: object, excludeUser?: string): void {
  const raw = JSON.stringify(payload);
  for (const [userName, ws] of room.members) {
    if (userName !== excludeUser && ws.readyState === WebSocket.OPEN) {
      ws.send(raw);
    }
  }
}

function removeFromRoom(room: Room, userName: string): void {
  room.members.delete(userName);
  if (room.members.size > 0) {
    broadcast(room, { kind: 'user_left', user_name: userName });
  }
  if (room.members.size === 0) {
    rooms.delete(room.id);
    console.log(`[ws] Room ${room.id} supprimée (vide)`);
  }
}

// ─── Initialisation du serveur WebSocket ─────────────────────────────────────

/**
 * Attache un serveur WebSocket au serveur HTTP Express existant.
 * Appelé depuis index.ts après la création du serveur HTTP.
 */
export function initWebSocketServer(httpServer: Server): void {
  const wss = new WebSocketServer({ server: httpServer, path: '/ws' });

  wss.on('connection', (ws: WebSocket) => {
    console.log('[ws] Nouvelle connexion');

    let currentRoom: Room | null = null;
    let currentUserName: string | null = null;
    let initialized = false;

    ws.on('message', (rawMessage: Buffer) => {
      let data: Record<string, unknown>;
      try {
        data = JSON.parse(rawMessage.toString('utf-8'));
      } catch {
        send(ws, { kind: 'error', message: 'Format invalide : JSON attendu' });
        return;
      }

      if (!initialized) {
        if (data.kind === 'create_room') {
          const userName = String(data.user_name ?? '').trim();
          if (!userName) {
            send(ws, { kind: 'error', message: 'Le pseudo est requis' });
            ws.close();
            return;
          }
          let roomId = generateRoomId();
          while (rooms.has(roomId)) roomId = generateRoomId();

          const room: Room = {
            id: roomId,
            adminUserName: userName,
            members: new Map([[userName, ws]]),
            gameStarted: false,
          };
          rooms.set(roomId, room);
          currentRoom = room;
          currentUserName = userName;
          initialized = true;
          send(ws, { kind: 'room_created', room_id: roomId });
          console.log(`[ws] Room ${roomId} créée par "${userName}"`);

        } else if (data.kind === 'join_room') {
          const userName = String(data.user_name ?? '').trim();
          const roomId = String(data.room_id ?? '').trim().toUpperCase();

          if (!userName) { send(ws, { kind: 'error', message: 'Le pseudo est requis' }); ws.close(); return; }
          if (!roomId)   { send(ws, { kind: 'error', message: 'Le code de salon est requis' }); ws.close(); return; }

          const room = rooms.get(roomId);
          if (!room)              { send(ws, { kind: 'error', message: `Salon introuvable : "${roomId}"` }); ws.close(); return; }
          if (room.gameStarted)   { send(ws, { kind: 'error', message: 'La partie a déjà commencé' }); ws.close(); return; }
          if (room.members.size >= 2) { send(ws, { kind: 'error', message: 'Ce salon est complet' }); ws.close(); return; }
          if (room.members.has(userName)) { send(ws, { kind: 'error', message: `Pseudo "${userName}" déjà utilisé` }); ws.close(); return; }

          room.members.set(userName, ws);
          currentRoom = room;
          currentUserName = userName;
          initialized = true;

          const existingUsers = [...room.members.keys()].filter(u => u !== userName);
          send(ws, { kind: 'room_joined', users: existingUsers });
          broadcast(room, { kind: 'user_joined', user_name: userName }, userName);
          console.log(`[ws] "${userName}" a rejoint la room ${roomId}`);

        } else {
          send(ws, { kind: 'error', message: 'Commencez par créer ou rejoindre un salon' });
          ws.close();
        }
        return;
      }

      if (!currentRoom || !currentUserName) return;

      switch (data.kind) {
        case 'send_message': {
          const content = String(data.content ?? '').trim();
          if (!content) break;
          broadcast(currentRoom, { kind: 'message_received', sender: currentUserName, content }, currentUserName);
          break;
        }
        case 'start_game': {
          if (currentUserName !== currentRoom.adminUserName) {
            send(ws, { kind: 'error', message: "Seul l'administrateur peut lancer la partie" });
            break;
          }
          if (currentRoom.members.size < 2) {
            send(ws, { kind: 'error', message: 'Impossible de lancer sans 2 joueurs' });
            break;
          }
          currentRoom.gameStarted = true;
          broadcast(currentRoom, { kind: 'game_started' });
          console.log(`[ws] Partie lancée dans la room ${currentRoom.id}`);
          break;
        }
        case 'disconnect': {
          removeFromRoom(currentRoom, currentUserName);
          ws.close();
          currentRoom = null;
          currentUserName = null;
          break;
        }
        default:
          send(ws, { kind: 'error', message: `Type de message inconnu : "${data.kind}"` });
      }
    });

    ws.on('close', () => {
      if (currentRoom && currentUserName) {
        console.log(`[ws] Déconnexion de "${currentUserName}" (room ${currentRoom.id})`);
        removeFromRoom(currentRoom, currentUserName);
      }
    });

    ws.on('error', (error: Error) => {
      console.error(`[ws] Erreur pour "${currentUserName ?? 'inconnu'}" :`, error.message);
      if (currentRoom && currentUserName) removeFromRoom(currentRoom, currentUserName);
    });
  });

  console.log('[ws] Serveur WebSocket initialisé sur le chemin /ws');
}