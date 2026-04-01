import { useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";

import type { Game } from "../../types/types";
import { useRoomService } from "../../contexts/RoomServiceContext";

import ModeSelector from "./ModeSelector";
import MultiplayerLobby from "./MultiplayerLobby";

import "../../styles/components/GameLobby/Gamelobbypage.css";

type LobbyState = "select" | "multiplayer";

export default function GameLobbyPage({ games }: { games: Game[] }) {
  const { id } = useParams();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [lobbyState, setLobbyState] = useState<LobbyState>("select");
  const roomService = useRoomService();

  const gameSelected = id ? games[Number(id)] : null;
  const initialRoomId = searchParams.get("room") ?? undefined;

  if (!gameSelected) return <h2>Game not found</h2>;

  const handleBack = () => {
    if (lobbyState === "multiplayer") {
      roomService.close();
      setLobbyState("select");
    } else {
      navigate(-1);
    }
  };

  return (
    <div className="lobby-screen">
      <div className="lobby-scanlines" aria-hidden="true" />
      <div className="lobby-inner">
        <header className="lobby-header">
          <h1 className="lobby-game-title">{gameSelected.title}</h1>
          <p className="lobby-subtitle">
            {lobbyState === "select" ? "SELECT MODE" : "WAITING ROOM"}
          </p>
        </header>

        {lobbyState === "select" && (
          <ModeSelector
            onSolo={() => navigate(`/game/${id}`)}
            onMultiplayer={() => setLobbyState("multiplayer")}
          />
        )}

        {lobbyState === "multiplayer" && (
          <MultiplayerLobby initialRoomId={initialRoomId} />
        )}

        <footer className="lobby-footer">
          <button className="lobby-back-btn" onClick={handleBack}>
            ◀ RETOUR
          </button>
        </footer>
      </div>
    </div>
  );
}
