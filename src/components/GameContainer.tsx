import "../styles/components/GameContainer.css";
import type { Game } from "../types/types";

export default function GameContainer({ game }: { game: Game }) {
  return (
    <div className="game-container-main">
      <div className="game-view">{game.game}</div>
    </div>
  );
}
