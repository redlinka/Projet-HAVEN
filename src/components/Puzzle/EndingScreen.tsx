import "../../styles/components/Puzzle/EndingScreen.css";
import PuzzleGame from "./PuzzleGame";


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

  return (
    <div className="difficulty-screen">
      <div className="difficulty-panel ending-panel">

        <div className="difficulty-title">GAME SUMMARY</div>

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
            <span>Well Placed</span>
            <strong>{props.score}</strong>
          </div>

          <div className="stat-item">
            <span>Misplaced</span>
            <strong>{props.nbPieces - props.score > 0 ? props.nbPieces - props.score : 0}</strong>
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
    </div>
  );
}