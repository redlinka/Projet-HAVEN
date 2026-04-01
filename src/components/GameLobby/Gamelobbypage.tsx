import { useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";

import type { Game } from "../../types/types";
import { useRoomService } from "../../contexts/RoomServiceContext";
import BackgroundStars from "../BackgroundStars";

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
    <BackgroundStars>
      <div className="glp-screen">
        <div className="glp-inner">
          <button className="glp-back-btn" onClick={handleBack}>
            &lt; Back
          </button>

          <header className="glp-header">
            <span className="glp-eyebrow">
              {lobbyState === "select" ? "Choose a mode" : "Waiting Room"}
            </span>
            <h1 className="glp-title">{gameSelected.title}</h1>
            <div className="glp-title-line" aria-hidden="true" />
          </header>

          <main className="glp-content">
            {lobbyState === "select" && (
              <ModeSelector
                onSolo={() => navigate(`/game/${id}`)}
                onMultiplayer={() => setLobbyState("multiplayer")}
              />
            )}

            {lobbyState === "multiplayer" && (
              <MultiplayerLobby initialRoomId={initialRoomId} />
            )}
          </main>
        </div>
      </div>
    </BackgroundStars>
  );
}
