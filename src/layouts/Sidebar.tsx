import React, { useState, type ReactNode } from "react";
import "../styles/layout/Sidebar.css";
import { X, User } from "lucide-react";

export default function Sidebar({
  games,
  handleOnClick,
}: {
  games: {
    game: ReactNode;
    description: string;
    title: string;
    icon: ReactNode;
  }[];
  handleOnClick: (i: number) => void;
}) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div
      className="sidebar"
      style={isOpen ? { maxWidth: "200px" } : { maxWidth: "75px" }}
      onMouseEnter={() => setIsOpen(true)}
      onMouseLeave={() => setIsOpen(false)}
    >
      <div className="top">
        <div
          className="menu-button"
          style={
            isOpen ? { justifyContent: "end" } : { justifyContent: "center" }
          }
        >
          <button onClick={() => setIsOpen((prev) => !prev)}>
            {isOpen ? (
              <X color="#F8D820" />
            ) : (
              <div className="square-menu">
                <div className="squares">
                  <div></div>
                  <div></div>
                  <div></div>
                  <div></div>
                </div>
              </div>
            )}
          </button>
        </div>

        <nav>
          <ul>
            {games.map((game, i) => (
              <li key={i} onClick={() => handleOnClick(i)}>
                <div style={isOpen ? { margin: "0" } : { margin: "0 auto" }}>
                  {game.icon}
                  {isOpen && <p>{game.title}</p>}
                </div>
              </li>
            ))}
          </ul>
        </nav>
      </div>
      <div className="user">
        <div className="user-icon">
          <User color="#5e606a" />
        </div>
        {isOpen && <p>Esteves Helder</p>}
      </div>
    </div>
  );
}
