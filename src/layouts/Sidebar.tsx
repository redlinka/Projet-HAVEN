import { useState, type ReactNode } from "react";
import { Link } from "react-router-dom";
import { X, User } from "lucide-react";
import "../styles/layout/Sidebar.css";

export default function Sidebar({
  games,
}: {
  games: {
    game: ReactNode;
    description: string;
    title: string;
    icon: ReactNode;
  }[];
}) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div
      className="sidebar"
      style={isOpen ? { maxWidth: "200px" } : { maxWidth: "75px" }}
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
            {games.map((game, index) => (
              <Link to={`/game/${index}`} className="link-li">
                <div style={isOpen ? { margin: "0" } : { margin: "0 auto" }}>
                  {game.icon}
                  {isOpen && <p>{game.title}</p>}
                </div>
              </Link>
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
