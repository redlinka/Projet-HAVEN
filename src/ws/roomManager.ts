import { WebSocketServer, WebSocket } from "ws";
import { randomBytes } from "crypto";
import type { Server } from "http";

// ─── Types ────────────────────────────────────────────────────────────────────

interface Room {
  id: string;
  adminUserName: string;
  members: Map<string, WebSocket>;
  gameStarted: boolean;
  gameId: string;
  difficulty: { cols: number; rows: number } | null;
}

// ─── État global des rooms ────────────────────────────────────────────────────

const rooms = new Map<string, Room>();

// ─── Utilitaires ──────────────────────────────────────────────────────────────

function generateRoomId(): string {
  return randomBytes(3).toString("hex").toUpperCase();
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
  const wasAdmin = room.adminUserName === userName;
  console.log(`[ws] "${userName}" quitte la room ${room.id}`);
  room.members.delete(userName);

  if (room.members.size === 0) {
    rooms.delete(room.id);
    console.log(`[ws] Room ${room.id} supprimée (vide)`);
    return;
  }

  if (wasAdmin) {
    // Fermer la room si l'admin quitte
    broadcast(room, { kind: "room_closed" });
    for (const ws of room.members.values()) {
      if (ws.readyState === WebSocket.OPEN) {
        ws.close();
      }
    }
    rooms.delete(room.id);
    console.log(`[ws] Room ${room.id} fermée car l'admin a quitté`);
    return;
  }

  broadcast(room, { kind: "user_left", user_name: userName });
}

// ─── Initialisation du serveur WebSocket ─────────────────────────────────────

/**
 * Attache un serveur WebSocket au serveur HTTP Express existant.
 * Appelé depuis index.ts après la création du serveur HTTP.
 */
