import { useLoader } from "@react-three/fiber";
import * as THREE from "three";
import { useGameStore } from "./Store.ts";
import { Edges } from "@react-three/drei";
import { GRID_WORLD_X, GRID_WORLD_Y } from "./logic.ts";

export const Grid = () => {
	//We load the grid texture from the images folder
	const texture = useLoader(
		THREE.TextureLoader,
		`${import.meta.env.BASE_URL}img/brickblast/grid_asset3.png`,
	);

	return (
		<>
			{/* Some lighting to make the grid brighter */}
			<ambientLight intensity={6} />
			<mesh
				position={[GRID_WORLD_X, GRID_WORLD_Y, 1]}
				onPointerMove={(e) => {
					let gridX = Math.floor(e.uv!.x * 9);
					// Invert Y mapping so 0 is top (coherence with zustand array grid)
					let gridY = Math.floor((1 - e.uv!.y) * 9);

					// Safety clamp just in case the mouse hits the exact microscopic edge (1.0)
					gridX = Math.max(0, Math.min(8, gridX));
					gridY = Math.max(0, Math.min(8, gridY));

					// we update the coords in real time
					useGameStore.setState({
						hoverCoords: { x: gridX, y: gridY },
					});
				}}
				onPointerOut={() => {
					useGameStore.setState({ hoverCoords: null });
				}}
			>
				<Edges lineWidth={10} color="white" />
				<planeGeometry args={[100, 100]} />
				<meshStandardMaterial map={texture} />
			</mesh>
		</>
	);
};
