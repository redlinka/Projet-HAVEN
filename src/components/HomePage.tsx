import React, { type ReactNode } from "react";
import "../styles/components/HomePage.css";

export default function HomePage({
  games,
  handleOnClick,
}: {
  games: {
    game: ReactNode;
    description: string;
    title: string;
    icon: ReactNode;
    img: string;
  }[];
  handleOnClick: (i: number) => void;
}) {
  return (
    <div className="home-container">
      <div className="new-game" onClick={() => handleOnClick(games.length - 1)}>
        <img src={games[games.length - 1].img} alt="" />
        <div className="new">New</div>
      </div>
      <div className="games-list">
        <h2>Games</h2>
        <div className="games">
          {games.map((game, i) => (
            <img
              className="game"
              key={game.title}
              src={game.img}
              alt="Game image"
              onClick={() => handleOnClick(i)}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
