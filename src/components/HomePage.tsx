import { type ReactNode } from "react";
import { Link } from "react-router-dom";
import "../styles/components/HomePage.css";

export default function HomePage({
  games,
}: {
  games: {
    game: ReactNode;
    description: string;
    title: string;
    icon: ReactNode;
    img: string;
  }[];
}) {
  return (
    <div className="home-container">
      <Link to={`/game/${games.length - 1}`} className="new-game">
        <img src={games[games.length - 1].img} alt="" />
        <div className="new">New</div>
      </Link>
      <div className="games-list">
        <h2>Games</h2>
        <div className="games">
          {games.map((game, index) => (
            <Link key={game.title} to={`/game/${index}`}>
              <img className="game" src={game.img} alt="Game image" />
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
