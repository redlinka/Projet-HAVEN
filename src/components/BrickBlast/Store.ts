import { create } from "zustand";
import * as THREE from "three";
import { placePieceOnBoard } from "./logic.ts";
import { persist } from "zustand/middleware";

interface GameState {
	setScore: (score: number) => void;
	score: number;
	hoverCoords: { x: number; y: number } | null;
	grid: number[][];
	setGrid: (grid: number[][]) => void;

	// the next pieces that will come, serves for the preview and the placing logic
	nextPieces: Array<{ shape: number[][]; color: string } | null>;
	setNextPieces: (pieces: Array<{ shape: number[][]; color: string } | null>) => void;

	//all the currently "hovered" meshes. Only serves to make the white outline
	hoveredMeshes: THREE.Mesh[];
	setHoveredMeshes: (meshes: THREE.Mesh[] | null) => void;

	// prevents the pointer from hovering on a block while currently dragging one
	isDraggingGlobal: boolean;
	setIsDraggingGlobal: (dragging: boolean) => void;

	//the currently dragged shape, serves for the placing logic and the ghost preview
	activePiece: { shape: number[][]; color: string } | null;
	setActivePiece: (piece: { shape: number[][]; color: string } | null) => void;

	// indicates if we can drop the brick or not
	isValidDrop: boolean;
	setIsValidDrop: (valid: boolean) => void;

	//allows to share the game state with multiple components
	isGameOver: boolean;
	setIsGameOver: (isOver: boolean) => void;

	// decoupled logic
	placePiece: (
		shape: number[][],
		gridX: number,
		gridY: number,
		colorIndex: number,
	) => void;
}

export const useGameStore = create<
	GameState,
	[["zustand/persist", Omit<GameState, "setHoveredMeshes" | "setIsDraggingGlobal" | "setActivePiece" | "setIsValidDrop" | "placePiece" | "setNextPieces" | "setGrid" | "setScore" | "hoverCoords" | "hoveredMeshes" | "isDraggingGlobal" | "activePiece" | "isValidDrop" | "setIsGameOver">]]
>(
	persist(
		(set) => ({
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

			nextPieces: [],
			setNextPieces: (pieces) => set({ nextPieces: pieces }),

			setGrid: (grid) => set({ grid }),

			setScore: (score) => set({ score }),

			hoveredMeshes: [],
			setHoveredMeshes: (meshes) => set({ hoveredMeshes: meshes || [] }),

			isDraggingGlobal: false,
			setIsDraggingGlobal: (dragging) => set({ isDraggingGlobal: dragging }),

			activePiece: null,
			setActivePiece: (piece) => set({ activePiece: piece }),

			isValidDrop: false,
			setIsValidDrop: (valid) => set({ isValidDrop: valid }),

			isGameOver: false,
			setIsGameOver: (isOver) => set({ isGameOver: isOver }),

			placePiece: (shape, gridX, gridY, colorIndex) => {
				set((state) => ({
					grid: placePieceOnBoard(state.grid, shape, gridX, gridY, colorIndex),
				}));
			},
		}),
		{
			name: "brick-blast-storage",
			partialize: (state) => ({
				score: state.score,
				grid: state.grid,
				nextPieces: state.nextPieces,
				isGameOver: state.isGameOver,
			}),
		},
	),
);
