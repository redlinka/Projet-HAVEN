import {type Explosion, useGameStore} from "./Store.ts";
import { COLORS, getWorldCoordsFromGrid } from "./logic.ts";
import { BrickUnit } from "./BrickUnit.tsx";
import {useEffect, useRef} from "react";
import {useFrame} from "@react-three/fiber";
import * as THREE from "three";

const ExplodingBrick = ({ explosion }: { explosion: Explosion }) => {
	const groupRef = useRef<THREE.Group>(null!);
	const removeExplosion = useGameStore(state => state.removeExplosion);
	const position = getWorldCoordsFromGrid(explosion.x, explosion.y);

	useFrame(() => {
		if (groupRef.current) {
			// Lerp the scale down to absolutely nothing
			groupRef.current.scale.lerp(new THREE.Vector3(0, 0, 0), 0.05);
			// Add a little spin for that dramatic collapse effect
			groupRef.current.rotation.z += 0.2;
			groupRef.current.position.z += 0.5
		}
	});

	useEffect(() => {
		// Kill the ghost entirely after 300ms
		const timer = setTimeout(() => {
			removeExplosion(explosion.id);
		}, 500);
		return () => clearTimeout(timer);
	}, []);

	return (
		<group ref={groupRef} position={[position.x, position.y, 1]}>
			<BrickUnit color={"white"} />
		</group>
	);
};


//will simply render the grid
export const GridRenderer = () => {
	// Grab the 2D array from your global backpack
	const board = useGameStore((state) => state.grid);
	const explosions = useGameStore((state) => state.explosions);

	return (
		<group>
			{board.map((row, y) =>
				row.map((cellValue, x) => {
					// If the cell is 0, render absolutely nothing
					if (cellValue === 0) return null;

					// Resolve the number to a hex color string
					const color = COLORS[cellValue as keyof typeof COLORS];

					// Translate the 2D array index (x,y) into 3D world space
					const position = getWorldCoordsFromGrid(x, y);

					return (
						<group
							key={`cell-${x}-${y}`}
							// Set the physical position in the 3D world
							position={[position.x, position.y, 1]}
						>
							<BrickUnit color={color} />
						</group>
					);
				}),
			)}

			{explosions.map(exp => (
				<ExplodingBrick key={exp.id} explosion={exp} />
			))}
		</group>
	);
};
