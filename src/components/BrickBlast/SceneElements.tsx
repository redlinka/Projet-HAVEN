import { useFrame, useLoader, useThree } from "@react-three/fiber";
import { Edges, Line, Text } from "@react-three/drei";
import * as THREE from "three";
import { useRef, useState } from "react";
import { useGameStore } from "./Store.ts";
import {ASPECT_COEFF} from "./logic.ts";
import {playSFX, toggleBGM} from "./audio.ts";

export const CameraController = () => {
	const { size } = useThree();
	const aspect = size.width * ASPECT_COEFF / size.height;
	const isPortrait = aspect < 1;
	const FACTOR = 3.5;

	useFrame((state) => {
		// Scale the lookAt target based on aspect ratio
		const targetX = isPortrait ? -30 : 0;
		const targetY = isPortrait ? -20 : -15;
		const targetZ = isPortrait ? 70 / aspect : 100;
		state.camera.position.lerp(new THREE.Vector3(targetX, targetY, targetZ), 0.05);

		// Scale the lookAt target based on the new origin
		const lookX = targetX + state.pointer.x * aspect * FACTOR;
		const lookY = targetY + state.pointer.y * FACTOR;
		state.camera.lookAt(lookX, lookY+15, 0);
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
			const score = useGameStore.getState().score;
			scoreRef.current.text = "Score: " + score;
		}
	});

	return (
		<Text
			ref={scoreRef}
			fontSize={10}
			font={"/font/silkscreen/Silkscreen.ttf"}
			anchorY={"middle"}
			anchorX={"left"}
			position={[-75, 60, 5]}
		>
			Score:
		</Text>
	);
};

export const BlockHolder = () => {
	const { size } = useThree();
	const isPortrait = size.width * ASPECT_COEFF < size.height;

	// Switch between the vertical sidebox and the horizontal bottom box
	const points = isPortrait
		? [[0, 0, 0]]
		: [[30, 50, 1], [30, -50, 1], [80, -50, 1], [80, 50, 1], [30, 50, 1]];

	return (
		<group>
			<Line points={points as never} color="#ffffff" lineWidth={6} />
		</group>
	);
};

export const GameOverScreen = () => {
	const isGameOver = useGameStore((state) => state.isGameOver);
	const groupRef = useRef<THREE.Group>(null!);
	const overlayRef = useRef<THREE.MeshBasicMaterial>(null!);

	useFrame(() => {
		if (!groupRef.current || !overlayRef.current) return;

		if (isGameOver) {
			groupRef.current.visible = true;
			// Lerp the background darkness in
			overlayRef.current.opacity = THREE.MathUtils.lerp(overlayRef.current.opacity, 1, 0.03);
			// Lerp the scale from 0 to 1 for a "pop-in" effect
			groupRef.current.scale.lerp(new THREE.Vector3(1, 1, 1), 0.02);
		} else {
			// Deflate and hide when the game restarts
			overlayRef.current.opacity = 0;
			groupRef.current.scale.set(0, 0, 0);
			groupRef.current.visible = false;
		}
	});

	const handleRetry = () => {
		useGameStore.setState({
			score: 0,
			grid: Array(9).fill(0).map(() => Array(9).fill(0)),
			isGameOver: false,
			hoverCoords: null,
			hoveredMeshes: [],
			activePiece: null,
			isValidDrop: false,
			nextPieces: [],
		});
	};

	const handleQuit = () => {
		console.log("Quit clicked");
		// Does nothing for now, just logs!
	};

	return (
		<group ref={groupRef} position={[0, 0, 20]} visible={false}>
			{/* The Dark Shield - swallows clicks so the board behind it is disabled */}
			<mesh
				position={[0, 0, -5]}
				onPointerDown={(e) => e.stopPropagation()}
				onPointerMove={(e) => e.stopPropagation()}
			>
				<planeGeometry args={[1000, 1000]} />
				<meshBasicMaterial ref={overlayRef} color="black" transparent opacity={0} depthWrite={false} />
			</mesh>

			<Text
				fontSize={22}
				font={"/font/silkscreen/Silkscreen.ttf"}
				color="#ff2222"
				position={[0, 25, 0]}
				outlineWidth={0}
				outlineColor="black"
			>
				GAME OVER
			</Text>

			<MenuButton position={[-25, -15, 0]} size={22} imageSrc="/img/brickblast/replay.png" musicSrc={"/sounds/brickblast/nice.mp3"} onClick={handleRetry} color="none" />
			<MenuButton position={[25, -15, 0]} size={25} imageSrc="/img/brickblast/exit.png" musicSrc={"/sounds/brickblast/nice.mp3"} onClick={handleQuit} color="none" />
		</group>
	);
};

