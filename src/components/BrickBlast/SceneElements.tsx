import { useFrame, useThree } from "@react-three/fiber";
import { Line, Text } from "@react-three/drei";
import * as THREE from "three";
import { useRef, useState } from "react";
import { useGameStore } from "./Store.ts";

export const CameraController = () => {
	const { size } = useThree();
	const ASPECT = size.width / size.height;
	const FACTOR = 2.5;

	useFrame((state) => {
		// Scale the lookAt target based on aspect ratio
		const xTarget = state.pointer.x * ASPECT * FACTOR;
		const yTarget = state.pointer.y * FACTOR;
		state.camera.lookAt(xTarget, yTarget, 0);
	});
	return null;
};

export const Background = () => {
	return (
		<>
			<pointLight
				color="#ffffff"
				decay={2}
				intensity={10000}
				position={[0, 0, 50]}
			/>
			<mesh rotation={[0, 0, 0]} position={[0, 0, 0]}>
				<planeGeometry args={[1000, 1000]} />
				<meshStandardMaterial color="#000022" />
			</mesh>
		</>
	);
};

export const Score = () => {
	const scoreRef = useRef<THREE.Mesh & { text: string }>(null!);

	useFrame(() => {
		if (scoreRef.current) {
			const coords = useGameStore.getState().hoverCoords;
			const gamestate = useGameStore.getState().isGameOver;
			if (coords !== null) {
				scoreRef.current.text =
					"Coords: " + coords.x + ", " + coords.y + ", " + gamestate;
			} else {
				scoreRef.current.text = "Coords: Void, " + gamestate;
			}
		}
	});

	return (
		<Text
			ref={scoreRef}
			fontSize={10}
			font={"/font/silkscreen/Silkscreen.ttf"}
			position={[0, 60, 5]}
		>
			Coords: 0, 0
		</Text>
	);
};

export const RestartButton = () => {
	const [hovered, setHovered] = useState(false);

	const handleRestart = () => {
		// Forcefully reset the global state without needing a custom action
		useGameStore.setState({
			score: 0,
			grid: Array(9)
				.fill(0)
				.map(() => Array(9).fill(0)),
			isGameOver: false,
			hoverCoords: null,
			hoveredMeshes: [],
			activePiece: null,
			isValidDrop: false,
			nextPieces: [],
		});
	};

	return (
		<group
			position={[-100, 60, 5]} // Top left corner
			onClick={(e) => {
				e.stopPropagation();
				handleRestart();
			}}
			onPointerEnter={(e) => {
				e.stopPropagation();
				setHovered(true);
				document.body.style.cursor = "pointer"; // Make it feel like a real button
			}}
			onPointerLeave={(e) => {
				e.stopPropagation();
				setHovered(false);
				document.body.style.cursor = "default";
			}}
		>
			{/* The background plate of the button */}
			<mesh>
				<planeGeometry args={[12, 12]} />
				{/* Colors swap when you hover over it */}
				<meshBasicMaterial color={hovered ? "#ff4444" : "#aa0000"} />
			</mesh>

			{/* The button text */}
			<Text
				fontSize={4}
				font={"/font/silkscreen/Silkscreen.ttf"}
				position={[0, 0, 1]} // Slightly in front of the background
				color="white"
			>
				RESTART
			</Text>
		</group>
	);
};

export const BlockHolder = () => {
	return (
		<group>
			<Line
				points={[
					[30, 50, 1],
					[30, -50, 1],
					[80, -50, 1],
					[80, 50, 1],
					[30, 50, 1],
				]}
				color="#ffffff"
				lineWidth={6}
			/>
		</group>
	);
};
