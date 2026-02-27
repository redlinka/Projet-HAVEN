import "../../styles/components/Puzzle/DifficultySelect.css";

export default function DifficultySelect({
  setMod,
}: {
  setMod: (mod: { width: number; height: number }) => void;
}) {
  return (
    <div className="difficulty-screen">
      <div className="difficulty-panel">
        <div className="difficulty-title">SELECT A DIFFICULTY</div>

        <div className="difficulty-container">
          <div
            className="difficulty-card easy"
            onClick={() => setMod({ width: 16, height: 16 })}
          >
            <div className="lego-circle">
              <img src="/img/legohead/easy.svg" alt="easy" />
            </div>
            <h2>EASY</h2>
            <p>16×16 puzzle</p>
            <p>~5 min</p>
            <span>Gain 10% points</span>
          </div>

          <div
            className="difficulty-card medium"
            onClick={() => setMod({ width: 32, height: 32 })}
          >
            <div className="lego-circle">
              <img src="/img/legohead/medium.svg" alt="medium" />
            </div>
            <h2>MEDIUM</h2>
            <p>32×32 puzzle</p>
            <p>~10 min</p>
            <span>Gain 25% points</span>
          </div>

          <div
            className="difficulty-card hard"
            onClick={() => setMod({ width: 64, height: 64 })}
          >
            <div className="lego-circle">
              <img src="/img/legohead/hard.svg" alt="hard" />
            </div>
            <h2>HARD</h2>
            <p>64×64 puzzle</p>
            <p>15+ min</p>
            <span>Gain 50% points</span>
          </div>
        </div>
      </div>
    </div>
  );
}
