import { useState, useCallback, useEffect } from "react";
import { useRoom } from "../../contexts/RoomContext";
import ChatDisplayer from "./ChatDisplayer";
import ChatSender from "./ChatSender";
import "../../styles/components/Chat/ChatterRoom.css";
import { useNavigate, useParams } from "react-router-dom";
import { Copy, Check, LogOut } from "lucide-react";

function RoomCodeDisplay() {
  const { roomId, isAdmin } = useRoom();
  const [codeCopied, setCodeCopied] = useState(false);

  const handleCopyCode = useCallback(() => {
    if (!roomId) return;
    navigator.clipboard.writeText(roomId).then(() => {
      setCodeCopied(true);
      setTimeout(() => setCodeCopied(false), 2000);
    });
  }, [roomId]);

  if (!isAdmin || !roomId) return null;

  return (
    <div className="chatter-room-code">
      <span className="chatter-label">Code</span>
      <code className="chatter-code-value">{roomId}</code>
      <button
        className={`chatter-copy-btn ${codeCopied ? "chatter-copy-btn--copied" : ""}`}
        onClick={handleCopyCode}
        title="Copy the code"
      >
        {codeCopied ? (
          <>
            <Check size={11} /> Copied
          </>
        ) : (
          <>
            <Copy size={11} /> Copy
          </>
        )}
      </button>
    </div>
  );
}

function UsersList() {
  const { connectedUsers } = useRoom();

  return (
    <div className="chatter-users">
      {connectedUsers.map((user: string) => (
        <span key={user} className="chatter-user-badge">
          {user}
        </span>
      ))}
      {connectedUsers.length < 2 && (
        <span className="chatter-user-badge chatter-user-badge--waiting">
          Waiting ...
        </span>
      )}
    </div>
  );
}

function StartGameButton() {
  const { isAdmin, connectedUsers, handleStartGame } = useRoom();
  const canStart = isAdmin && connectedUsers.length >= 2;
  const navigate = useNavigate();
  const { id: gameId } = useParams();

  if (!isAdmin) return null;

  const onStartGame = () => {
    if (isAdmin) {
      navigate(`/game/${gameId}`);
    }
  };

  return (
    <button
      className={`chatter-start-btn ${canStart ? "chatter-start-btn--ready" : ""}`}
      onClick={() => handleStartGame(onStartGame)}
      disabled={!canStart}
      title={canStart ? "Start Game" : "Waiting for second player"}
    >
      {canStart ? "🎮 Start Game" : "⏳ Waiting..."}
    </button>
  );
}

export default function ChatterRoom() {
  const {
    isAdmin,
    messages,
    difficulty,
    gameStarted,
    handleSendMessage,
    handleDisconnect,
  } = useRoom();

  const navigate = useNavigate();
  const { id: gameId } = useParams();

  useEffect(() => {
    if (!isAdmin && gameStarted) {
      switch (gameId) {
        case "0":
          if (difficulty?.cols !== 0 && difficulty?.rows !== 0) {
            navigate(`/game/${gameId}`);
          }
          break;
        case "1":
          navigate(`/game/${gameId}`);
          break;
        default:
          break;
      }
    }
  }, [isAdmin, difficulty, gameStarted]);

  return (
    <div className="chatter">
      <header className="chatter-header">
        <div className="chatter-header-left">
          <span className="chatter-label">Players</span>
          <UsersList />
        </div>
        <div className="chatter-header-right">
          <RoomCodeDisplay />
          <button
            className="chatter-quit-btn"
            onClick={handleDisconnect}
            title="Leave the game"
          >
            <LogOut size={13} />
            Leave
          </button>
        </div>
      </header>

      <div className="chatter-body">
        <ChatDisplayer listMessage={messages} />
      </div>

      <footer className="chatter-footer">
        <ChatSender onMessageEntered={handleSendMessage} />
        {!gameStarted && <StartGameButton />}
      </footer>
    </div>
  );
}
