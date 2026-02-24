import React from "react";
import "../styles/layout/Sidebar.css";
import { X, User } from "lucide-react";

export default function Sidebar() {
  const games = ["Jeu1", "Jeu2", "Jeu3"];
  return (
    <div className="sidebar">
      <div className="top">
        <button>
          <X color="#F8D820" />
        </button>
        <nav>
          <ul>
            {games.map((game, i) => (
              <li key={i}>{game}</li>
            ))}
          </ul>
        </nav>
      </div>
      <div className="user">
        <div className="user-icon">
          <User color="#5e606a" />
        </div>
        <p>Esteves Helder</p>
      </div>
    </div>
  );
}
