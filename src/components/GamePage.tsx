import { useParams } from "react-router-dom";
import GameContainer from "./GameContainer";
import Chatter from "./Chat/Chatter";
import type { Game } from "../types/types";

import "../styles/components/GamePage.css";
import Button from "./commons/Button";
import { MessageCircle, X } from "lucide-react";
import { useState } from "react";
import { createPortal } from "react-dom";

export default function GamePage({ games }: { games: Game[] }) {
  const [showChat, setShowChat] = useState<boolean>(false);
  const { id } = useParams();

  const gameSelected = id ? games[Number(id)] : null;

  if (!gameSelected) {
    return <h2>Game not found</h2>;
  }

  return (
    <div className="game-container">
      <div className="game-container-left">
        <GameContainer game={gameSelected} />
      </div>
      <div className="game-container-right">
        <Chatter />
      </div>
      {window.innerWidth < 700 && (
        <button
          onClick={() => setShowChat((prev) => !prev)}
          className="chat-button"
        >
          {!showChat ? <MessageCircle /> : <X />}
        </button>
      )}

      {showChat &&
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
