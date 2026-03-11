import type { Game } from "../types/types";
import { Link } from "react-router-dom";

import "../styles/components/HomePage.css";
import { ArrowBigDown } from "lucide-react";

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

const GameList = ({ games }: { games: Game[] }) => {
  return (
    <ul className="game-list">
      {games.map((game, index) => (
        <Link key={index} to={`/game/${index}`} className="list-link">
          <img src={game.img} alt="" />

          <div className="info">
            <p>{game.title}</p>
            <p>{game.description}</p>
          </div>
        </Link>
      ))}
    </ul>
  );
};
