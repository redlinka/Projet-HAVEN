import * as THREE from "three";

export const CELL_SIZE = 100 / 9;
export const GRID_WORLD_X = -30;
export const GRID_WORLD_Y = 0;

export const getWorldCoordsFromGrid = (gridX: number, gridY: number) => {
    const startX = GRID_WORLD_X - 50;
    const startY = GRID_WORLD_Y - 50;

    const worldX = startX + (gridX * CELL_SIZE) + (CELL_SIZE / 2);
    const worldY = startY + (gridY * CELL_SIZE) + (CELL_SIZE / 2);

    return new THREE.Vector2(worldX, worldY);
};