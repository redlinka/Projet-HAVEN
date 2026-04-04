import { useEffect } from "react";
import { useUser } from "../../contexts/UserContext";

interface Props {
  score: number;
  nbPieces: number;
  mod: { cols: number; rows: number };
  onModeMenu: () => void;
}

export default function EndGameScreen({ score, nbPieces, mod, onModeMenu }: Props) {
  const perfect = score === nbPieces;
  const diff = mod.cols === 16 ? 'easy' : mod.cols === 32 ? 'medium' : 'hard';
  const { user, setUser } = useUser();

  useEffect(() => {
    const token = localStorage.getItem("sessionToken");

    fetch('/api-node/endgame', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token: token,
          SQLid: user?.SQL_id ?? -1,
          game: 'PUZZLE',
          mode: 'SOLO',
          difficulty: diff,
          points: score
        })
      })
        
      .then(r => r.json())
      .then(player => {
        if (!player) return;

        localStorage.setItem("sessionToken", player.sessionToken ?? token);
        localStorage.setItem("user", JSON.stringify(player));

        //we render the user context to make sure points are updated in the navbar
        setUser({
          id: player.id ?? user?.id ?? -1,
          SQL_id: player.SQL_id ?? user?.SQL_id ?? -1,
          sessionToken: player.sessionToken ?? token,
          games: player.games ?? []
        });
      })
      .catch(err => console.error("Error saving score:", err));
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
        {mod.cols}×{mod.rows} - {nbPieces} PIECES
      </div>
      <button className="retry-btn" onClick={onModeMenu}>
        MODE MENU
      </button>
    </div>
  );
}