// A reusable 3D interactive button just for the Menu
const MenuButton = ({
						position,
						size,
						imageSrc,
						musicSrc,
						color,
						hoverTint = "red",
						onClick
					}: {
	position: [number, number, number],
	size: number,
	imageSrc: string,
	musicSrc?: string,
	color: string,
	hoverTint?: string,
	onClick: () => void
}) => {
	const [hovered, setHovered] = useState(false);
	const texture = useLoader(THREE.TextureLoader, imageSrc);

	// Check if the user wants a transparent background
	const isTransparent = color === "none" || color === "transparent";

	return (
		<group
			position={position}
			onClick={(e) => {
				e.stopPropagation(); onClick();
				if (musicSrc) {
					playSFX(musicSrc, 0.5);
				}
			}}

			onPointerEnter={(e) => { e.stopPropagation(); setHovered(true); document.body.style.cursor = "pointer"; }}
			onPointerLeave={(e) => { e.stopPropagation(); setHovered(false); document.body.style.cursor = "default"; }}
		>
			{/* Optional Background Plane */}
			{!isTransparent && (
				<mesh position={[0, 0, -0.1]}>
					<planeGeometry args={[size, size]} />
					<meshStandardMaterial color={hovered ? color : "#222222"} />
					<Edges color={hovered ? "white" : color} lineWidth={5} scale={1.5} />
				</mesh>
			)}

			{/* Foreground Image Mesh */}
			<mesh>
				<planeGeometry args={[size, size]} />
				<meshStandardMaterial
					color={hovered ? hoverTint : "#ffffff"}
					map={texture}
					transparent={true}
					depthWrite={false}
				/>
			</mesh>
		</group>
	);
};

export const MusicButton = () => {
	// Start muted by default
	const [isMuted, setIsMuted] = useState(true);
	const { size } = useThree();

	// Shift it slightly to the left of the Restart Button
	const isPortrait = size.width * (1) < size.height; // Assuming ASPECT_COEFF is 1
	const buttonX = isPortrait ? 5 : 55;

	const handleToggle = () => {
		const nextMutedState = !isMuted;
		setIsMuted(nextMutedState);

		// Pass the path to your music file, the volume, and whether it should be muted
		toggleBGM("/sounds/brickblast/background.mp3", 0.25, nextMutedState);
	};

	return (
		<MenuButton
			position={[buttonX, 60, 5]}
			size={10}
			// Swap the image based on state (make sure you have these images!)
			imageSrc={isMuted ? "/img/brickblast/music_off.png" : "/img/brickblast/music_on.png"}
			musicSrc={"/sounds/brickblast/nice.mp3"}
			color="none"
			hoverTint="#44ff44"
			onClick={handleToggle}
		/>
	);
};

export const RestartButton = () => {

	const { size } = useThree();
	const isPortrait = size.width * ASPECT_COEFF < size.height;

	// Shift the button above the grid instead of the far-right corner in portrait
	const buttonX = isPortrait ? 15 : 70;

	const handleRestart = () => {
		useGameStore.setState({
			score: 0,
			grid: Array(9).fill(0).map(() => Array(9).fill(0)),
			isGameOver: false,
			hoverCoords: null,
			hoveredMeshes: [],
			activePiece: null,
			isValidDrop: false,
			nextPieces: [],
		});
	};

	return (
		<MenuButton
			position={[buttonX, 60, 5]}
			size={10}
			// Swap the image based on state (make sure you have these images!)
			imageSrc={"/img/brickblast/replay.png"}
			musicSrc={"/sounds/brickblast/nice.mp3"}
			color="none"
			hoverTint="red"
			onClick={handleRestart}
		/>
	);
};