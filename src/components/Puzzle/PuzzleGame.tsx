import { useEffect, useRef, useState } from "react";
import { Disc, Disc3, Volume2, VolumeOff } from "lucide-react";
import useSound from "use-sound";

import PuzzleBoard from "./PuzzleBoard";
import DifficultySelect from "./DifficultySelect";
import Brick from "./Brick";
import MonitorShell from "./MonitorShell";
import HUDBar from "./HUDBar";
import LoadingScreen from "./LoadingScreen";

import "../../styles/components/Puzzle/PuzzleGame.css";

import bgMusic from "/sounds/Puzzle/bg2.mp3";
import dropSound from "/sounds/Puzzle/drop2.mp3";
import dragSound from "/sounds/Puzzle/drag.wav";
import wrongPlacementSound from "/sounds/Puzzle/wrong.mp3";
import { createPortal } from "react-dom";

// ---------------- Types ---------------------

export interface Brick {
  id: number;
  w: number;
  h: number;
  color: string;
}

/* ------------------ Utils ------------------ */

function randint(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

const initPuzzleBoard = (cols: number, rows: number) => {
  return Array(cols * rows).fill("");
};

const shuffleArray = (array: Brick[]) => {
  const newArray = [...array];
  for (let i = array.length - 1; i > 0; i--) {
    const randomIndex = Math.floor(Math.random() * (i + 1));
    [newArray[i], newArray[randomIndex]] = [newArray[randomIndex], newArray[i]];
  }
  return newArray;
};

const calculScore = (userArray: string[], answerArray: string[]) => {
  var res = 0;
  for (var i = 0; i < userArray.length; i++) {
    if (userArray[i] === answerArray[i]) {
      res += 1;
    }
  }
  return res;
};

const addBrick = (
  array: string[],
  boardSize: number,
  pos: { x: number; y: number },
  brick: Brick | null,
) => {
  if (!brick) return;

  const newBoard = [...array];

  for (let y = 0; y < brick.h; y++) {
    for (let x = 0; x < brick.w; x++) {
      const targetX = pos.x + x;
      const targetY = pos.y + y;

      if (
        targetX < 0 ||
        targetX >= boardSize ||
        targetY < 0 ||
        targetY >= boardSize
      ) {
        return null;
      }

      const index = targetY * boardSize + targetX;
      if (newBoard[index] !== "") {
        return null;
      }

      newBoard[index] = brick.color;
    }
  }

  return newBoard;
};

const checkPlacementValid = (
  board: string[],
  cols: number,
  brick: Brick,
): boolean => {
  for (let i = 0; i < board.length; i++) {
    if ((i % cols) + brick.w > cols) continue;

    let fits = true;

    for (let row = 0; row < brick.h; row++) {
      for (let col = 0; col < brick.w; col++) {
        const idx = i + col + row * cols;

        if (idx >= board.length || board[idx] !== "") {
          fits = false;
          break;
        }
      }
      if (!fits) break;
    }

    if (fits) return true;
  }

  return false;
};

const getGameData = async (cols: number, rows: number) => {
  const path = "/bricks/";
  const difficulty = `${cols}x${rows}`;
  const folder = randint(1, 3);
  const pavagePath = `${path}${difficulty}/${folder}/pavage.txt`;
  const imagePath = `${path}${difficulty}/${folder}/image.png`;
  const bricksPath = `${path}${difficulty}/${folder}/bricks.txt`;

  const [brickData, answerData] = await Promise.all([
    readBrickFile(bricksPath),
    readPavageFile(pavagePath),
  ]);
  return { brickData, answerData, imagePath };
};

/* ------------------ File readers ------------------ */

async function readBrickFile(filePath: string): Promise<Brick[]> {
  const response = await fetch(filePath);
  const text = await response.text();
  const lines = text.split("\n");
  const bricksArray: Brick[] = [];

  lines.forEach((line, index) => {
    if (!line.trim()) return;
    if (index !== 0) {
      const [sizeColor, x, y, rota] = line.split(",");
      const [size, colorHex] = sizeColor.split("/");
      const [w, h] = size.split("-");
      const rotaInt = parseInt(rota);
      bricksArray.push({
        id: index,
        w: parseInt(rotaInt ? h : w),
        h: parseInt(rotaInt ? w : h),
        color: `${colorHex.toLocaleUpperCase()}`,
      });
    }
  });
  return bricksArray;
}

async function readPavageFile(filePath: string): Promise<string[]> {
  const response = await fetch(filePath);
  const text = await response.text();
  const lines = text.split(/\r?\n/);
  let hexaArray: string[] = [];

  lines.forEach((line, index) => {
    if (!line.trim()) return;
    if (index !== 0) {
      hexaArray = hexaArray.concat(line.toLocaleUpperCase().trim().split(" "));
    }
  });

  return hexaArray;
}

/* ------------------ Component ------------------ */
export default function PuzzleGame() {
  // =============== State ==============
  const [mod, setMod] = useState({ cols: 0, rows: 0 });
  const [loading, setLoading] = useState(false);

  const [allBricks, setAllBricks] = useState<Brick[]>([]);
  const [currentBrick, setCurrentBrick] = useState<Brick | null>(null);

  const [board, setBoard] = useState<string[]>([]);
  const [answerBoard, setAnswerBoard] = useState<string[]>([]);
  const [score, setScore] = useState(0);

  const [imagePath, setImagePath] = useState<string>("");

  const [isPlayingMusic, setIsPlayingMusic] = useState(true);
  const [isPlayingEffect, setIsPlayingEffect] = useState(true);

  // ============== Sounds ==============
  const [playGameMusic, { stop: stopMusic, pause: pauseMusic }] = useSound(
    bgMusic,
    {
      volume: 0.05,
      loop: true,
      interrupt: true,
    },
  );

  const [playOnDrag] = useSound(dragSound, {
    volume: 0.2,
  });
  const [playOnDrop] = useSound(dropSound, {
    volume: 0.05,
  });
  const [playWrongPlacement] = useSound(wrongPlacementSound, {
    volume: 0.1,
  });

  // ============== Drag State ===========
  const [activeBrick, setActiveBrick] = useState<Brick | null>(null);
  const draggingBrickRef = useRef<Brick | null>(null);
  const modRef = useRef({ cols: 0, rows: 0 });

  const [dragPos, setDragPos] = useState<{ x: number; y: number } | null>(null);
  const [isOnBoard, setIsOnBoard] = useState(false);
  const [snapCell, setSnapCell] = useState<{ i: number; j: number } | null>(
    null,
  );
  const [endGame, setEndGame] = useState<boolean>(false);
  const [nbPieces, setNbPieces] = useState<number>(0);

  useEffect(() => {
    modRef.current = mod;
  }, [mod]);

  /* =========== Drag listeners =========== */

  useEffect(() => {
    const getBoardInfos = () => {
      const canvas = document.getElementById("cnv");
      if (!canvas) return null;
      const rect = canvas.getBoundingClientRect();
      const BS = rect.width / modRef.current.cols;
      return { rect, BS };
    };

    const getCoords = (e: MouseEvent | TouchEvent) => {
      if ("touches" in e) {
        return { clientX: e.touches[0].clientX, clientY: e.touches[0].clientY };
      }
      return { clientX: e.clientX, clientY: e.clientY };
    };

    const onMove = (e: MouseEvent | TouchEvent) => {
      const brick = draggingBrickRef.current;
      if (!brick) return;

      const { clientX, clientY } = getCoords(e);
      setDragPos({ x: clientX, y: clientY });

      const boardInfo = getBoardInfos();
      if (!boardInfo) return;

      const { rect, BS } = boardInfo;
      const topLeftX = clientX - rect.left - (brick.w * BS) / 2;
      const topLeftY = clientY - rect.top - (brick.h * BS) / 2;
      const i = Math.round(topLeftX / BS);
      const j = Math.round(topLeftY / BS);

      const inside =
        i >= 0 &&
        i + brick.w <= modRef.current.cols &&
        j >= 0 &&
        j + brick.h <= modRef.current.rows;

      setIsOnBoard(inside);
      setSnapCell(inside ? { i, j } : null);
    };

    const onEnd = (e: MouseEvent | TouchEvent) => {
      const currentBrickToPlace = draggingBrickRef.current;
      if (!currentBrickToPlace) return;

      // Pour touchend, les coords sont dans changedTouches
      const coords =
        "changedTouches" in e
          ? {
              clientX: e.changedTouches[0].clientX,
              clientY: e.changedTouches[0].clientY,
            }
          : { clientX: e.clientX, clientY: e.clientY };

      const boardInfo = getBoardInfos();
      if (boardInfo) {
        const { rect, BS } = boardInfo;
        const topLeftX =
          coords.clientX - rect.left - (currentBrickToPlace.w * BS) / 2;
        const topLeftY =
          coords.clientY - rect.top - (currentBrickToPlace.h * BS) / 2;
        const i = Math.round(topLeftX / BS);
        const j = Math.round(topLeftY / BS);

        setBoard((prevBoard) => {
          const updatedBoard = addBrick(
            prevBoard,
            modRef.current.cols,
            { x: i, y: j },
            currentBrickToPlace,
          );

          if (updatedBoard) {
            if (isPlayingEffect) {
              playOnDrop();
            }

            setAllBricks((prevBricks) => {
              const next = prevBricks.slice(1);
              setCurrentBrick(next[0] ?? null);

              if (
                (next[0] &&
                  !checkPlacementValid(
                    updatedBoard,
                    modRef.current.cols,
                    next[0],
                  )) ||
                next.length === 0
              ) {
                setEndGame(true);
              }

              return next;
            });
            return updatedBoard;
          } else {
            if (isPlayingEffect) playWrongPlacement();
            return prevBoard;
          }
        });
      }

      draggingBrickRef.current = null;
      setActiveBrick(null);
      setDragPos(null);
      setIsOnBoard(false);
      setSnapCell(null);
    };

    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onEnd);
    window.addEventListener("touchmove", onMove, { passive: true });
    window.addEventListener("touchend", onEnd);

    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onEnd);
      window.removeEventListener("touchmove", onMove);
      window.removeEventListener("touchend", onEnd);
    };
  }, [isPlayingEffect, playOnDrop, playWrongPlacement]);

  const handleGrab = (brick: Brick, e: React.MouseEvent) => {
    if (isPlayingEffect) {
      playOnDrag();
    }
    draggingBrickRef.current = brick;
    setActiveBrick(brick);
    setDragPos({ x: e.clientX, y: e.clientY });
  };

  const handleTouchStart = (brick: Brick, e: React.TouchEvent) => {
    if (isPlayingEffect) {
      playOnDrag();
    }
    draggingBrickRef.current = brick;
    setActiveBrick(brick);
    setDragPos({ x: e.touches[0].clientX, y: e.touches[0].clientY });
  };

  const handleModMenu = () => {
    console.log("Menu game");
    setEndGame(false);
    setMod({ cols: 0, rows: 0 });
  };

  /* =========== Game loading =========== */

  useEffect(() => {
    if (!mod.cols || !mod.rows) return;

    const loadGame = async () => {
      setLoading(true);
      try {
        const { imagePath, brickData, answerData } = await getGameData(
          modRef.current.cols,
          modRef.current.rows,
        );

        const shuffled = shuffleArray(brickData);
        setNbPieces(shuffled.length);

        setImagePath(imagePath);
        setAllBricks(shuffled.slice(1));
        setCurrentBrick(shuffled[0] ?? null);
        setAnswerBoard(answerData);
        setBoard(initPuzzleBoard(mod.cols, mod.rows));
      } catch (err) {
        console.error("Error loading game:", err);
      } finally {
        setLoading(false);
      }
    };

    loadGame();
  }, [mod]);

  useEffect(() => {
    if (board.length > 0 && answerBoard.length > 0) {
      const newScore = calculScore(board, answerBoard);
      setScore(newScore);
    }
  }, [board, answerBoard]);

  useEffect(() => {
    if (isPlayingMusic) {
      playGameMusic();
    }

    return () => {
      stopMusic();
    };
  }, [playGameMusic, stopMusic]);

  /* =========== Render =========== */

  const endGamePage = () => {
    const perfect = score === nbPieces;

    return (
      <div className="ending-overlay">
        <div className={perfect ? "ending-title-win" : "ending-title-lose"}>
          {perfect ? "PERFECT!" : "GAME CLEAR"}
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <div className="ending-score">
            SCORE {String(score).padStart(4, "0")} / {nbPieces}
          </div>
          {perfect && <div className="ending-hi">★ NEW RECORD ★</div>}
        </div>

        <div style={{ fontSize: 6, color: "#4a3060" }}>
          {mod.cols}×{mod.rows} — {nbPieces} PIECES
        </div>

        <button className="retry-btn" onClick={handleModMenu}>
          MOD MENU
        </button>
      </div>
    );
  };

  const soundsButtons = () => {
    return (
      <div className="sounds-container">
        <button
          onClick={() => {
            setIsPlayingEffect((prev) => {
              return !prev;
            });
          }}
        >
          {isPlayingEffect ? <Volume2 /> : <VolumeOff />}
        </button>
        <button
          onClick={() =>
            setIsPlayingMusic((prev) => {
              if (prev) {
                pauseMusic();
              } else {
                playGameMusic();
              }
              return !prev;
            })
          }
        >
          {isPlayingMusic ? <Disc3 /> : <Disc />}
        </button>
      </div>
    );
  };

  // -- Loading --
  if (loading)
    return (
      <MonitorShell>
        <LoadingScreen />
      </MonitorShell>
    );

  const total = nbPieces;

  return (
    <MonitorShell>
      {soundsButtons()}
      {/* HUD */}
      {endGame ? (
        endGamePage()
      ) : !mod.cols || !mod.rows ? (
        <DifficultySelect setMod={setMod} />
      ) : (
        <div className="puzzle-game-container">
          <HUDBar
            score={score}
            placed={nbPieces - allBricks.length}
            total={total}
            remaining={allBricks.length}
          />

          <div className="puzzle-game">
            {/* Board */}
            <div className="board-wrap">
              <span className="board-label">▸ BOARD</span>
              <div className="board-container">
                <PuzzleBoard
                  rows={mod.rows}
                  cols={mod.cols}
                  board={board}
                  img={imagePath}
                />
              </div>
            </div>

            {/* Right Panel */}
            <div className="side-panel">
              {/* Current piece */}
              <div className="panel-card">
                <div className="panel-card-title">CURRENT PIECE</div>
                <div className="piece-random">
                  {currentBrick ? (
                    <div
                      style={{ opacity: draggingBrickRef.current ? 0.3 : 1 }}
                    >
                      <Brick
                        b={currentBrick}
                        boardSize={16}
                        onGrab={(brick, e) => handleGrab(brick, e)}
                        onTouchStart={(brick, e) => handleTouchStart(brick, e)}
                      />
                    </div>
                  ) : (
                    <div style={{ fontSize: 7, color: "#3a2d5c" }}>-</div>
                  )}
                </div>
                <div className="piece-grab-hint">DRAG TO BOARD</div>
              </div>
            </div>
          </div>

          {/* Floating dragged brick */}
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
