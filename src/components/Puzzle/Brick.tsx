import React from "react";
import type { Brick } from "./PuzzleGame";
import "../../styles/components/Puzzle/Brick.css";

// Component to render a single Lego brick with studs based on its properties
export default function Brick(props: { b: Brick }) {
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
