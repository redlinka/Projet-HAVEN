import { create } from 'zustand';
import * as THREE from 'three';

interface GameState {
    score: number;
    hoverCoords: { x: number; y: number };
    hoveredMeshes: THREE.Mesh[];
    setHoveredMeshes: (meshes: THREE.Mesh[] | null) => void;
    grid: number[][]
}

export const useGameStore = create<GameState>((set) => ({
    score: 0,
    hoverCoords: { x: 0, y: 0 },
    hoveredMeshes: [],
    grid: [
        [0, 0, 0, 0, 0, 0, 0, 0, 0],
        [0, 0, 0, 0, 0, 0, 0, 0, 0],
        [0, 0, 0, 0, 0, 0, 0, 0, 0],
        [0, 0, 0, 0, 0, 0, 0, 0, 0],
        [0, 0, 0, 0, 0, 0, 0, 0, 0],
        [0, 0, 0, 0, 0, 0, 0, 0, 0],
        [0, 0, 0, 0, 0, 0, 0, 0, 0],
        [0, 0, 0, 0, 0, 0, 0, 0, 0],
        [0, 0, 0, 0, 0, 0, 0, 0, 0],
    ],

    setHoveredMeshes: (meshes) => set({ hoveredMeshes: meshes || [] }),
}));