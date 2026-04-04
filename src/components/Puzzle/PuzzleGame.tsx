import { useEffect } from "react";
import { Disc, Disc3, Volume2, VolumeOff, X } from "lucide-react";
import { createPortal } from "react-dom";

import PuzzleBoard from "./PuzzleBoard";
import DifficultySelect from "./DifficultySelect";
import Brick from "./Brick";
import MonitorShell from "./MonitorShell";
import HUDBar from "./HUDBar";
import LoadingScreen from "./LoadingScreen";
import EndGameScreen from "./EndGameScreen";

import { usePuzzle } from "./hooks/usePuzzle";
import { usePuzzleSound } from "./hooks/usePuzzleSounds";

import "../../styles/components/Puzzle/PuzzleGame.css";
import { useRoom } from "../../contexts/RoomContext";

//COMPONENT

export default function PuzzleGame() {
  const { difficulty } = useRoom();
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

  useEffect(() => {
    if (difficulty) {
      setMod(difficulty);
      console.log("Difficulté reçue du lobby :", difficulty);
    }
  }, [difficulty]);

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

  // RETURN LOADING SCREEN IF STILL LOADING

  if (loading)
    return (
      <MonitorShell>
        <LoadingScreen />
      </MonitorShell>
    );

  const total = nbPieces;

  // MAIN RENDER

  return (
    <MonitorShell>
      {soundsButtons()}

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

      {/* End screen / Mode select / Game */}
      {endGame ? (
        <EndGameScreen
          score={score}
          nbPieces={nbPieces}
          mod={mod}
          difficulty={`${mod.cols}x${mod.rows}`}
          onModeMenu={handleModeMenu}
        />
      ) : !mod.cols || !mod.rows ? (
        <DifficultySelect setMod={setMod} />
      ) : (
        <div className="puzzle-game-container">
          <HUDBar
            score={score}
            placed={nbPieces - allBricks.length}
            total={total}
            remaining={allBricks.length}
            isPlayingEffect={isPlayingEffect}
            isPlayingMusic={isPlayingMusic}
            onToggleEffect={() => setIsPlayingEffect((prev: any) => !prev)}
            onToggleMusic={toggleMusic}
            onRestart={handleModeMenu}
          />

          <div className="puzzle-game">
            {/* Board */}
            <div className="board-wrap">
              <span className="board-label">▸ BOARD</span>
              <div className="board-container">
                <PuzzleBoard rows={mod.rows} cols={mod.cols} board={board} />
              </div>
            </div>

            {/* Side panel */}
            <div className="side-panel">
              <div className="panel-card">
                <div className="panel-card-title">CURRENT PIECE</div>
                <div className="piece-random">
                  {currentBrick ? (
                    <div style={{ opacity: activeBrick ? 0.3 : 1 }}>
                      <Brick
                        b={currentBrick}
                        boardSize={16}
                        onPointerDown={(e) =>
                          handlePointerDown(currentBrick, e)
                        }
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

              {/* Drop down menu for sounds options */}
              <div className="panel-card desktop-only">
                <button
                  onClick={() => {
                    handleModeMenu();
                  }}
                >
                  Restart
                </button>
              </div>
            </div>
          </div>

          {/* Dragging ghost */}
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
        </div>
      )}
    </MonitorShell>
  );
}
