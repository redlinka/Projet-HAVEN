import { useEffect, useState } from "react";
import { Disc, Disc3, Volume2, VolumeOff, X } from "lucide-react";
import { createPortal } from "react-dom";

import Brick from "./Brick";
import HUDBar from "./HUDBar";
import PuzzleBoard from "./PuzzleBoard";
import MonitorShell from "./MonitorShell";
import EndGameScreen from "./EndGameScreen";
import LoadingScreen from "./LoadingScreen";
import DifficultySelect from "./DifficultySelect";

import { usePuzzle } from "./hooks/usePuzzle";
import { usePuzzleSound } from "./hooks/usePuzzleSounds";

import { useRoom } from "../../contexts/RoomContext";
import "../../styles/components/Puzzle/PuzzleGame.css";

export default function PuzzleGame() {
  const { difficulty, roomId } = useRoom();
  const [display, setDisplay] = useState(false);

  const {
    isPlayingMusic,
    isPlayingEffect,
    setIsPlayingEffect,
    toggleMusic,
    playOnDrag,
    playOnDrop,
    playWrongPlacement,
  } = usePuzzleSound();

  const {
    mod,
    setMod,
    loading,
    allBricks,
    currentBrick,
    board,
    score,
    nbPieces,
    imagePath,
    imageZoomed,
    setImageZoomed,
    endGame,
    handleModeMenu,
    activeBrick,
    dragPos,
    isOnBoard,
    handlePointerDown,
  } = usePuzzle({ playOnDrag, playOnDrop, playWrongPlacement });

  // Reset le display quand on change de mode ou qu'on charge
  useEffect(() => {
    if (!loading && mod.cols > 0) {
      const timer = setTimeout(() => setDisplay(true), 10);
      return () => clearTimeout(timer);
    } else {
      setDisplay(false);
    }
  }, [loading, mod.cols]);

  // Sync Multiplayer
  useEffect(() => {
    if (difficulty) {
      setMod(difficulty);
    }
  }, [difficulty, setMod]);

  const soundsButtons = () => (
    <div className="sounds-container">
      <button onClick={() => setIsPlayingEffect((prev: any) => !prev)}>
        {isPlayingEffect ? <Volume2 /> : <VolumeOff />}
      </button>
      <button onClick={toggleMusic}>
        {isPlayingMusic ? <Disc3 /> : <Disc />}
      </button>
    </div>
  );

  if (loading) {
    return (
      <MonitorShell>
        <LoadingScreen />
      </MonitorShell>
    );
  }

  if (endGame) {
    return (
      <MonitorShell>
        <EndGameScreen
          score={score}
          difficulty={mod}
          mode={sessionStorage.getItem("puzzle_save") ? "DUPLICATE" : "SOLO"}
          onModeMenu={handleModeMenu}
        />
      </MonitorShell>
    );
  }

  if (!mod.cols && !mod.rows) {
    return (
      <MonitorShell>
        <DifficultySelect setMod={setMod} />
      </MonitorShell>
    );
  }

  return (
    <MonitorShell>
      {display && soundsButtons()}

      {/* Image zoom portal */}
      {imageZoomed &&
        createPortal(
          <div className="div-portal" onClick={() => setImageZoomed(false)}>
            <button onClick={() => setImageZoomed(false)}>
              <X size={32} />
            </button>
            <img
              src={imagePath}
              alt="Puzzle reference"
              onClick={(e) => e.stopPropagation()}
            />
          </div>,
          document.body,
        )}

      <div
        className="puzzle-game-container"
        style={{ opacity: display ? 1 : 0, transition: "opacity 0.2s" }}
      >
        <HUDBar
          score={score}
          placed={nbPieces - allBricks.length}
          total={nbPieces}
          remaining={allBricks.length}
          isPlayingEffect={isPlayingEffect}
          isPlayingMusic={isPlayingMusic}
          onToggleEffect={() => setIsPlayingEffect((prev: any) => !prev)}
          onToggleMusic={toggleMusic}
          onRestart={handleModeMenu}
        />

        <div className="puzzle-game">
          <div className="board-wrap">
            <span className="board-label">▸ BOARD</span>
            <div className="board-container">
              <PuzzleBoard rows={mod.rows} cols={mod.cols} board={board} />
            </div>
          </div>

          <div className="side-panel">
            <div className="panel-card">
              <div className="panel-card-title">CURRENT PIECE</div>
              <div className="piece-random">
                {currentBrick ? (
                  <div style={{ opacity: activeBrick ? 0.3 : 1 }}>
                    <Brick
                      b={currentBrick}
                      boardSize={16}
                      onPointerDown={(e) => handlePointerDown(currentBrick, e)}
                    />
                  </div>
                ) : (
                  <div style={{ fontSize: 7, color: "#3a2d5c" }}>-</div>
                )}
              </div>
              <div className="piece-grab-hint">DRAG TO BOARD</div>
            </div>

            <div
              className="panel-card image-card"
              style={{ backgroundImage: `url(${imagePath})` }}
              onClick={() => setImageZoomed(true)}
              title="Click to zoom"
            />

            {!roomId && (
              <div className="panel-card desktop-only">
                <button onClick={handleModeMenu}>Restart</button>
              </div>
            )}
          </div>
        </div>
      </div>

      {activeBrick &&
        dragPos &&
        createPortal(
          <div
            style={{
              position: "fixed",
              left: dragPos.x,
              top: dragPos.y,
              transform: "translate(-50%, -50%)",
              pointerEvents: "none",
              zIndex: 9999,
              opacity: isOnBoard ? 0.85 : 1,
              filter: isOnBoard
                ? "drop-shadow(0 0 12px rgba(68,255,136,.9))"
                : "drop-shadow(0 0 10px rgba(255,140,0,.7))",
              transition: "filter .1s",
            }}
          >
            <Brick b={activeBrick} boardSize={mod.cols} />
          </div>,
          document.body,
        )}
    </MonitorShell>
  );
}
