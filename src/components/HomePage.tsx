import type { Game } from "../types/types";
import { Link } from "react-router-dom";

import "../styles/components/HomePage.css";
import { ArrowBigDown } from "lucide-react";
import { useRoom } from "../contexts/RoomContext";

export default function HomePage({ games }: { games: Game[] }) {
  return (
    <div className="home-container">
      <div className="title">
        <h1>
          Haven
          <br /> Games
        </h1>
        <p>Play to earn points</p>
        <div className="scroll-down">
          <ArrowBigDown fill="white" className="arrow" />
        </div>
      </div>
      <div className="games">
        <h1>Our Games</h1>
        <GameList games={games} />
      </div>
    </div>
  );
}

const GAME_TAGLINES: Record<string, string> = {
  default: "Step up and play!",
  puzzlegame: "Piece it together, brick by brick!",
  brickblast: "The ultimate 3D block-busting challenge!",
};

function getTagline(title: string): string {
  const key = title.toLowerCase().replace(/\s+/g, "");
  return GAME_TAGLINES[key] ?? GAME_TAGLINES.default;
}

const GameList = ({ games }: { games: Game[] }) => {
  return (
    <ul className="game-list">
      {games.map((game, index) => (
        <Link key={index} to={`/game/${index}/lobby`} className="game-card">
          <div className="game-card__image-wrap">
            <img src={game.img} alt={game.title} className="game-card__img" />
            <div className="game-card__img-overlay" />
          </div>
          <div className="game-card__body">
            <span className="game-card__index">{getTagline(game.title)}</span>
            <p className="game-card__title">{game.title}</p>
            <p className="game-card__desc">{game.description}</p>
            <span className="game-card__cta">Jouer →</span>
          </div>
          <div className="game-card__glow" />
        </Link>
      ))}
    </ul>
  );
};
