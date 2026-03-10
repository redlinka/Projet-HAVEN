import { useState, type ReactNode } from "react";
import { Link } from "react-router-dom";
import { User, ChevronUp } from "lucide-react";
import "../styles/layout/Navbar.css";

export default function Navbar({
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
    <div className="navbar">
      <Link to="/" className="main-title">
        Haven <span>Games</span>
      </Link>

      <nav>
        <div className="drop-down">
          <button onClick={() => setIsOpen((prev) => !prev)}>
            Games <ChevronUp className={isOpen ? "chevron-open" : ""} />
          </button>
          {/* Games options */}
          <div
            className="options"
            style={{ display: isOpen ? "flex" : "none" }}
          >
            {games.map((game, index) => (
              <Link
                to={`/game/${index}`}
                className="option"
                onClick={() => setIsOpen(false)}
              >
                {game.icon}
                <p>{game.title}</p>
              </Link>
            ))}
          </div>
        </div>
      </nav>

      <div className="user">
        <p>Guest</p>
        <div className="user-icon">
          <User />
        </div>
      </div>
    </div>
  );
}
