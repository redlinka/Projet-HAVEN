import {useFrame, useThree} from "@react-three/fiber";
import {Line, Text} from "@react-three/drei";
import * as THREE from "three";
import {useRef} from "react";
import {useGameStore} from "./Store.ts";

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
        if (coords !== null) {
            scoreRef.current.text = "Coords: " + coords.x + ", " + coords.y;
        } else {
            scoreRef.current.text = "Coords: Void"; // Or whatever text you want
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
