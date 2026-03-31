import "../../styles/components/Puzzle/EndingScreen.css";
import {useEffect} from "react";

const handlePlayAgain = () => {
  window.location.reload();
}

export default function EndingScreen(props: {
  message: string;
  nbPieces: number;
  score: number;
  difficulty: { cols: number; rows: number };
}) {

  const accuracy = props.nbPieces > 0 ? Math.round((props.score / props.nbPieces) * 100): 0;
  const difficulty = props.difficulty.cols === 16 ? "easy" : props.difficulty.cols === 32 ? "normal" : "hard";


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
        mode: 'solo',
        difficulty,
        points: props.score
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
    <div className="end-screen">
      <div className="ending-panel">
        <div className="end-title">GAME SUMMARY</div>

        {/* HEADER */}
        <div className="ending-header">
          <h2>{props.message}</h2>
          <p>
            {props.difficulty.cols} × {props.difficulty.rows} puzzle completed
          </p>
        </div>

        {/* SCORE CENTRAL */}
        <div className="ending-score">
          <span>FINAL SCORE</span>
          <strong>{props.score}</strong>
        </div>

        {/* STATS */}
        <div className="ending-stats">
          <div className="stat-item">
            <span>Total Pieces</span>
            <strong>{props.nbPieces}</strong>
          </div>

          <div className="stat-item">
            <span>Accuracy</span>
            <strong>{accuracy}%</strong>
          </div>
        </div>

        {/* ACTIONS */}
        <div className="ending-actions">
          <button className="ending-btn primary" onClick={handlePlayAgain}>Play Again</button>
        </div>
      </div>

      {/* GUEST WARNING */}
      {JSON.parse(localStorage.getItem("SQLid") ?? "null") === null && (
        <div className="guest-warning">
          Guest account ! Your points will expire within 7 days. Connect at <a href="https://adam.nachnouchi.com/">Bricksy</a> to keep them !
        </div>
      )}
    </div>

    
  );
}
