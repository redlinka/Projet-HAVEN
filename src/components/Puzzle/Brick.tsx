import React, { useRef, useEffect } from "react";
import Legra from "legra";

import "../../styles/components/Puzzle/Brick.css";

export interface Brick {
  id: number;
  w: number;
  h: number;
  color: string;
}

export default function Brick({
  b,
  boardSize,
  onPointerDown,
}: {
  b: Brick;
  boardSize: number;
  onPointerDown?: (e: React.PointerEvent<HTMLCanvasElement>) => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const myCanvas = canvasRef.current;
    if (!myCanvas) return;

    const boardCanva = document.getElementById("cnv");
    const rawBlockSize = boardCanva ? boardCanva.offsetWidth / boardSize : 50;

    // Get the real size of panel-card (using DOM) to cap the brick size
    let container: HTMLElement | null = myCanvas.parentElement;
    while (container && !container.classList.contains("panel-card")) {
      container = container.parentElement;
    }

    const maxPx = container
      ? Math.min(container.clientWidth, container.clientHeight) - 20 // -20 for padding
      : rawBlockSize * Math.max(b.w, b.h);

    const maxBlockSize = Math.floor(maxPx / Math.max(b.w, b.h));
    const blockSize = Math.min(rawBlockSize, maxBlockSize);

    myCanvas.width = b.w * blockSize;
    myCanvas.height = b.h * blockSize;

    const ctx = myCanvas.getContext("2d");
    if (!ctx) return;

    const legra = new Legra(ctx, blockSize);
    legra.rectangle(0, 0, b.w, b.h, { filled: true, color: `#${b.color}` });
  }, [b, boardSize]);

  return (
    <canvas
      onPointerDown={(e) => {
        e.preventDefault();
        onPointerDown?.(e);
      }}
      style={{ touchAction: "none" }}
      ref={canvasRef}
      className="lego-brick"
    />
  );
}
