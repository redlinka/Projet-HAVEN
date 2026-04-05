import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { ChevronUp } from "lucide-react";
import "../styles/layout/Navbar.css";

import type { Game } from "../types/types";
import { useUser } from "../contexts/UserContext";
import { useRoom } from "../contexts/RoomContext";

export default function Navbar({ games }: { games: Game[] }) {
  const { user } = useUser();
  const [isOpen, setIsOpen] = useState(false);
  const [totalPoints, setTotalPoints] = useState(0);
  const navbarRef = useRef<HTMLDivElement>(null);
  const { handleDisconnect, connectedUsers } = useRoom();
  const isMultiplayer = connectedUsers.length >= 1;

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

  // Use effect to calculate user points (valide uniquement)
  useEffect(() => {
    if (user && user.games && Array.isArray(user.games)) {
      const now = new Date();
      const sum = user.games
        .filter((g: any) => !g.used && new Date(g.expiresAt) > now)
        .reduce((acc: number, g: any) => acc + (g.points || 0), 0);
      setTotalPoints(sum);
    } else {
      setTotalPoints(0);
    }
  }, [user]);

  return (
    <div className="navbar" ref={navbarRef}>
      <Link
        to="/"
        className="main-title"
        onClick={() => {
          if (isMultiplayer) {
            handleDisconnect();
          }
        }}
      >
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
                onClick={() => {
                  setIsOpen(false);
                  if (isMultiplayer) {
                    handleDisconnect();
                  }
                }}
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
        <a
          href="https://adam.nachnouchi.com"
          target="_blank"
          rel="noopener noreferrer"
          className="storefront-link"
        >
          <img src={`${import.meta.env.BASE_URL}img/storefront.png`} alt="Storefront" />
        </a>
        <Link to={`/history`} className="history-link">
          <p>{totalPoints} Points</p>
        </Link>
      </div>
    </div>
  );
}
