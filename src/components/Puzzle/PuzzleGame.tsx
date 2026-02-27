import { useEffect, useState } from "react";
import testBrique from "/bricks/img1.txt";
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

// Generates an empty puzzle grid
function initPuzzleBoard(width: number, height: number) {
  return Array(width * height).fill("");
}

// Reads the brick data
async function readFile(filePath: string): Promise<Brick[]> {
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

export default function PuzzleGame() {
  const [mod, setMod] = useState({ width: 0, height: 0 });
  const [loading, setLoading] = useState<boolean>(false);
  const [bricks, setBricks] = useState<Brick[]>([]);
  const [board, setBoard] = useState<string[]>([]);

  useEffect(() => {
    if (mod.width === 0 || mod.height === 0) return;

    const load = async () => {
      setLoading(true);
      try {
        // Init bricks
        const data = await readFile(testBrique);
        setBricks(data);
        // Init board array
        setBoard(initPuzzleBoard(mod.width, mod.height));
      } catch (err) {
        console.error("Error during loading game:", err);
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [mod]);

  if (mod.width === 0 || mod.height === 0) {
    return <DifficultySelect setMod={setMod} />;
  }

  if (loading) {
    return <div className="puzzle-game">Loading...</div>;
  }

  return (
    <div className="puzzle-game">
      {/* Puzzle board view */}
      <PuzzleBoard height={mod.height} width={mod.width} />
      {/* Game info view */}
      <div className="infos-area">
        <div className="piece-random">
          {bricks[0] && <Brick b={bricks[0]} boardSize={mod.height} />}
        </div>

        <div className="infos-game">
          <p>Score: 0</p>
          <p>Pièces manquantes : 64</p>
        </div>
      </div>
    </div>
  );
}
