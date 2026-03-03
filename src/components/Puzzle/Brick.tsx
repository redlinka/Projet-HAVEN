import React, { useRef, useEffect } from "react";
import Legra from "legra";

import type { Brick } from "./PuzzleGame";
import "../../styles/components/Puzzle/Brick.css";

export default function Brick({
  b,
  boardSize,
  onGrab,
  onTouchStart,
}: {
  b: Brick;
  boardSize: number;
  onGrab?: (brick: Brick, e: React.MouseEvent<HTMLCanvasElement>) => void;
  onTouchStart?: (brick: Brick, e: React.TouchEvent<HTMLCanvasElement>) => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const myCanvas = canvasRef.current;
    if (!myCanvas) return;

    const boardCanva = document.getElementById("cnv");
    const blockSize = boardCanva ? boardCanva.offsetWidth / boardSize : 50;

    myCanvas.width = b.w * blockSize;
    myCanvas.height = b.h * blockSize;

    const ctx = myCanvas.getContext("2d");
    if (!ctx) return;

    const legra = new Legra(ctx, blockSize);
    legra.rectangle(0, 0, b.w, b.h, { filled: true, color: `#${b.color}` });
  }, [b, boardSize]);

  return (
    <canvas
      onMouseDown={(e) => {
        e.preventDefault();
        onGrab?.(b, e);
      }}
      onTouchStart={(e) => {
        onTouchStart?.(b, e);
      }}
      ref={canvasRef}
      className="lego-brick"
    />
  );
}