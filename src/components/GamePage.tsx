import { useState } from "react";
import { useParams, useLocation } from "react-router-dom";
import { createPortal } from "react-dom";
import { MessageCircle, X } from "lucide-react";

import GameContainer from "./GameContainer";
import Chatter from "./Chat/Chatter";
import type { Game } from "../types/types";
import type { ChatManager } from "../services/ChatManager";

import "../styles/components/GamePage.css";

interface LocationState {
  chatManager?: ChatManager;
  multiplayer?: boolean;
}

export default function GamePage({ games }: { games: Game[] }) {
  const [showChat, setShowChat] = useState<boolean>(false);
  const { id } = useParams();
  const location = useLocation();

  // Récupère le chatManager transmis par GameLobbyPage (mode multijoueur)
  const state = (location.state ?? {}) as LocationState;
  const chatManager = state.chatManager ?? null;
  const isMultiplayer = state.multiplayer === true && chatManager !== null;

  const gameSelected = id ? games[Number(id)] : null;

  if (!gameSelected) {
    return <h2>Game not found</h2>;
  }

  return (
    <div className="game-container">
      {/* Jeu */}
      <div className={`game-container-left ${!isMultiplayer ? "game-container-left--fullwidth" : ""}`}>
        <GameContainer game={gameSelected} />
      </div>

      {/* Chat latéral — uniquement en mode multijoueur sur grand écran */}
      {isMultiplayer && window.innerWidth >= 700 && (
        <div className="game-container-right">
          <Chatter chatManager={chatManager!} />
        </div>
      )}

      {/* Bouton flottant — mobile uniquement, mode multijoueur */}
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
              <Chatter chatManager={chatManager!} />
            </div>
          </div>,
          document.body
        )}
    </div>
  );
}