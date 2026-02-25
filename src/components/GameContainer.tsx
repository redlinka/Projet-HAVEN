import { type ReactNode } from "react";
import "../styles/components/GameContainer.css";

export default function GameContainer({
  game,
}: {
  game: { game: ReactNode; description: string; title: string };
}) {
  return (
    <div className="game-container-main">
      <div className="top">
        <h1>{game.title}</h1>
      </div>
      <div className="game-view">{game.game}</div>
    </div>
  );
}
