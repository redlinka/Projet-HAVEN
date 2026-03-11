import { useParams } from "react-router-dom";
import GameContainer from "./GameContainer";
import Chatter from "./Chat/Chatter";
import type { Game } from "../types/types";

import "../styles/components/GamePage.css";

export default function GamePage({ games }: { games: Game[] }) {
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
    </div>
  );
}
