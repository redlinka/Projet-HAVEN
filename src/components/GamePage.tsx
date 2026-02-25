import React, { type ReactNode } from "react";
import "../styles/components/GamePage.css";
import GameContainer from "./GameContainer";
import Chat from "./Chat";

export default function GamePage({
  gameSelected,
}: {
  gameSelected: { game: ReactNode; description: string; title: string };
}) {
  return (
    <div className="game-page">
      <div className="top">
        Haven <span>Games</span>
      </div>

      <div className="game-container">
        <div className="game-container-left">
          <GameContainer game={gameSelected} />
        </div>
        <div className="game-container-right">
          <Chat />
        </div>
      </div>
    </div>
  );
}
