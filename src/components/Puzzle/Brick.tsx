import React, { useRef, useEffect } from "react";
import Legra from "legra";
import type { Brick } from "./PuzzleGame";
import "../../styles/components/Puzzle/Brick.css";

// Component to render a single Lego brick with studs based on its properties
export default function Brick({
  b,
  boardSize,
}: {
  b: Brick;
  boardSize: number;
}) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const myCanvas = canvasRef.current;
    if (!myCanvas) return;

    const boardCanva = document.getElementById("cnv");
    if (!boardCanva) return;

    const blockSize = boardCanva.offsetWidth / boardSize;

    myCanvas.width = b.w * blockSize;
    myCanvas.height = b.h * blockSize;

    const ctx = myCanvas.getContext("2d");
    if (!ctx) return;

    const legra = new Legra(ctx, blockSize);
    legra.rectangle(0, 0, b.w, b.h, { filled: true, color: b.color });
  }, []);

  return <canvas ref={canvasRef} className="lego-brick"></canvas>;
}
