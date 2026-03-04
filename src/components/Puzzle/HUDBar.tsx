import "../../styles/components/Puzzle/HUDBar.css";

type Props = {
  score: number;
  placed: number;
  total: number;
  remaining: number;
};

export default function HUDBar({ score, placed, total, remaining }: Props) {
  const progress = total > 0 ? Math.round((placed / total) * 100) : 0;

  return (
    <div className="hud-bar">
      <div className="hud-section">
        <div className="hud-label">SCORE</div>
        <div className="hud-value glow-orange">
          {String(score).padStart(4, "0")}
        </div>
      </div>

      <div className="hud-section wide">
        <div className="hud-label">
          PROGRESS {placed}/{total}
        </div>

        <div className="hud-progress">
          <div
            className="hud-progress-fill"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      <div className="hud-section">
        <div className="hud-label">LEFT</div>
        <div className="hud-value">{remaining}</div>
      </div>
    </div>
  );
}
