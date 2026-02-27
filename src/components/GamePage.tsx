import React, { type ReactNode } from "react";
import "../styles/components/GamePage.css";
import GameContainer from "./GameContainer";
import Chatter from "./Chat/Chatter";

export default function GamePage({
  gameSelected,
}: {
  gameSelected: { game: ReactNode; description: string; title: string };
}) {
  return (
    <div className="game-container">
      <div className="game-container-left">
        <GameContainer game={gameSelected} />
      </div>
      <div className="game-container-right">
        <Chatter />
      </div>
    </div>
  );
}
