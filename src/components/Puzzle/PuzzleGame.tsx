import { useEffect, useState, type ReactNode } from "react";
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

// Generates an empty puzzle grid
const initPuzzleBoard = (cols: number, rows: number) => {
  return Array(cols * rows).fill("");
};

const initAllBricks = (brickArray: Brick[], boardSize: number): ReactNode[] => {
  return brickArray.map((brickInfo) => (
    <Brick b={brickInfo} boardSize={boardSize} />
  ));
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

// Reads the brick file
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

// Read the answer file
async function readImageFile(filePath: string): Promise<string[]> {
  const response = await fetch(filePath);
  const text = await response.text();

  const lines = text.split(/\r?\n/);
  var hexaArray: string[] = [];

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
  var res = 0;

  for (var i = 0; i < userArray.length; i++) {
    if (userArray[i] === answerArray[i]) {
      res += 1;
    }
  }
  return res;
};

function calculPosBrickOnDrag(
  posBrick: { x: number; y: number },
  mod: { width: number; height: number },
) {
  const boardCanvas = document.getElementById("cnv");
  if (!boardCanvas) return;

  const canvasRect = boardCanvas.getBoundingClientRect();
  const isInside =
    posBrick.x > canvasRect.left &&
    posBrick.x < canvasRect.right &&
    posBrick.y > canvasRect.top &&
    posBrick.y < canvasRect.bottom;

  if (!isInside) return;

  const relativeX = posBrick.x - canvasRect.left;
  const relativeY = posBrick.y - canvasRect.top;

  return {
    i: Math.floor(relativeX / mod.width),
    j: Math.floor(relativeY / mod.height),
  };
}

/* ------------------ Component ------------------ */

export default function PuzzleGame() {
  const [mod, setMod] = useState({ cols: 0, rows: 0 });
  const [loading, setLoading] = useState(false);

  // ---------- Game logic state -------------
  const [allBricks, setAllBricks] = useState<Brick[]>([]);
  const [currentBrick, setCurrentBrick] = useState<Brick | null>(null);
  const [boardBricks, setBoardBricks] = useState<Brick[]>([]);
  const [answerBoard, setAnswerBoard] = useState<string[]>([]);
  const [board, setBoard] = useState<string[]>([]);
  const [score, setScore] = useState(0);

  // ---------- Game functions ---------------

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

  if (!mod.cols || !mod.rows) {
    return <DifficultySelect setMod={setMod} />;
  }

  if (loading) {
    return <div className="puzzle-game">Loading...</div>;
  }

  return (
    <div className="puzzle-game">
      <PuzzleBoard rows={mod.rows} cols={mod.cols} />

      <div className="infos-area">
        <div className="piece-random">
          {currentBrick && <Brick b={currentBrick} boardSize={mod.cols} />}
        </div>

        <div className="infos-game">
          <p>Score: {score}</p>
          <p>Pièces manquantes : {allBricks.length}</p>
        </div>
      </div>
    </div>
  );
}
