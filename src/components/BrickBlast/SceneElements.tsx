import { useFrame, useLoader } from "@react-three/fiber";
import { Line, Text } from "@react-three/drei";
import * as THREE from "three";
import Silkscreen from "/src/assets/fonts/Silkscreen.ttf";
import { Block } from "./Block.tsx";

export const CameraController = () => {
  useFrame((state) => {
    state.camera.lookAt(state.pointer.x / 3 + 60, 0, state.pointer.y * 2 + 5);
  });
  return null;
};

export const Grid = () => {
  const texture = useLoader(THREE.TextureLoader, "/src/assets/grid_asset3.png");
  return (
    <>
      <ambientLight color="#ffffff" intensity={6} position={[60, 40, 0]} />
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 1, 0]}>
        <planeGeometry args={[100, 100]} />
        <meshStandardMaterial map={texture} />
      </mesh>
    </>
  );
};

export const Background = () => {
  return (
    <>
      <pointLight
        color="#ffffff"
        decay={2}
        intensity={10000}
        position={[60, 40, 0]}
      />
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]}>
        <planeGeometry args={[1000, 1000]} />
        <meshStandardMaterial color="#000022" />
      </mesh>
    </>
  );
};

export const Score = () => {
  return (
    <Text
      fontSize={10}
      font={Silkscreen}
      rotation={[-Math.PI / 2, 0, 0]}
      position={[110, 5, -50]}
    >
      Score : 4005
    </Text>
  );
};

export const BlockHolder = () => {
  return (
    <group>
      {/* Offset block group to frame's origin, centered in the 100x90 space */}
      <group position={[60 + (100 - 9) / 2, 2, -40 + (90 - 9) / 2]}>
        <Block blockSize={5} />
      </group>
      <Line
        points={[
          [60, 2, -40],
          [60, 2, 50],
          [160, 2, 50],
          [160, 2, -40],
          [60, 2, -40],
        ]}
        color="#ffffff"
        lineWidth={2}
      />
    </group>
  );
};
