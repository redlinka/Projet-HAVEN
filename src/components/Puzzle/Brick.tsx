import React, { useRef, useEffect } from "react";
import Legra from "legra";
import type { Brick } from "./PuzzleGame";
import "../../styles/components/Puzzle/Brick.css";

// Component to render a single Lego brick with studs based on its properties
export default function Brick({
  b,
  boardSize,
  onGrab
}: {
  b: Brick;
  boardSize: number;
  onGrab?: (brick: Brick, e: React.MouseEvent<HTMLCanvasElement, MouseEvent>) => void;

}) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

useEffect(() => {
  const myCanvas = canvasRef.current;
  if (!myCanvas) return;

  const boardCanva = document.getElementById("cnv");
  const blockSize = boardCanva ? boardCanva.offsetWidth / boardSize : 50; // fallback 50px

  myCanvas.width = b.w * blockSize;
  myCanvas.height = b.h * blockSize;

  const ctx = myCanvas.getContext("2d");
  if (!ctx) return;

  const legra = new Legra(ctx, blockSize);
  legra.rectangle(0, 0, b.w, b.h, { filled: true, color: b.color });
}, [b, boardSize]); // ← dépendances correctes

return (
  <canvas
    onMouseDown={(e) => {
      e.preventDefault();
      onGrab?.(b, e);
    }}
    ref={canvasRef}
    className="lego-brick"
  />
);}
