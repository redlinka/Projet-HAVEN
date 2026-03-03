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
  const gridCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const brickCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const sizeRef = useRef<number>(0);

  function setupCanvas() {
    const canvas = gridCanvasRef.current;
    const brickCanvas = brickCanvasRef.current;
    if (!canvas || !brickCanvas) return;

    const parent = canvas.parentElement;
    if (!parent) return;

    const size = Math.min(parent.clientWidth, parent.clientHeight);

    canvas.width = size;
    canvas.height = size;
    brickCanvas.width = size;
    brickCanvas.height = size;

    sizeRef.current = size;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // const legra = new Legra(ctx, size / Math.max(cols, rows));
    // legra.rectangle(0, 0, size, size, { filled: true, color: "#ffffff2f" });

    ctx.clearRect(0, 0, size, size);
    drawGridLines(ctx, size);
  }

  function drawGridLines(ctx: CanvasRenderingContext2D, size: number) {
    const cellSize = size / Math.max(cols, rows);

    ctx.strokeStyle = "#000000";
    ctx.lineWidth = 0.5;

    ctx.beginPath();

    // Vertical lines
    for (let i = 0; i <= cols; i++) {
      const x = i * cellSize;
      ctx.moveTo(x, 0);
      ctx.lineTo(x, rows * cellSize);
    }

    // Horizontal lines
    for (let i = 0; i <= rows; i++) {
      const y = i * cellSize;
      ctx.moveTo(0, y);
      ctx.lineTo(cols * cellSize, y);
    }

    ctx.stroke();
    ctx.closePath();
  }

  function drawBricks() {
    const canvas = brickCanvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const size = sizeRef.current;
    const cellSize = size / Math.max(cols, rows);
    const legra = new Legra(ctx, cellSize);

    ctx.clearRect(0, 0, size, size);

    for (let j = 0; j < rows; j++) {
      for (let i = 0; i < cols; i++) {
        const index = j * cols + i;
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
    const handleResize = () => {
      setupCanvas();
      drawBricks();
    };

    setupCanvas();
    drawBricks();

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [cols, rows]);

  useEffect(() => {
    drawBricks();
  }, [board]);

  return (
    <div className="puzzle-board">
      <canvas id="cnv" ref={gridCanvasRef} className="grid-layer" />
      <canvas ref={brickCanvasRef} className="brick-layer" />
    </div>
  );
}
