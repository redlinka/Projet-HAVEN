import { useEffect, useState } from "react";
import testBrique from "/bricks/img1.txt";
import PuzzleBoard from "./PuzzleBoard";
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

export default function PuzzleGame() {
  const [mod, setMod] = useState({ height: 32, width: 32 });
  const [bricks, setBricks] = useState<Brick[]>([]);
  const [board, setBoard] = useState<string[]>([]);

  useEffect(() => {
    const load = async () => {
      const data = await readFile(testBrique);
      setBricks(data);
      setBoard(initPuzzleBoard(mod.width, mod.height));
    };
    load();
  }, []);

  return (
    <div className="puzzle-game">
      <PuzzleBoard height={mod.height} width={mod.width} />
    </div>
  );
}

// Generates an empty puzzle grid of given width and height
function initPuzzleBoard(width: number, height: number) {
  const puzzleTab: string[] = [];
  for (let i = 0; i < height * width; i++) {
    puzzleTab.push("");
  }
  return puzzleTab;
}

// Reads the brick data from a text file and returns an array of Brick
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
