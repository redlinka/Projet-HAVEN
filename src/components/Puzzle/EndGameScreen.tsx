import { useEffect } from "react";
import { useUser } from "../../contexts/UserContext";
import "../../styles/components/Puzzle/EndGameScreen.css";

interface Props {
  score: number;
  difficulty: { cols: number; rows: number };
  mode: string;
  onModeMenu: () => void;
}

export default function EndGameScreen({ score, difficulty, mode, onModeMenu }: Props) {
  const perfect = score === difficulty.cols * difficulty.rows;
  const reason = localStorage.getItem("reason");
  console.log("la raison est " +reason);
  const diff = difficulty.cols === 16 ? 'easy' : difficulty.cols === 32 ? 'medium' : 'hard';
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
    <div className="ending-panel">
      <div className="ending-panel-inner">

        <div className={"ending-header win"}>
          {perfect ? "PERFECT!" : "GAME CLEAR"}
        </div>

        <div className="ending-plate">
          <div className="ending-plate-inner">
            <div className="plate-content">

              <div className={perfect ? "plate-msg win" : "plate-msg lose"}>
                {reason}
              </div>

              <div className="plate-sep" />

              <div className="plate-row">
                <span className="plate-key">SCORE</span>
                <span className="plate-val big">{String(score).padStart(4, "0")}/ {String(difficulty.cols * difficulty.rows).padStart(4, "0")}</span>
              </div>
    
              <div className="plate-sep" />

              <div className="plate-row">
                <span className="plate-key">DIFF</span>
                <span className={`plate-diff plate-diff-${diff}`}>{diff.toUpperCase()}</span>
              </div>
              <div className="plate-row">
                <span className="plate-key">MODE</span>
                <span className="plate-val">{mode}</span>
              </div>

              <div className="plate-sep" />

              <div className="plate-hi">
                {perfect ? "★ PERFECT SCORE ★" : "★ BETTER LUCK NEXT TIME ★"}
              </div>

            </div>
          </div>
        </div>

        <div className="ending-footer">
          <button className="retry-btn" onClick={onModeMenu}>
            <span className="btn-cursor">▮</span>MAIN MENU
          </button>
        </div>

      </div>
    </div>
  </div>
);
}
