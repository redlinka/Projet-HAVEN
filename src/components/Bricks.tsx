import { useEffect, useState } from "react";
import testBrique from "/bricks/img1.txt";

interface Brick {
  id: number;
  w: number;
  h: number;
  color: string;
  x: number;
  y: number;
  fixed: boolean;
}

const BLOCK_SIZE = 17;
const STUD_SIZE = 11;
const STUD_OFFSET = (BLOCK_SIZE - STUD_SIZE) / 2;

const STUD_STYLE = `
    .lego-brick {
        position: absolute;
        border-radius: 3px;
        box-shadow: inset -2px -2px 4px rgba(0,0,0,0.25), inset 2px 2px 4px rgba(255,255,255,0.2);
        box-sizing: border-box;
    }
    .lego-stud {
        position: absolute;
        width: 10px;
        height: 10px;
        border-radius: 50%;
        background: inherit;
        filter: brightness(1.15);
        box-shadow: 0 2px 4px rgba(0,0,0,0.35), inset 0 1px 2px rgba(255,255,255,0.3);
        transform: translateZ(0);
        pointer-events: none;
    }
`;

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

// Component to render a single Lego brick with studs based on its properties
function LegoBrick(props: { b: Brick }) {
  const b = props.b;
  const studs: { x: number; y: number }[] = [];

  for (let row = 0; row < b.h; row++) {
    for (let col = 0; col < b.w; col++) {
      studs.push({
        x: col * BLOCK_SIZE + STUD_OFFSET,
        y: row * BLOCK_SIZE + STUD_OFFSET,
      });
    }
  }

  return (
    <div
      className="lego-brick"
      style={{
        left: `${b.x * BLOCK_SIZE}px`,
        top: `${b.y * BLOCK_SIZE}px`,
        width: `${b.w * BLOCK_SIZE}px`,
        height: `${b.h * BLOCK_SIZE}px`,
        backgroundColor: b.color,
        cursor: b.fixed ? "default" : "pointer",
      }}
    >
      {studs.map((s, i) => (
        <div
          key={i}
          className="lego-stud"
          style={{ left: `${s.x}px`, top: `${s.y}px` }}
        />
      ))}
    </div>
  );
}

// Generates an empty puzzle grid of given width and height
function initPuzzleBoard(width: number, height: number) {
  const puzzleTab: number[][] = [];
  for (let i = 0; i < height; i++) {
    const row: number[] = [];
    for (let j = 0; j < width; j++) row.push(0);
    puzzleTab.push(row);
  }
  return puzzleTab;
}

// Main component that loads bricks and renders the puzzle board
export default function PuzzleBoard() {
  const [bricks, setBricks] = useState<Brick[]>([]);

  useEffect(() => {
    const load = async () => {
      const data = await readFile(testBrique);
      setBricks(data);
    };
    load();
  }, []);

  const puzzleGrid = initPuzzleBoard(32, 32);
  const gridCols = puzzleGrid[0].length;
  const gridRows = puzzleGrid.length;
  const containerWidth = gridCols * BLOCK_SIZE;
  const containerHeight = gridRows * BLOCK_SIZE;

  bricks.forEach((b) => {
    for (let row = b.y; row < b.y + b.h; row++) {
      for (let col = b.x; col < b.x + b.w; col++) {
        puzzleGrid[row][col] = b.id;
      }
    }
  });

  console.log(puzzleGrid);

  return (
    <>
      <style>{STUD_STYLE}</style>
      <div
        style={{
          width: "100%",
          height: "100%",
          overflow: "auto",
          backgroundColor: "#d0d0d0",
          padding: "16px",
          boxSizing: "border-box",
          fontFamily: "monospace",
        }}
      >
        <div
          style={{
            position: "relative",
            width: `${containerWidth}px`,
            height: `${containerHeight}px`,
            minWidth: `${containerWidth}px`,
            minHeight: `${containerHeight}px`,
            backgroundColor: "#c8c8c8",
            border: "2px solid #999",
            borderRadius: "4px",
            boxShadow: "0 4px 16px rgba(0,0,0,0.2)",
            flexShrink: 0,
          }}
        >
          {(() => {
            //  We use a Set to track which brick IDs we've already rendered to avoid duplicates
            const seen = new Set<number>();
            return puzzleGrid.map((row, y) =>
              row.map((cell, x) => {
                if (cell === 0) {
                  return (
                    <div
                      key={`empty-${x}-${y}`}
                      style={{
                        position: "absolute",
                        left: `${x * BLOCK_SIZE}px`,
                        top: `${y * BLOCK_SIZE}px`,
                        width: `${BLOCK_SIZE}px`,
                        height: `${BLOCK_SIZE}px`,
                        border: "1px dashed rgba(0,0,0,0.1)",
                        boxSizing: "border-box",
                      }}
                    />
                  );
                } else if (!seen.has(cell)) {
                  const brick = bricks.find((b) => b.id === cell);
                  if (brick) {
                    seen.add(cell);
                    return <LegoBrick key={`brick-${brick.id}`} b={brick} />;
                  }
                }
                return null;
              }),
            );
          })()}
        </div>
      </div>
    </>
  );
}
