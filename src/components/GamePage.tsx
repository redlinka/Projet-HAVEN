import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { createPortal } from "react-dom";
import { MessageCircle, X } from "lucide-react";
import { useRoomService } from "../contexts/RoomServiceContext";
import { useRoom } from "../contexts/RoomContext";
import type { Game } from "../types/types";
import GameContainer from "./GameContainer";
import Chatter from "./Chat/Chatter";
import OpponentScreen from "./OpponentScreen";

import "../styles/components/GamePage.css";

export default function GamePage({ games }: { games: Game[] }) {
  const [showChat, setShowChat] = useState<boolean>(false);
  const { id } = useParams();
  const { isCanvasReady } = useRoom();
  const chatManager = useRoomService();
  const isMultiplayer = chatManager.isInRoom;
  const gameSelected = id ? games[Number(id)] : null;

  if (!gameSelected) {
    return <h2>Game not found</h2>;
  }

  useEffect(() => {
    console.log(
      "1) [GamePage] isMultiplayer:",
      isMultiplayer,
      "isCanvasReady:",
      isCanvasReady,
    );
  }, [isCanvasReady]);

  return (
    <div className="game-container">
      {/* OpponentScreen*/}
      {isMultiplayer && isCanvasReady && <OpponentScreen />}

      {/* Game */}
      <div
        className={`game-container-left ${!isMultiplayer ? "game-container-left--fullwidth" : ""}`}
      >
        <GameContainer game={gameSelected} />
      </div>

      {/* Lateral chat */}
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
