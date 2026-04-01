import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { User, ChevronUp } from "lucide-react";
import "../styles/layout/Navbar.css";

import type { Game } from "../types/types";

export default function Navbar({ games }: { games: Game[] }) {
  const [isOpen, setIsOpen] = useState(false);
  const navbarRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleNavBar = () => {
      const navbar: HTMLDivElement | null = navbarRef.current;
      if (!navbar) return;

      if (window.scrollY !== 0) {
        navbar.style.background =
          "linear-gradient(0deg,rgba(255, 255, 255, 0) 0%, rgba(0, 0, 0, 1) 100%)";
      } else {
        navbar.style.backgroundColor = "transparent";
      }
    };

    window.addEventListener("scroll", handleNavBar);

    return () => {
      window.removeEventListener("scroll", handleNavBar);
    };
  }, []);

  return (
    <div className="navbar" ref={navbarRef}>
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
                to={`/game/${index}/lobby`}
                className="option"
                onClick={() => setIsOpen(false)}
                key={index}
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
