import * as THREE from "three";

export const CELL_SIZE = 100 / 9;
export const GRID_WORLD_X = -30;
export const GRID_WORLD_Y = 0;

export const COLORS = {1:"red", 2:"green", 3:"blue", 4:"yellow", 5:"purple"};

export const getRandomColor = () => {
    return COLORS[(Math.floor(Math.random() * Object.keys(COLORS).length) + 1) as keyof typeof COLORS];
}

export const darkenColor = (hex: string, factor = 2): string => {
    const c = new THREE.Color(hex);
    c.multiplyScalar(factor);
    return "#" + c.getHexString();
};

export const getWorldCoordsFromGrid = (gridX: number, gridY: number) => {
    const startX = GRID_WORLD_X - 50;
    const startY = GRID_WORLD_Y - 50;

    const worldX = startX + (gridX * CELL_SIZE) + (CELL_SIZE / 2);
    const worldY = startY + (gridY * CELL_SIZE) + (CELL_SIZE / 2);

    return new THREE.Vector2(worldX, worldY);
};