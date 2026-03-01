import { useEffect, useRef, useState } from "react";
import testBrique from "/bricks/img1.txt";
import testBriqueAns from "/bricks/img1ans.txt";
import PuzzleBoard from "./PuzzleBoard";
import DifficultySelect from "./DifficultySelect";
import Brick from "./Brick";
import "../../styles/components/Puzzle/PuzzleGame.css";

export interface Brick {
  id: number;
  w: number;
  h: number;
  color: string;
  x: number;
  y: number;
  fixed: boolean;
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
        color: `#${colorHex}`,
        x: parseInt(x),
        y: parseInt(y),
        fixed: false,
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
      hexaArray = hexaArray.concat(line.trim().split(" "));
    }
  });

  return hexaArray;
}

/* ------------------ Game logic ------------------ */

const calculScore = (userArray: string[], answerArray: string[]) => {
  let res = 0;
  for (let i = 0; i < userArray.length; i++) {
    if (userArray[i] === answerArray[i]) res += 1;
  }
  return res;
};

/* ------------------ Component ------------------ */

export default function PuzzleGame() {
  const [mod, setMod] = useState({ cols: 0, rows: 0 });
  const [loading, setLoading] = useState(false);

  const [allBricks, setAllBricks] = useState<Brick[]>([]);
  const [currentBrick, setCurrentBrick] = useState<Brick | null>(null);
  const [answerBoard, setAnswerBoard] = useState<string[]>([]);
  const [board, setBoard] = useState<string[]>([]);
  const [score, setScore] = useState(0);

  // --- Drag (refs pour éviter stale closures) ---
  const draggingBrickRef = useRef<Brick | null>(null);
  const modRef = useRef({ cols: 0, rows: 0 });
  const [dragPos, setDragPos] = useState<{ x: number; y: number } | null>(null);
  const [isOnBoard, setIsOnBoard] = useState(false);
  const [snapCell, setSnapCell] = useState<{ i: number; j: number } | null>(null);

  useEffect(() => { modRef.current = mod; }, [mod]);

  /* ------------------ Drag listeners ------------------ */

  useEffect(() => {
    const onMouseMove = (e: MouseEvent) => {
      if (!draggingBrickRef.current) return;

      const pos = { x: e.clientX, y: e.clientY };
      setDragPos({ ...pos });

      const boardCanvas = document.getElementById("cnv");
      if (!boardCanvas) return;

      const rect = boardCanvas.getBoundingClientRect();
      const BS = rect.width / modRef.current.cols;

      const inside =
        pos.x > rect.left &&
        pos.x < rect.right &&
        pos.y > rect.top &&
        pos.y < rect.bottom;

      if (inside) {
        const i = Math.floor((pos.x - rect.left) / BS);
        const j = Math.floor((pos.y - rect.top) / BS);
        console.log(`ON BOARD — cellule (${i}, ${j})`);
        setIsOnBoard(true);
        setSnapCell({ i, j });
      } else {
        setIsOnBoard(false);
        setSnapCell(null);
      }
    };

    const onMouseUp = (e: MouseEvent) => {
      if (!draggingBrickRef.current) return;

      const pos = { x: e.clientX, y: e.clientY };
      const boardCanvas = document.getElementById("cnv");

      if (boardCanvas) {
        const rect = boardCanvas.getBoundingClientRect();
        const BS = rect.width / modRef.current.cols;
        const inside =
          pos.x > rect.left &&
          pos.x < rect.right &&
          pos.y > rect.top &&
          pos.y < rect.bottom;

        if (inside) {
          const i = Math.floor((pos.x - rect.left) / BS);
          const j = Math.floor((pos.y - rect.top) / BS);
          console.log(`POSÉ en (${i}, ${j})`);
          // TODO: logique de placement
        }
      }

      draggingBrickRef.current = null;
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
  }, []); // [] — les handlers lisent modRef, pas de stale closure

  const handleGrab = (brick: Brick) => {
    draggingBrickRef.current = brick;
  };

  /* ------------------ Game loading ------------------ */

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
        setCurrentBrick(shuffled[0] || null);
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
    setScore(calculScore(board, answerBoard));
  }, [board]);

  /* ------------------ Render ------------------ */

  if (!mod.cols || !mod.rows) return <DifficultySelect setMod={setMod} />;
  if (loading) return <div className="puzzle-game">Loading...</div>;

  return (
    <div className="puzzle-game">
      <PuzzleBoard rows={mod.rows} cols={mod.cols} />

      {/* Brique flottante pendant le drag */}
      {draggingBrickRef.current && dragPos && (
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
          <Brick b={draggingBrickRef.current} boardSize={mod.cols} />
        </div>
      )}

      <div className="infos-area">
        <div className="piece-random">
          {/* Brique en zone d'attente — fantôme quand on la drag */}
          {currentBrick && (
            <div style={{ opacity: draggingBrickRef.current ? 0.3 : 1 }}>
              <Brick b={currentBrick} boardSize={mod.cols} onGrab={handleGrab} />
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
