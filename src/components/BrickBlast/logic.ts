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

    const worldX = startX + (gridX * CELL_SIZE) + (CELL_SIZE / 2);
    const worldY = startY - (gridY * CELL_SIZE) - (CELL_SIZE / 2);

    return new THREE.Vector2(worldX, worldY);
};

export const checkCollision = (
    shape: number[][],
    gridX: number,
    gridY: number,
    board: number[][]
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

export const placePieceOnBoard = (
    board: number[][],
    shape: number[][],
    gridX: number,
    gridY: number,
    colorIndex: number
): number[][] => {
    const newBoard = board.map(row => [...row]);

    shape.forEach(([colOffset, rowOffset]) => {
        const targetX = gridX + Math.round(colOffset);
        const targetY = gridY + Math.round(rowOffset);

        if (targetY >= 0 && targetY < 9 && targetX >= 0 && targetX < 9) {
            newBoard[targetY][targetX] = colorIndex;
        }
    });

    return newBoard;
};

export const checkGameOver = (
    board: number[][],
    nextPieces: Array<{ shape: number[][]; color: string }>
): boolean => {

    // 1. Loop through all 3 pieces in the dock
    for (const piece of nextPieces) {
        if (!piece) continue;

        let currentShape = piece.shape;

        // 2. Test all 4 rotations for this piece
        for (let r = 0; r < 4; r++) {

            // 3. Scan every single cell on the 9x9 grid
            for (let y = 0; y < 9; y++) {
                for (let x = 0; x < 9; x++) {

                    // If it fits even ONCE, the game is not over. Kill the check instantly.
                    if (checkCollision(currentShape, x, y, board)) {
                        return false;
                    }
                }
            }
            // Rotate the shape 90 degrees and try the grid again
            currentShape = rotateShape(currentShape);
        }
    }

    // If we made it through all pieces, all rotations, and all cells... you're dead.
    return true;
};