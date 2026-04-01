import { useState, useCallback } from "react";
import { useRoom } from "../../contexts/RoomContext";
import ChatDisplayer from "./ChatDisplayer";
import ChatSender from "./ChatSender";
import "../../styles/components/Chat/ChatterRoom.css";

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
        title="Copier le code"
      >
        {codeCopied ? "✓ Copié" : "📋 Copier"}
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
          En attente...
        </span>
      )}
    </div>
  );
}

function StartGameButton() {
  const { isAdmin, connectedUsers, handleStartGame } = useRoom();
  const canStart = isAdmin && connectedUsers.length >= 2;

  if (!isAdmin) return null;

  return (
    <button
      className={`chatter-start-btn ${canStart ? "chatter-start-btn--ready" : ""}`}
      onClick={handleStartGame}
      disabled={!canStart}
      title={canStart ? "Lancer la partie" : "En attente du 2ème joueur"}
    >
      {canStart ? "🎮 Lancer la partie" : "⏳ En attente du 2ème joueur…"}
    </button>
  );
}

export default function ChatterRoom() {
  const { messages, handleSendMessage, handleDisconnect } = useRoom();

  return (
    <div className="chatter">
      <header className="chatter-header">
        <div className="chatter-header-left">
          <span className="chatter-label">Joueurs</span>
          <UsersList />
        </div>
        <div className="chatter-header-right">
          <RoomCodeDisplay />
          <button className="chatter-quit-btn" onClick={handleDisconnect}>
            Quitter
          </button>
        </div>
      </header>

      <div className="chatter-body">
        <ChatDisplayer listMessage={messages} />
      </div>

      <footer className="chatter-footer">
        <ChatSender onMessageEntered={handleSendMessage} />
        <StartGameButton />
      </footer>
    </div>
  );
}
