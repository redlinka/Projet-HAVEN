import { useState, useEffect } from "react";
import "../../styles/components/Puzzle/DifficultySelect.css";
import { useRoom } from "../../contexts/RoomContext";

const DIFFICULTIES = [
  { label: "EASY", cols: 16, rows: 16, stars: 1 },
  { label: "MEDIUM", cols: 32, rows: 32, stars: 2 },
  { label: "HARD", cols: 64, rows: 64, stars: 3 },
];

export default function DifficultySelect({
  setMod,
}: {
  setMod: (mod: { cols: number; rows: number }) => void;
}) {
  const [selected, setSelected] = useState(1);
  const [blink, setBlink] = useState(true);
  const [confirmed, setConfirmed] = useState(false);

  const { isAdmin, connectedUsers, handleSelectDifficulty } = useRoom();

  useEffect(() => {
    const t = setInterval(() => setBlink((b) => !b), 500);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    const handle = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft") setSelected((s) => Math.max(0, s - 1));
      if (e.key === "ArrowRight") setSelected((s) => Math.min(2, s + 1));
      if (e.key === "Enter" || e.key === " ") handleConfirm();
    };
    window.addEventListener("keydown", handle);
    return () => window.removeEventListener("keydown", handle);
  }, [selected]);

  const handleConfirm = () => {
    setConfirmed(true);
    setTimeout(() => {
      const mod = {
        cols: DIFFICULTIES[selected].cols,
        rows: DIFFICULTIES[selected].rows,
      };
      setMod(mod);
      if (connectedUsers?.length > 1 && isAdmin) {
        handleSelectDifficulty(mod);
        console.log("Difficulté envoyé à la room");
      }
    }, 400);
  };

  return (
    <div className="difficulty-crt">
      <div className="difficulty-overlay" />

      <div className="difficulty-content">
        <div className="difficulty-title">
          PUZZLE
          <span>BRICKS</span>
        </div>

        <div className={`difficulty-sub ${blink ? "blink" : ""}`}>
          SELECT DIFFICULTY
        </div>

        <div className="difficulty-container">
          {DIFFICULTIES.map((d, i) => (
            <div
              key={i}
              className={`difficulty-card ${
                selected === i ? "active" : ""
              } ${d.label.toLowerCase()}`}
              onClick={() => setSelected(i)}
            >
              <div className="difficulty-label">{d.label}</div>

              <div className="difficulty-stars">
                {Array.from({ length: 3 }).map((_, s) => (
                  <span key={s} className={s < d.stars ? "on" : ""}>
                    ★
                  </span>
                ))}
              </div>

              <p>
                {d.cols}×{d.rows}
              </p>
            </div>
          ))}
        </div>

        <button className="difficulty-play" onClick={handleConfirm}>
          PLAY
        </button>

        <div className="difficulty-hint">← → SELECT · ENTER CONFIRM</div>
      </div>
    </div>
  );
}
