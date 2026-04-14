import { Edges, Outlines } from "@react-three/drei";
import * as THREE from "three";
import { CELL_SIZE, darkenColor } from "./logic.ts";

interface LegoBrickProps {
	color: string;
	refCallback?: (m: THREE.Mesh | null) => void;
	isSmall?: boolean;
	opacity?: number;
}

export const BrickUnit = ({
	color,
	refCallback,
	isSmall = false,
	opacity = 1,
}: LegoBrickProps) => {
	const BRICK_SIZE = isSmall ? CELL_SIZE / 2 : CELL_SIZE;
	const BRICK_H = BRICK_SIZE * 0.6;
	const STUD_R = BRICK_SIZE * 0.3;
	const STUD_H = BRICK_SIZE * 0.1;

	const isGhost = opacity < 1;

	return (
		<>
			{/* Brick body */}
			<mesh ref={refCallback} position={[0, 0, BRICK_H / 2]}>
				<boxGeometry args={[BRICK_SIZE, BRICK_SIZE, BRICK_H]} />
				<meshStandardMaterial
					color={color}
					transparent={isGhost}
					opacity={opacity}
				/>
			</mesh>

			{/* The stud on top */}
			<mesh
				ref={refCallback}
				position={[0, 0, BRICK_H + STUD_H / 2]}
				rotation={[Math.PI / 2, 0, 0]}
			>
				<Outlines thickness={5} color={darkenColor(color, 4)} />
				<Edges lineWidth={5} color={darkenColor(color, 0.8)} threshold={90} />
				<cylinderGeometry args={[STUD_R, STUD_R, STUD_H, 16]} />
				<meshStandardMaterial
					color={color}
					transparent={isGhost}
					opacity={opacity}
				/>
			</mesh>
		</>
	);
};
