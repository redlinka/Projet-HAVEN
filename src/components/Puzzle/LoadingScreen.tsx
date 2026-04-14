import "../../styles/components/Puzzle/LoadingScreen.css";

export default function LoadingScreen() {
  return (
    <div className="loading-screen">
      <div className="loading-title">LOADING…</div>
      <div className="loading-dots">
        <div className="loading-dot" />
        <div className="loading-dot" />
        <div className="loading-dot" />
      </div>
      <div
        style={{
          fontSize: 6,
          color: "#3a2d5c",
          letterSpacing: 2,
          marginTop: 8,
        }}
      >
        PREPARING PUZZLE
      </div>
    </div>
  );
}
