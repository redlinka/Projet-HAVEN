import { useRef, useState } from "react";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import type { Game } from "../types/types";
import Chatter from "./Chat/Chatter";
import { WebSocketChatManager } from "../services/Websocketchatmanager";
import "../styles/components/Room/Gamelobbypage.css";

type LobbyState = "select" | "multiplayer";

export default function GameLobbyPage({ games }: { games: Game[] }) {
  const { id } = useParams();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [lobbyState, setLobbyState] = useState<LobbyState>("select");

  const chatManagerRef = useRef(new WebSocketChatManager());
  const initialRoomId = searchParams.get("room") ?? undefined;

  const gameSelected = id ? games[Number(id)] : null;

  if (!gameSelected) {
    return <h2>Game not found</h2>;
  }

  const handleSolo = () => {
    navigate(`/game/${id}`);
  };

  const handleMultiplayer = () => {
    // Si un code est déjà dans l'URL, on passe directement en mode multijoueur
    setLobbyState("multiplayer");
  };

  const handleGameStarted = () => {
    // L'admin a lancé la partie → on navigue vers le jeu
    // On passe le chatManager via router state pour que GamePage puisse l'utiliser
    navigate(`/game/${id}`, {
      state: { chatManager: chatManagerRef.current, multiplayer: true },
    });
  };

  const handleBackToSelect = () => {
    chatManagerRef.current.close();
    // Réinitialiser le chatManager pour une nouvelle session éventuelle
    chatManagerRef.current = new WebSocketChatManager();
    setLobbyState("select");
  };

  return (
    <div className="lobby-screen">
      {/* Scanlines overlay */}
      <div className="lobby-scanlines" aria-hidden="true" />

      <div className="lobby-inner">
        {/* Header */}
        <header className="lobby-header">
          <h1 className="lobby-game-title">{gameSelected.title}</h1>
          <p className="lobby-subtitle">
            {lobbyState === "select" ? "SELECT MODE" : "WAITING ROOM"}
          </p>
        </header>

        {/* Mode sélection */}
        {lobbyState === "select" && (
          <div className="lobby-modes">
            {/* SOLO */}
            <button className="lobby-card lobby-card--solo" onClick={handleSolo}>
              <span className="lobby-card-icon">▶</span>
              <span className="lobby-card-name">SOLO</span>
              <span className="lobby-card-desc">Jouer seul</span>
              <span className="lobby-card-stars">★☆☆</span>
            </button>

            {/* CRÉER UNE PARTIE */}
            <button
              className="lobby-card lobby-card--create"
              onClick={handleMultiplayer}
            >
              <span className="lobby-card-name">CRÉER</span>
              <span className="lobby-card-desc">Nouvelle partie</span>
              <span className="lobby-card-stars">★★☆</span>
            </button>

            {/* REJOINDRE */}
            <button
              className={`lobby-card lobby-card--join ${initialRoomId ? "lobby-card--highlighted" : ""}`}
              onClick={handleMultiplayer}
            >
              <span className="lobby-card-name">REJOINDRE</span>
              <span className="lobby-card-desc">Entrer un code</span>
              <span className="lobby-card-stars">★★☆</span>
            </button>
          </div>
        )}

        {/* Chat / Room — mode multijoueur */}
        {lobbyState === "multiplayer" && (
          <div className="lobby-chat-wrapper">
            <Chatter
              chatManager={chatManagerRef.current}
              onGameStarted={handleGameStarted}
              initialRoomId={initialRoomId}
            />
          </div>
        )}

        {/* Footer nav */}
        <footer className="lobby-footer">
          {lobbyState === "multiplayer" ? (
            <button className="lobby-back-btn" onClick={handleBackToSelect}>
              ◀ RETOUR
            </button>
          ) : (
            <button className="lobby-back-btn" onClick={() => navigate(-1)}>
              ◀ RETOUR
            </button>
          )}
          <span className="lobby-hint">← → SELECT · ENTER CONFIRM</span>
        </footer>
      </div>
    </div>
  );
}
