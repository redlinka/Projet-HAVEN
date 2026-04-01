import { useEffect } from "react";

interface Props {
  score: number;
  nbPieces: number;
  mod: { cols: number; rows: number };
  difficulty: string;
  onModeMenu: () => void;
}

export default function EndGameScreen({ score, nbPieces, mod, difficulty, onModeMenu }: Props) {
  const perfect = score === nbPieces;
  const diff = mod.cols === 8 ? 'easy' : mod.cols === 16 ? 'medium' : 'hard';
  console.log(diff);

  useEffect(() => {
    const token = localStorage.getItem("sessionToken");
    const SQLid = localStorage.getItem("SQLid");

    fetch('/api-node/endgame', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        token,
        SQLid: SQLid ? JSON.parse(SQLid) : null,
        game: 'PUZZLE',
        mode: 'SOLO',
        difficulty: diff,
        points: score
      })
    })
    .then(r => r.json())
    .then(player => {
      if (player?.sessionToken) {
        localStorage.setItem("sessionToken", player.sessionToken);
      }
    });
  }, []);

  return (
    <div className="ending-overlay">
      <div className={perfect ? "ending-title-win" : "ending-title-lose"}>
        {perfect ? "PERFECT!" : "GAME CLEAR"}
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        <div className="ending-score">
          SCORE {String(score).padStart(4, "0")} / {nbPieces}
        </div>
        {perfect && <div className="ending-hi">★ NEW RECORD ★</div>}
      </div>
      <div style={{ fontSize: 6, color: "#4a3060" }}>
        {mod.cols}×{mod.rows} — {nbPieces} PIECES
      </div>
      <button className="retry-btn" onClick={onModeMenu}>
        MODE MENU
      </button>
    </div>
  );
}