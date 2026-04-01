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
    <div className="lobby-modes">
      <button className="lobby-card lobby-card--solo" onClick={onSolo}>
        <span className="lobby-card-icon">▶</span>
        <span className="lobby-card-name">SOLO</span>
        <span className="lobby-card-desc">Jouer seul</span>
        <span className="lobby-card-stars">★☆☆</span>
      </button>

      <button className="lobby-card lobby-card--create" onClick={onMultiplayer}>
        <span className="lobby-card-icon">MJ</span>
        <span className="lobby-card-name">MULTIJOUEUR</span>
        <span className="lobby-card-desc">Nouvelle partie</span>
        <span className="lobby-card-stars">★★☆</span>
      </button>
    </div>
  );
}
