import {Canvas, useFrame} from "@react-three/fiber";
import {Suspense, useRef, useState} from "react";
import {
	Background,
	BlockHolder,
	CameraController,
	RestartButton,
	Score,
	GameOverScreen,
} from "./SceneElements.tsx";
import BlocksGeneration from "./SelectionBrick.tsx";
import { Grid } from "./Grid.tsx";
import {
	EffectComposer,
	Outline,
	Pixelation,
	Scanline,
} from "@react-three/postprocessing";
import { BlendFunction } from "postprocessing";
import { useGameStore } from "./Store.ts";
import { GridRenderer } from "./GridRenderer.tsx";
import { GhostPreview } from "./GhostPreview.tsx";
import { Stats } from "@react-three/drei";
import * as THREE from "three";

// manager of all postprocessing effects
const GlobalEffects = () => {

	const hoveredMeshes = useGameStore((state) => state.hoveredMeshes);
	const isGameOver = useGameStore((state) => state.isGameOver);
	const [pixelSize, setPixelSize] = useState(3);
	const floatSize = useRef(3);

	useFrame(() => {
		const target = isGameOver ? 15 : 3;
		if (Math.abs(floatSize.current - target) > 0.1) {
			floatSize.current = THREE.MathUtils.lerp(
				floatSize.current,
				target,
				0.04 // Speed of the lerp
			);
			const rounded = Math.round(floatSize.current);
			if (rounded !== pixelSize) {
				setPixelSize(rounded);
			}
		}
	});

	return (
		<EffectComposer autoClear={false}>
			<Outline
				selection={hoveredMeshes}
				blendFunction={BlendFunction.ALPHA}
				xRay={false}
				edgeStrength={1000}
				blur={true}
				kernelSize={1}
			/>
			<Pixelation granularity={pixelSize} />
			<Scanline opacity={0.4} density={10} />
		</EffectComposer>
	);
};

//main scene
export const Scene = () => {

	return (
		<div style={{ width: "100%", height: "100%" }}>
			<Canvas
				camera={{ fov: 80, near: 0.1, far: 1000, position: [0, -500, 100] }}
			>
				<Stats />
				<CameraController />
				<Suspense fallback={null}>
					<GameOverScreen />
					<Score />
					<RestartButton />
					<Grid /> <GridRenderer /> <GhostPreview />
					<BlockHolder />
					<BlocksGeneration />
					<Background />
					<GlobalEffects />
				</Suspense>
			</Canvas>
		</div>
	);
};
export default Scene;
