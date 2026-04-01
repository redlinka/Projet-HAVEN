import "../../styles/components/GameLobby/ModeSelector.css";

interface ModeSelectorProps {
  onSolo: () => void;
  onMultiplayer: () => void;
}

export default function ModeSelector({
  onSolo,
  onMultiplayer,
}: ModeSelectorProps) {
  return (
    <div className="mode-selector">
      <button className="mode-card mode-card--solo" onClick={onSolo}>
        <div className="mode-card-glow" />
        <div className="mode-card-content">
          <div className="mode-card-icon">
            <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
              <circle
                cx="16"
                cy="16"
                r="14"
                stroke="currentColor"
                strokeWidth="1.5"
              />
              <polygon points="13,10 24,16 13,22" fill="currentColor" />
            </svg>
          </div>
          <span className="mode-card-title">Solo</span>
          <span className="mode-card-desc">Play alone & earn points</span>
          <span className="mode-card-cta">Play →</span>
        </div>
      </button>

      <button className="mode-card mode-card--multi" onClick={onMultiplayer}>
        <div className="mode-card-glow" />
        <div className="mode-card-content">
          <div className="mode-card-icon">
            <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
              <circle
                cx="11"
                cy="12"
                r="4"
                stroke="currentColor"
                strokeWidth="1.5"
              />
              <circle
                cx="21"
                cy="12"
                r="4"
                stroke="currentColor"
                strokeWidth="1.5"
              />
              <path
                d="M4 26c0-4 3.1-7 7-7h10c3.9 0 7 3 7 7"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
              />
            </svg>
          </div>
          <span className="mode-card-title">Multijoueur</span>
          <span className="mode-card-desc">Challenge an opponent</span>
          <span className="mode-card-cta">Play →</span>
        </div>
      </button>
    </div>
  );
}
