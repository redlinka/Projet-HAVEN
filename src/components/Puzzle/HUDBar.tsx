import { useState } from "react";
import { Disc, Disc3, Volume2, VolumeOff } from "lucide-react";
import "../../styles/components/Puzzle/HUDBar.css";

type Props = {
  score: number;
  placed: number;
  total: number;
  remaining: number;
  isPlayingEffect?: boolean;
  isPlayingMusic?: boolean;
  onToggleEffect?: () => void;
  onToggleMusic?: () => void;
  onRestart?: () => void;
};

export default function HUDBar({
  score,
  placed,
  total,
  remaining,
  isPlayingEffect,
  isPlayingMusic,
  onToggleEffect,
  onToggleMusic,
  onRestart,
}: Props) {
  const progress = total > 0 ? Math.round((placed / total) * 100) : 0;
  const [menuOpen, setMenuOpen] = useState(false);

  const hasMenu = onToggleEffect && onToggleMusic && onRestart;

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

      {hasMenu && (
        <div className="hud-menu-wrap">
          <button
            className="hud-menu-btn"
            onClick={() => setMenuOpen((p) => !p)}
          >
            ☰
          </button>
          {menuOpen && (
            <div className="hud-menu-dropdown">
              <button onClick={onToggleEffect}>
                {isPlayingEffect ? <Volume2 size={13} /> : <VolumeOff size={13} />}
                <span>{isPlayingEffect ? "SFX ON" : "SFX OFF"}</span>
              </button>
              <button onClick={onToggleMusic}>
                {isPlayingMusic ? <Disc3 size={13} /> : <Disc size={13} />}
                <span>{isPlayingMusic ? "MUSIC ON" : "MUSIC OFF"}</span>
              </button>
              <button
                onClick={() => {
                  onRestart();
                  setMenuOpen(false);
                }}
              >
                <span>RESTART</span>
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}