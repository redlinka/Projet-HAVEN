import "../../styles/components/Puzzle/Puzzle.css";
import legoGame from "/img/legogame.png";

function PuzzleBoard() {
  return (
    <div className="puzzle-board">
      <div className="puzzle-area">
        <img src={legoGame} alt="Puzzle" />
      </div>

      <div className="infos-area">
        <div className="piece-random"></div>

        <div className="infos-game">
          <p>Score: 0</p>
          <p>Pièces manquantes : 64</p>
        </div>
      </div>
    </div>
  );
}

export default PuzzleBoard;