export function initWebSocketServer(httpServer: Server): void {
  const wss = new WebSocketServer({ server: httpServer, path: "/ws" });

  wss.on("connection", (ws: WebSocket) => {
    console.log("[ws] Nouvelle connexion");

    let currentRoom: Room | null = null;
    let currentUserName: string | null = null;
    let initialized = false;

    ws.on("message", (rawMessage: Buffer) => {
      let data: Record<string, unknown>;
      try {
        data = JSON.parse(rawMessage.toString("utf-8"));
      } catch {
        send(ws, { kind: "error", message: "Format invalide : JSON attendu" });
        return;
      }

      if (!initialized) {
        if (data.kind === "create_room") {
          const userName = String(data.user_name ?? "").trim();
          if (!userName) {
            send(ws, { kind: "error", message: "Le pseudo est requis" });
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
            gameId: String(data.game_id ?? "").trim(),
            difficulty: null,
          };
          rooms.set(roomId, room);
          currentRoom = room;
          currentUserName = userName;
          initialized = true;
          send(ws, { kind: "room_created", room_id: roomId });
          console.log(`[ws] Room ${roomId} créée par "${userName}"`);
        } else if (data.kind === "join_room") {
          const userName = String(data.user_name ?? "").trim();
          const roomId = String(data.room_id ?? "")
            .trim()
            .toUpperCase();
          const gameId = String(data.game_id ?? "").trim();
          console.log(
            `[ws] Tentative de rejoindre la room ${roomId} avec le pseudo "${userName}" pour le jeu "${gameId}"`,
          );

          if (!userName) {
            send(ws, { kind: "error", message: "Le pseudo est requis" });
            ws.close();
            return;
          }
          if (!roomId) {
            send(ws, { kind: "error", message: "Le code de salon est requis" });
            ws.close();
            return;
          }

          const room = rooms.get(roomId);

          if (!room) {
            send(ws, {
              kind: "error",
              message: `Salon introuvable : "${roomId}"`,
            });
            ws.close();
            return;
          }

          if (room.gameId !== gameId) {
            send(ws, {
              kind: "error",
              message: "Salon inexistant pour ce jeu",
            });
            ws.close();
            return;
          }
          if (room.gameStarted) {
            send(ws, { kind: "error", message: "La partie a déjà commencé" });
            ws.close();
            return;
          }
          if (room.members.size >= 2) {
            send(ws, { kind: "error", message: "Ce salon est complet" });
            ws.close();
            return;
          }
          if (room.members.has(userName)) {
            send(ws, {
              kind: "error",
              message: `Pseudo "${userName}" déjà utilisé`,
            });
            ws.close();
            return;
          }

          room.members.set(userName, ws);
          currentRoom = room;
          currentUserName = userName;
          initialized = true;

          const existingUsers = [...room.members.keys()].filter(
            (u) => u !== userName,
          );
          send(ws, { kind: "room_joined", users: existingUsers });
          broadcast(
            room,
            { kind: "user_joined", user_name: userName },
            userName,
          );
          console.log(`[ws] "${userName}" a rejoint la room ${roomId}`);
        } else {
          send(ws, {
            kind: "error",
            message: "Commencez par créer ou rejoindre un salon",
          });
          ws.close();
        }
        return;
      }

      if (!currentRoom || !currentUserName) return;

      switch (data.kind) {
        case "send_message": {
          const content = String(data.content ?? "").trim();
          if (!content) break;
          broadcast(
            currentRoom,
            { kind: "message_received", sender: currentUserName, content },
            currentUserName,
          );
          break;
        }
        case "start_game": {
          if (currentUserName !== currentRoom.adminUserName) {
            send(ws, {
              kind: "error",
              message: "Seul l'administrateur peut lancer la partie",
            });
            break;
          }
          if (currentRoom.members.size < 2) {
            send(ws, {
              kind: "error",
              message: "Impossible de lancer sans 2 joueurs",
            });
            break;
          }
          currentRoom.gameStarted = true;
          broadcast(currentRoom, {
            kind: "message_received",
            content: "Création de la partie en cours...",
          });
          broadcast(currentRoom, { kind: "game_started" });
          console.log(`[ws] Partie lancée dans la room ${currentRoom.id}`);
          break;
        }
        case "select_difficulty": {
          // Seul l'admin peut choisir la difficulte
          if (currentUserName !== currentRoom.adminUserName) {
            send(ws, {
              kind: "error",
              message: "Seul l'administrateur peut choisir la difficulté",
            });
            break;
          }

          const cols = Number(data.cols);
          const rows = Number(data.rows);

          if (!cols || !rows) {
            send(ws, { kind: "error", message: "Difficulté invalide" });
            break;
          }

          currentRoom.difficulty = { cols, rows };
          broadcast(currentRoom, {
            kind: "difficulty_selected",
            cols,
            rows,
          });

          console.log(
            `[ws] Difficulté sélectionnée dans la room ${currentRoom.id} : ${cols}x${rows}`,
          );
          break;
        }
        case "disconnect": {
          removeFromRoom(currentRoom, currentUserName);
          ws.close();
          currentRoom = null;
          currentUserName = null;
          break;
        }

        case "webrtc_offer": {
          broadcast(
            currentRoom,
            {
              kind: "webrtc_offer",
              sdp: data.sdp,
            },
            currentUserName,
          );
          break;
        }

        case "webrtc_answer": {
          broadcast(
            currentRoom,
            {
              kind: "webrtc_answer",
              sdp: data.sdp,
            },
            currentUserName,
          );
          break;
        }

        case "webrtc_ice_candidate": {
          broadcast(
            currentRoom,
            {
              kind: "webrtc_ice_candidate",
              candidate: data.candidate,
            },
            currentUserName,
          );
          break;
        }
        case "webrtc_ready": {
          broadcast(currentRoom, { kind: "webrtc_ready" }, currentUserName);
          break;
        }
        default:
          send(ws, {
            kind: "error",
            message: `Type de message inconnu : "${data.kind}"`,
          });
      }
    });

    ws.on("close", () => {
      if (currentRoom && currentUserName) {
        console.log(
          `[ws] Déconnexion de "${currentUserName}" (room ${currentRoom.id})`,
        );
        removeFromRoom(currentRoom, currentUserName);
      }
    });

    ws.on("error", (error: Error) => {
      console.error(
        `[ws] Erreur pour "${currentUserName ?? "inconnu"}" :`,
        error.message,
      );
      if (currentRoom && currentUserName)
        removeFromRoom(currentRoom, currentUserName);
    });
  });

  console.log("[ws] Serveur WebSocket initialisé sur le chemin /ws");
}
