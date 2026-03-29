import { create } from 'zustand';
import * as THREE from 'three';
import {placePieceOnBoard} from "./logic.ts";

interface GameState {

    score: number;
    hoverCoords: { x: number; y: number } | null;
    grid: number[][]

    //all the currently "hovered" meshes. Only serves to make the white outline
    hoveredMeshes: THREE.Mesh[];
    setHoveredMeshes: (meshes: THREE.Mesh[] | null) => void;

    // prevents the pointer from hovering on a block while currently dragging one
    isDraggingGlobal: boolean;
    setIsDraggingGlobal: (dragging: boolean) => void;

    //the currently dragged shape, serves for the placing logic and the ghost preview
    activePiece: { shape: number[][], color: string } | null;
    setActivePiece: (piece: { shape: number[][], color: string } | null) => void;

    // indicates if we can drop the brick or not
    isValidDrop: boolean;
    setIsValidDrop: (valid: boolean) => void;

    // decoupled logic
    placePiece: (shape: number[][], gridX: number, gridY: number, colorIndex: number) => void;
}

export const useGameStore = create<GameState>((set) => ({
    score: 0,
    hoverCoords: null,
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

    hoveredMeshes: [],
    setHoveredMeshes: (meshes) => set({ hoveredMeshes: meshes || [] }),

    isDraggingGlobal: false,
    setIsDraggingGlobal: (dragging) => set({ isDraggingGlobal: dragging }),

    activePiece: null,
    setActivePiece: (piece) => set({ activePiece: piece }),

    isValidDrop: false,
    setIsValidDrop: (valid) => set({ isValidDrop: valid }),

    placePiece: (shape, gridX, gridY, colorIndex) => {
        set((state) => ({
            grid: placePieceOnBoard(state.grid, shape, gridX, gridY, colorIndex)
        }));
    },
}));