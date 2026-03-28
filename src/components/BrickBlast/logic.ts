import * as THREE from "three";

export const CELL_SIZE = 100 / 9;
export const GRID_WORLD_X = -30;
export const GRID_WORLD_Y = 0;

export const COLORS = {
  1: "red",
  2: "green",
  3: "blue",
  4: "yellow",
  5: "purple",
};

export const getRandomColor = () => {
  return COLORS[
    (Math.floor(Math.random() * Object.keys(COLORS).length) +
      1) as keyof typeof COLORS
  ];
};

export const darkenColor = (hex: string, factor = 2): string => {
  const c = new THREE.Color(hex);
  c.multiplyScalar(factor);
  return "#" + c.getHexString();
};

export const getWorldCoordsFromGrid = (gridX: number, gridY: number) => {
  const startX = GRID_WORLD_X - 50;
  const startY = GRID_WORLD_Y + 50;

  const worldX = startX + gridX * CELL_SIZE + CELL_SIZE / 2;
  const worldY = startY - gridY * CELL_SIZE + CELL_SIZE / 2;

  return new THREE.Vector2(worldX, worldY);
};

export const checkCollision = (
  shape: number[][],
  gridX: number,
  gridY: number,
  board: number[][],
): boolean => {
  for (const [colOffset, rowOffset] of shape) {
    // Add the piece's local coordinates to the grid's hovered coordinates
    const targetX = gridX + Math.round(colOffset);
    const targetY = gridY + Math.round(rowOffset);

    // 1. Check Out of Bounds
    if (targetX < 0 || targetX >= 9 || targetY < 0 || targetY >= 9) {
      return false;
    }

    // 2. Check Overlap (Is the grid cell already taken by a number > 0?)
    if (board[targetY][targetX] !== 0) {
      return false;
    }
  }

  // If we made it through the whole loop without returning false, it fits!
  return true;
};

export const rotateShape = (shape: number[][]): number[][] =>
  shape.map(([c, r]) => [r, -c]);
