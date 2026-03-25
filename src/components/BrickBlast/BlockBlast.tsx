import { Canvas } from "@react-three/fiber";
import { Suspense, useEffect, useState } from "react";
import {
  Background,
  BlockHolder,
  CameraController,
  Score,
} from "./SceneElements.tsx";
import BlocksGeneration from "./Block.tsx";
import {Grid} from "./Grid.tsx";
import {EffectComposer, Outline, Pixelation, Scanline} from "@react-three/postprocessing";
import {useGameStore} from "./Store.ts";

const GlobalEffects = () => {

  const hoveredMeshes = useGameStore((state) => state.hoveredMeshes);

  return (
      <EffectComposer autoClear={false}>
        <Outline
            selection={hoveredMeshes}
            edgeStrength={1000}
            blur={true}
            kernelSize={2}
        />
        <Pixelation granularity={3}/>
        <Scanline opacity={0.3} density={1}/>
      </EffectComposer>
  );
}

export const BlockScene = () => {
  const [fov, setFov] = useState(80);

  useEffect(() => {
    const update = () => {
      setFov(window.innerWidth < window.innerHeight ? 100 : 80);
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
        <CameraController />
        <Suspense fallback={null}>
          <Score />
          <Grid />
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
