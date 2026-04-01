import { useCallback, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { createPortal } from "react-dom";
import { MessageCircle, X } from "lucide-react";
import { useRoomService } from "../contexts/RoomServiceContext";
import type { Game } from "../types/types";
import GameContainer from "./GameContainer";
import Chatter from "./Chat/Chatter";

import "../styles/components/GamePage.css";

export default function GamePage({ games }: { games: Game[] }) {
  const [showChat, setShowChat] = useState<boolean>(false);
  const { id } = useParams();
  const navigate = useNavigate();
  const chatManager = useRoomService();
  const isMultiplayer = chatManager.isInRoom;

  const handleRoomClosed = useCallback(() => {
    navigate(`/game/${id}/lobby/`);
  }, [navigate, id]);

  const gameSelected = id ? games[Number(id)] : null;

  if (!gameSelected) {
    return <h2>Game not found</h2>;
  }

  return (
    <div className="game-container">
      {/* Jeu */}
      <div
        className={`game-container-left ${!isMultiplayer ? "game-container-left--fullwidth" : ""}`}
      >
        <GameContainer game={gameSelected} />
      </div>

      {/* Chat latéral - uniquement en mode multijoueur sur grand écran */}
      {isMultiplayer && window.innerWidth >= 700 && (
        <div className="game-container-right">
          <Chatter />
        </div>
      )}

      {/* Bouton flottant - mobile uniquement, mode multijoueur */}
      {isMultiplayer && window.innerWidth < 700 && (
        <button
          onClick={() => setShowChat((prev) => !prev)}
          className="chat-button"
        >
          {showChat ? <X /> : <MessageCircle />}
        </button>
      )}

      {/* Popup chat mobile */}
      {isMultiplayer &&
        window.innerWidth < 700 &&
        showChat &&
        createPortal(
          <div className="bg-filter">
            <div className="chat-popup">
              <Chatter />
            </div>
          </div>,
          document.body,
        )}
    </div>
  );
}
