import {useFrame, useThree , useLoader} from "@react-three/fiber";
import {Edges, Line, Text} from "@react-three/drei";
import * as THREE from "three";
import {useRef} from "react";
import type {RefObject} from 'react';
import type {GameData} from './BlockBlast.tsx';

export const CameraController = () => {
    const { size } = useThree();
    const ASPECT = size.width / size.height;
    const FACTOR = 1.5;

    useFrame((state) => {
        // Scale the lookAt target based on aspect ratio
        const xTarget = (state.pointer.x * ASPECT) * FACTOR;
        const yTarget = state.pointer.y * FACTOR
        state.camera.lookAt(xTarget, yTarget, 0);
    });
    return null;
};

export const Grid = ({ data }: { data: RefObject<GameData> }) => {
    const texture = useLoader(THREE.TextureLoader, "/img/brickblast/grid_asset3.png")

    return (
        <>
            <ambientLight intensity={6} />
            <mesh
                position={[-30, 0, 1]}
                onPointerMove={(e) => {
                    // Mapping 0-1 UV coordinates to a 0-100 scale
                    // eslint-disable-next-line react-hooks/immutability
                    data.current.x = Math.floor(e.uv!.x * 9);
                    data.current.y = Math.floor(e.uv!.y * 9);
                }}
            >
                <Edges lineWidth={10} color="white" />
                <planeGeometry args={[100, 100]}/>
                <meshStandardMaterial map={texture} />
            </mesh>
        </>
    )
}

export const Background = () => {
    return (
        <>
            <pointLight color="#ffffff" decay={2} intensity={10000} position={[0, 0, 50]} />
            <mesh rotation={[0, 0, 0]} position={[0, 0, 0]}>
                <planeGeometry args={[1000, 1000]}/>
                <meshStandardMaterial color="#000022" />
            </mesh>
        </>
    )
}

export const Score = ({ data }: { data: RefObject<GameData> }) => {
    const scoreRef = useRef<THREE.Mesh & { text: string }>(null!);

    useFrame(() => {
        if (scoreRef.current) {
            // Pull from shared data, push to Text component
            const { x, y } = data.current;
            scoreRef.current.text = "Coords: " + x + ", " + y;
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
    )
}

export const BlockHolder = () => {
    return (
        <group>
            <Line
                points={[
                    [30, 50, 1],
                    [30, -50, 1],
                    [80, -50, 1],
                    [80, 50, 1],
                    [30, 50, 1]
                ]}
                color="#ffffff"
                lineWidth={6}
            />
        </group>
    );
};
