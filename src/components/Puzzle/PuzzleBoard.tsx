import { useEffect, useRef } from "react";
import Legra from "legra";
import "../../styles/components/Puzzle/PuzzleBoard.css";

export default function PuzzleBoard({
  cols,
  rows,
  board,
}: {
  cols: number;
  rows: number;
  board: string[];
}) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const gridCols = cols;
  const gridRows = rows;

  function drawGrid() {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const parent = canvas.parentElement;
    if (!parent) return;

    const size = Math.min(parent.clientWidth, parent.clientHeight);

    canvas.width = size;
    canvas.height = size;

    ctx.clearRect(0, 0, size, size);

    drawGridLines(ctx, size);

    drawBricks(ctx, size);
  }

  function drawGridLines(ctx: CanvasRenderingContext2D, size: number) {
    const cellSize = size / Math.max(gridCols, gridRows);

    ctx.strokeStyle = "#000000";
    ctx.lineWidth = 0.5;

    ctx.beginPath();

    // Vertical lines
    for (let i = 0; i <= gridCols; i++) {
      const x = i * cellSize;
      ctx.moveTo(x, 0);
      ctx.lineTo(x, gridRows * cellSize);
    }

    // Horizontal lines
    for (let i = 0; i <= gridRows; i++) {
      const y = i * cellSize;
      ctx.moveTo(0, y);
      ctx.lineTo(gridCols * cellSize, y);
    }

    ctx.stroke();
    ctx.closePath();
  }

  function drawBricks(ctx: CanvasRenderingContext2D, size: number) {
    if (!board) return;

    const cellSize = size / Math.max(gridCols, gridRows);
    const legra = new Legra(ctx, cellSize);

    ctx.beginPath();

    for (let i = 0; i <= gridRows; i++) {
      for (let j = 0; j <= gridCols; j++) {
        const index = j * gridCols + i;
        if (board[index] !== "") {
          legra.rectangle(i, j, 1, 1, {
            filled: true,
            color: `#${board[index]}`,
          });
        }
      }
    }
  }

  useEffect(() => {
    drawGrid();

    const handleResize = () => drawGrid();
    window.addEventListener("resize", handleResize);

    return () => window.removeEventListener("resize", handleResize);
  }, [gridCols, gridRows, board]);

  return (
    <div className="puzzle-board">
      <canvas id="cnv" ref={canvasRef} />
    </div>
  );
}
