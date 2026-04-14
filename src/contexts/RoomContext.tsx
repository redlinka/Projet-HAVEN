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
import { RoomSessionService } from "../services/RoomSession";

export type ConnectionState = "idle" | "connecting" | "connected";

interface RoomContextValue {
  // State (read-only)
  state: ConnectionState;
  messages: Message[];
  connectedUsers: string[];
  userName: string | null;
  roomId: string | null;
  isAdmin: boolean;
  gameId: string;
  error: string | null;
  gameStarted: boolean; // ← GameLobbyPage écoute ce flag
  roomClosed: boolean; // GamePage listens to this flag
  difficulty: { cols: number; rows: number } | null;
  isCanvasReady: boolean; // Game canvas is ready
  canvasRefs: React.MutableRefObject<HTMLCanvasElement[]>;

  // Setters required by Chatter
  setState: (s: ConnectionState) => void;
  setGameId: (s: string) => void;
  setError: (e: string | null) => void;
  setIsCanvasReady: (ready: boolean) => void; // Called when canvas is initialized
  setIsAdmin: (isAdmin: boolean) => void; // Called on reconnection to restore admin rights
  setDifficulty: (difficulty: { cols: number; rows: number }) => void;
  setGameStarted: (b: boolean) => void;

  // Handlers
  handleRoomCreated: (userName: string, id: string, gameId: string) => void;
  handleRoomJoined: (
    userName: string,
    existingUsers: string[],
    gameId: string,
    isAdmin: boolean | false,
  ) => void;
  handleSendMessage: (content: string) => void;
  handleDisconnect: () => void;
  handleStartGame: (onStartGame: () => void) => void;
  handleSelectDifficulty: (mod: { cols: number; rows: number }) => void;
}

const RoomContext = createContext<RoomContextValue | null>(null);

export function RoomProvider({ children }: { children: React.ReactNode }) {
  const roomService = useRoomService();
  const isGameStarting = useRef(false);

  const [state, setState] = useState<ConnectionState>(
    roomService.isInRoom ? "connected" : "idle",
  );
  const [messages, setMessages] = useState<Message[]>(roomService.messages);
  const [connectedUsers, setConnectedUsers] = useState<string[]>([]);
  const [roomId, setRoomId] = useState<string | null>(roomService.roomId);
  const [isAdmin, setIsAdmin] = useState(false);
  const [userName, setUserName] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [gameStarted, setGameStarted] = useState(false);
  const [roomClosed, setRoomClosed] = useState(false);
  const [isCanvasReady, setIsCanvasReady] = useState(false);
  const canvasRefs = useRef<HTMLCanvasElement[]>([]);
  const [difficulty, setDifficulty] = useState<{
    cols: number;
    rows: number;
  } | null>({ cols: 0, rows: 0 });
  const [gameId, setGameId] = useState<string>("");

  // Listeners — only once on mount
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
      setState("idle");
      setMessages([]);
      setConnectedUsers([]);
      setRoomId(null);
      setIsAdmin(false);
      setError(null);
      setDifficulty({ cols: 0, rows: 0 });
      setGameStarted(false);
      setIsCanvasReady(false);
      canvasRefs.current = [];
      setGameId("");
    });

    roomService.setDifficultyListener((mod) => {
      setDifficulty(mod);
    });
  }, [roomService]);

  // ── Handlers ──────────────────────────────────────────────────
  const handleRoomCreated = useCallback(
    (userName: string, id: string, gameID: string) => {
      setRoomId(id);
      setIsAdmin(true);
      setConnectedUsers([userName]);
      setState("connected");
      setError(null);
      setDifficulty({ cols: 0, rows: 0 });
      setGameStarted(false);
      setUserName(userName);
      setGameId(gameID);
    },
    [],
  );

  const handleRoomJoined = useCallback(
    (
      userName: string,
      existingUsers: string[],
      gameId: string,
      isAdmin: boolean | false,
    ) => {
      setConnectedUsers([...existingUsers, userName]);
      setUserName(userName);
      setIsAdmin(isAdmin);
      setState("connected");
      setError(null);
      setDifficulty({ cols: 0, rows: 0 });
      setGameStarted(false);
      setRoomId(roomService.roomId);
      setGameId(gameId);
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
    RoomSessionService.clear();
    roomService.leaveRoom();
    setState("idle");
    setMessages([]);
    setConnectedUsers([]);
    setRoomId(null);
    setIsAdmin(false);
    setError(null);
    setGameStarted(false);
    setRoomClosed(false);
    setDifficulty({ cols: 0, rows: 0 });
    setIsCanvasReady(false);
    setUserName(null);
    canvasRefs.current = [];
    setGameId("");
  }, [roomService]);

  const handleStartGame = useCallback(
    (onStartGame: () => void) => {
      setGameStarted(true);
      roomService.startGame();
      onStartGame();
    },
    [roomService],
  );

  const handleSelectDifficulty = useCallback(
    (mod: { cols: number; rows: number }) => {
      setDifficulty(mod);
      roomService.selectDifficulty(mod);
    },
    [roomService],
  );

  useEffect(() => {
    console.log("RoomContext state update:", {
      roomId,
      userName,
    });
    if (roomId && connectedUsers.length > 0) {
      RoomSessionService.save({
        roomId,
        userName: userName ?? "",
        gameId: gameId ?? "",
        isAdmin,
        difficulty: difficulty ?? { cols: 0, rows: 0 },
      });
    }
  }, [roomId, userName, difficulty]);

  return (
    <RoomContext.Provider
      value={{
        error,
        state,
        roomId,
        gameId,
        isAdmin,
        userName,
        messages,
        difficulty,
        roomClosed,
        canvasRefs,
        gameStarted,
        isCanvasReady,
        connectedUsers,
        setState,
        setError,
        setGameId,
        setIsAdmin,
        setDifficulty,
        setGameStarted,
        setIsCanvasReady,
        handleRoomCreated,
        handleRoomJoined,
        handleSendMessage,
        handleDisconnect,
        handleStartGame,
        handleSelectDifficulty,
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
