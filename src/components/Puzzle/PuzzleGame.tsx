import { useEffect, useRef, useState } from "react";
import testBrique from "/bricks/img1.txt";
import testBriqueAns from "/bricks/img1ans.txt";

import PuzzleBoard from "./PuzzleBoard";
import DifficultySelect from "./DifficultySelect";
import Brick from "./Brick";

import "../../styles/components/Puzzle/PuzzleGame.css";

// ---------------- Types ---------------------

export interface Brick {
  id: number;
  w: number;
  h: number;
  color: string;
}

/* ------------------ Utils ------------------ */

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

/* ------------------ File readers ------------------ */

async function readBrickFile(filePath: string): Promise<Brick[]> {
  const response = await fetch(filePath);
  const text = await response.text();
  const lines = text.split("\n");
  const bricksArray: Brick[] = [];

  lines.forEach((line, index) => {
    if (!line.trim()) return;
    if (index !== 0) {
      const [sizeColor, x, y] = line.split(",");
      const [size, colorHex] = sizeColor.split("/");
      const [w, h] = size.split("-");
      bricksArray.push({
        id: index,
        w: parseInt(w),
        h: parseInt(h),
        color: `${colorHex.toLocaleUpperCase()}`,
      });
    }
  });
  return bricksArray;
}

async function readImageFile(filePath: string): Promise<string[]> {
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

  // ============== Drag State ===========
  const [activeBrick, setActiveBrick] = useState<Brick | null>(null);
  const draggingBrickRef = useRef<Brick | null>(null);
  const modRef = useRef({ cols: 0, rows: 0 });

  const [dragPos, setDragPos] = useState<{ x: number; y: number } | null>(null);
  const [isOnBoard, setIsOnBoard] = useState(false);
  const [snapCell, setSnapCell] = useState<{ i: number; j: number } | null>(
    null,
  );

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
    const onMouseMove = (e: MouseEvent) => {
      const brick = draggingBrickRef.current;
      if (!brick) return;

      const pos = { x: e.clientX, y: e.clientY };
      setDragPos({ ...pos });

      const boardInfo = getBoardInfos();
      if (!boardInfo) return;

      const { rect, BS } = boardInfo;

      const brickWidthPx = brick.w * BS;
      const brickHeightPx = brick.h * BS;

      const topLeftX = e.clientX - rect.left - brickWidthPx / 2;
      const topLeftY = e.clientY - rect.top - brickHeightPx / 2;

      const i = Math.round(topLeftX / BS);
      const j = Math.round(topLeftY / BS);

      const inside =
        i >= 0 &&
        i + brick.w <= modRef.current.cols &&
        j >= 0 &&
        j + brick.h <= modRef.current.rows;

      if (!inside) {
        setIsOnBoard(false);
        setSnapCell(null);
        return;
      }

      setIsOnBoard(true);
      setSnapCell({ i, j });
    };

    const onMouseUp = (e: MouseEvent) => {
      const currentBrickToPlace = draggingBrickRef.current;
      if (!currentBrickToPlace) return;

      const boardInfo = getBoardInfos();
      if (boardInfo) {
        const { rect, BS } = boardInfo;
        const topLeftX =
          e.clientX - rect.left - (currentBrickToPlace.w * BS) / 2;
        const topLeftY =
          e.clientY - rect.top - (currentBrickToPlace.h * BS) / 2;

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
            setAllBricks((prevBricks) => {
              const next = prevBricks.slice(1);
              setCurrentBrick(next[0] ?? null);
              return next;
            });

            return updatedBoard;
          }

          return prevBoard;
        });
      }

      draggingBrickRef.current = null;
      setActiveBrick(null);
      setDragPos(null);
      setIsOnBoard(false);
      setSnapCell(null);
    };

    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);

    return () => {
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);
    };
  }, []);

  const handleGrab = (brick: Brick) => {
    draggingBrickRef.current = brick;
    setActiveBrick(brick);
  };

  /* =========== Game loading =========== */

  useEffect(() => {
    if (!mod.cols || !mod.rows) return;

    const loadGame = async () => {
      setLoading(true);
      try {
        const [brickData, answerData] = await Promise.all([
          readBrickFile(testBrique),
          readImageFile(testBriqueAns),
        ]);

        const shuffled = shuffleArray(brickData);

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

  /* =========== Render =========== */

  if (!mod.cols || !mod.rows) return <DifficultySelect setMod={setMod} />;
  if (loading) return <div className="puzzle-game">Loading...</div>;

  return (
    <div className="puzzle-game">
      <PuzzleBoard rows={mod.rows} cols={mod.cols} board={board} />

      {/* Floating brick */}
      {activeBrick && dragPos && (
        <div
          style={{
            position: "fixed",
            left: dragPos.x,
            top: dragPos.y,
            transform: "translate(-50%, -50%)",
            pointerEvents: "none",
            zIndex: 9999,
            opacity: isOnBoard ? 0.8 : 1,
            filter: isOnBoard
              ? "drop-shadow(0 0 8px rgba(100,255,100,0.8))"
              : "drop-shadow(0 4px 8px rgba(0,0,0,0.4))",
            transition: "filter 0.1s",
          }}
        >
          <Brick b={activeBrick} boardSize={mod.cols} />
        </div>
      )}

      <div className="infos-area">
        <div className="piece-random">
          {currentBrick && (
            <div style={{ opacity: draggingBrickRef.current ? 0.3 : 1 }}>
              <Brick b={currentBrick} boardSize={32} onGrab={handleGrab} />
            </div>
          )}
        </div>

        <div className="infos-game">
          <p>Score: {score}</p>
          <p>Pièces manquantes : {allBricks.length}</p>
          {snapCell && (
            <p style={{ color: "#4ade80" }}>
              📍 ({snapCell.i}, {snapCell.j})
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
