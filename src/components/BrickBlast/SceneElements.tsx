import { useFrame, useLoader, useThree } from "@react-three/fiber";
import { Edges, Line, Text } from "@react-three/drei";
import * as THREE from "three";
import { useRef, useState } from "react";
import { useGameStore } from "./Store.ts";

export const CameraController = () => {
	const { size } = useThree();
	const ASPECT = size.width / size.height;
	const FACTOR = 3.5;

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

export const RestartButton = () => {
	const [hovered, setHovered] = useState(false);

    const handleRestart = () => {
        // Forcefully reset the global state without needing a custom action
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

    const texture = useLoader(
        THREE.TextureLoader,
        "/img/brickblast/replay.png",
    );

    return (
        <group
            position={[70, 60, 5]} // Top left corner
            onClick={(e) => {
                e.stopPropagation();
                handleRestart();
            }}
            onPointerEnter={(e) => {
                e.stopPropagation();
                setHovered(true);
                document.body.style.cursor = "pointer";
            }}
            onPointerLeave={(e) => {
                e.stopPropagation();
                setHovered(false);
                document.body.style.cursor = "default";
            }}
        >

            <mesh>
                <planeGeometry args={[7, 7]} />
                <meshStandardMaterial color={hovered ? "#ff4444" : "#ffffff"} map={texture}/>
                <Edges color={hovered ? "#ff4444" : "#ffffff"} lineWidth={3} scale={new THREE.Vector3( 1.5, 1.5, 1.5 )}/>
            </mesh>
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

			<MenuButton position={[-25, -15, 0]} size={22} imageSrc="/img/brickblast/replay.png" onClick={handleRetry} color="none" />
			<MenuButton position={[25, -15, 0]} size={25} imageSrc="/img/brickblast/exit.png" onClick={handleQuit} color="none" />
		</group>
	);
};

// A reusable 3D interactive button just for the Menu
const MenuButton = ({
						position,
						size,
						imageSrc,
						color,
						hoverTint = "red",
						onClick
					}: {
	position: [number, number, number],
	size: number,
	imageSrc: string,
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
			onClick={(e) => { e.stopPropagation(); onClick(); }}
			onPointerEnter={(e) => { e.stopPropagation(); setHovered(true); document.body.style.cursor = "pointer"; }}
			onPointerLeave={(e) => { e.stopPropagation(); setHovered(false); document.body.style.cursor = "default"; }}
		>
			{/* Optional Background Plane */}
			{!isTransparent && (
				<mesh position={[0, 0, -0.1]}>
					<planeGeometry args={[size, size]} />
					<meshStandardMaterial color={hovered ? color : "#222222"} />
					<Edges color={hovered ? "white" : color} lineWidth={5} />
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
