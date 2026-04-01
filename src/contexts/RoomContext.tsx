import {
  createContext,
  useContext,
  useRef,
  useState,
  useCallback,
  useEffect,
} from "react";
import { useRoomService } from "./RoomServiceContext";
import type { Message } from "../components/Chat/ChatDisplayer";

export type ConnectionState = "idle" | "connecting" | "connected";

interface RoomContextValue {
  // ── État (lecture seule) ──────────────────────────────────────
  state: ConnectionState;
  messages: Message[];
  connectedUsers: string[];
  roomId: string | null;
  isAdmin: boolean;
  error: string | null;
  gameStarted: boolean; // ← GameLobbyPage écoute ce flag
  roomClosed: boolean; // ← GamePage écoute ce flag

  // ── Setters nécessaires à Chatter ────────────────────────────
  setState: (s: ConnectionState) => void;
  setError: (e: string | null) => void;

  // ── Handlers ─────────────────────────────────────────────────
  handleRoomCreated: (userName: string, id: string) => void;
  handleRoomJoined: (userName: string, existingUsers: string[]) => void;
  handleSendMessage: (content: string) => void;
  handleDisconnect: () => void;
  handleStartGame: () => void;
}

const RoomContext = createContext<RoomContextValue | null>(null);

export function RoomProvider({ children }: { children: React.ReactNode }) {
  const roomService = useRoomService();
  const isGameStarting = useRef(false); // ← privé, pas exposé

  const [state, setState] = useState<ConnectionState>(
    roomService.isInRoom ? "connected" : "idle",
  );
  const [messages, setMessages] = useState<Message[]>(roomService.messages);
  const [connectedUsers, setConnectedUsers] = useState<string[]>([]);
  const [roomId, setRoomId] = useState<string | null>(roomService.roomId);
  const [isAdmin, setIsAdmin] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [gameStarted, setGameStarted] = useState(false);
  const [roomClosed, setRoomClosed] = useState(false);

  // ── Listeners — une seule fois au montage ─────────────────────
  useEffect(() => {
    roomService.setMessageListener((msg) => {
      setMessages((prev) => [...prev, msg]);
    });
    roomService.setRoomUpdateListener((users) => {
      setConnectedUsers(users);
    });
    roomService.setGameStartedListener(() => {
      isGameStarting.current = true;
      setTimeout(() => setGameStarted(true), 800);
    });
    roomService.setRoomClosedListener(() => {
      setRoomClosed(true);
    });
  }, [roomService]);

  // ── Handlers ──────────────────────────────────────────────────
  const handleRoomCreated = useCallback((userName: string, id: string) => {
    setRoomId(id);
    setIsAdmin(true);
    setConnectedUsers([userName]);
    setState("connected");
    setError(null);
  }, []);

  const handleRoomJoined = useCallback(
    (userName: string, existingUsers: string[]) => {
      setConnectedUsers([...existingUsers, userName]);
      setIsAdmin(false);
      setState("connected");
      setError(null);
    },
    [],
  );

  const handleSendMessage = useCallback(
    (content: string) => {
      if (!content.trim()) return;
      setMessages((prev) => [
        ...prev,
        { kind: "send_message", sender: null, content, date: new Date() },
      ]);
      roomService.sendMessage(content);
    },
    [roomService],
  );

  const handleDisconnect = useCallback(() => {
    roomService.leaveRoom();
    setState("idle");
    setMessages([]);
    setConnectedUsers([]);
    setRoomId(null);
    setIsAdmin(false);
    setError(null);
    setGameStarted(false);
    setRoomClosed(false);
  }, [roomService]);

  const handleStartGame = useCallback(() => {
    roomService.startGame();
  }, [roomService]);

  return (
    <RoomContext.Provider
      value={{
        state,
        setState,
        messages,
        connectedUsers,
        roomId,
        isAdmin,
        error,
        setError,
        gameStarted,
        roomClosed,
        handleRoomCreated,
        handleRoomJoined,
        handleSendMessage,
        handleDisconnect,
        handleStartGame,
      }}
    >
      {children}
    </RoomContext.Provider>
  );
}

export function useRoom(): RoomContextValue {
  const ctx = useContext(RoomContext);
  if (!ctx) throw new Error("useRoom doit être utilisé dans un <RoomProvider>");
  return ctx;
}
