import { create } from 'zustand';
import * as THREE from 'three';

interface GameState {
    score: number;
    hoverCoords: { x: number; y: number } | null;
    hoveredMeshes: THREE.Mesh[];
    setHoveredMeshes: (meshes: THREE.Mesh[] | null) => void;
    isDraggingGlobal: boolean;
    setIsDraggingGlobal: (dragging: boolean) => void;
    grid: number[][]
}

export const useGameStore = create<GameState>((set) => ({
    score: 0,
    hoverCoords: null,
    hoveredMeshes: [],
    grid: [
        [0, 0, 0, 0, 0, 0, 0, 0, 0],
        [0, 0, 0, 0, 0, 0, 0, 0, 0],
        [0, 0, 0, 0, 0, 0, 1, 0, 0],
        [0, 0, 0, 0, 0, 5, 0, 0, 0],
        [0, 0, 0, 0, 5, 0, 0, 0, 0],
        [0, 0, 0, 0, 0, 0, 0, 0, 0],
        [0, 0, 0, 0, 0, 0, 0, 0, 0],
        [0, 0, 0, 0, 0, 0, 0, 0, 0],
        [0, 0, 0, 0, 0, 0, 0, 0, 0],
    ],
    setHoveredMeshes: (meshes) => set({ hoveredMeshes: meshes || [] }),
    isDraggingGlobal: false,
    setIsDraggingGlobal: (dragging) => set({ isDraggingGlobal: dragging }),
}));