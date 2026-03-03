import "../../styles/components/Puzzle/DifficultySelect.css";

export default function DifficultySelect({
  setMod,
}: {
  setMod: (mod: { cols: number; rows: number }) => void;
}) {
  return (
    <div className="difficulty-screen">
      <div className="difficulty-panel">
        <div className="difficulty-title">SELECT A DIFFICULTY</div>

        <div className="difficulty-container">
          <div
            className="difficulty-card easy"
            onClick={() => setMod({ cols: 16, rows: 16 })}
          >
            <div className="lego-circle">
              <img src="/img/legohead/easy.svg" alt="easy" />
            </div>
            <div>
              <h2>EASY</h2>
              <div>
                <p>16×16 puzzle</p>
                <span>Gain 10% points</span>
              </div>
            </div>
          </div>

          <div
            className="difficulty-card medium"
            onClick={() => setMod({ cols: 32, rows: 32 })}
          >
            <div className="lego-circle">
              <img src="/img/legohead/medium.svg" alt="medium" />
            </div>
            <div>
              <h2>MEDIUM</h2>
              <div>
                <p>32×32 puzzle</p>
                <span>Gain 25% points</span>
              </div>
            </div>
          </div>

          <div
            className="difficulty-card hard"
            onClick={() => setMod({ cols: 64, rows: 64 })}
          >
            <div className="lego-circle">
              <img src="/img/legohead/hard.svg" alt="hard" />
            </div>
            <div>
              <h2>HARD</h2>
              <div>
                <p>64×64 puzzle</p>
                <span>Gain 50% points</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
