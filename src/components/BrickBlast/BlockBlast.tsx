import { Canvas } from "@react-three/fiber";
import { Suspense, useEffect, useState } from "react";
import {
	Background,
	BlockHolder,
	CameraController,
	RestartButton,
	Score,
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

// manager of all postprocessing effects
const GlobalEffects = () => {
	const hoveredMeshes = useGameStore((state) => state.hoveredMeshes);

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
			<Pixelation granularity={3} />
			<Scanline opacity={0.3} density={1} />
		</EffectComposer>
	);
};

//main scene
export const BlockScene = () => {
	const [fov, setFov] = useState(80);

	useEffect(() => {
		const update = () => {
			setFov(80);
		};
		update();
		window.addEventListener("resize", update);
		return () => window.removeEventListener("resize", update);
	}, []);

	return (
		<div style={{ width: "100%", height: "100%" }}>
			<Canvas
				camera={{ fov: fov, near: 0.1, far: 1000, position: [0, -15, 100] }}
			>
				<Stats />
				<CameraController />
				<Suspense fallback={null}>
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
export default BlockScene;
