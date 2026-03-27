// LegoBrick.tsx
import {Edges, Outlines} from "@react-three/drei";
import * as THREE from "three";
import {CELL_SIZE, darkenColor} from "./logic.ts";

// Constants pulled from SelectionBlock.tsx
export const GAP = 0;

interface LegoBrickProps {
    color: string;
    refCallback?: (m: THREE.Mesh | null) => void;
    isSmall?: boolean;
}

export const BrickUnit = ({ color, refCallback, isSmall = false }: LegoBrickProps) => {
    const BRICK_SIZE = isSmall ? CELL_SIZE / 2 : CELL_SIZE;
    const BRICK_H = BRICK_SIZE * 0.6;
    const STUD_R = BRICK_SIZE * 0.3;
    const STUD_H = BRICK_SIZE * 0.1;
    return (
        <>
            {/* Brick body */}
            <mesh ref={refCallback} position={[0, 0, BRICK_H / 2]}>
                <Edges lineWidth={1} color={darkenColor(color, 0.8)} />
                <boxGeometry args={[BRICK_SIZE - GAP, BRICK_SIZE - GAP, BRICK_H]} />
                <meshStandardMaterial color={color} />
            </mesh>

            {/* The stud on top */}
            <mesh
                ref={refCallback}
                position={[0, 0, BRICK_H + STUD_H / 2]}
                rotation={[Math.PI / 2, 0, 0]}
            >
                <Edges lineWidth={5} color={darkenColor(color, 0.8)} threshold={90} />
                <Outlines thickness={5} color="black" />
                <cylinderGeometry args={[STUD_R, STUD_R, STUD_H, 16]} />
                <meshStandardMaterial color={color} />
            </mesh>
        </>
    );
};