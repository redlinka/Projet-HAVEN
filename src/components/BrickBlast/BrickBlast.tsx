import { Canvas, useFrame } from "@react-three/fiber";
import { Suspense, useEffect, useRef, useState } from "react";
import {
    Background,
    BlockHolder,
    CameraController,
    Score,
    GameOverScreen,
    TopBarControls,
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
import * as THREE from "three";
import {stopBGM, toggleBGM} from "./audio.ts";
import { useRoom } from "../../contexts/RoomContext.tsx";

// manager of all postprocessing effects
const GlobalEffects = () => {
  const hoveredMeshes = useGameStore((state) => state.hoveredMeshes);
  const isGameOver = useGameStore((state) => state.isGameOver);
  const [pixelSize, setPixelSize] = useState(4);
  const floatSize = useRef(4);

  useFrame(() => {
    const target = isGameOver ? 13 : 4;
    if (Math.abs(floatSize.current - target) > 0.1) {
      floatSize.current = THREE.MathUtils.lerp(
        floatSize.current,
        target,
        0.04, // Speed of the lerp
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
      <Scanline opacity={0.2} density={10} />
    </EffectComposer>
  );
};

//main scene
export const Scene = () => {
  const { setIsCanvasReady, canvasRefs } = useRoom();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
      toggleBGM(`${import.meta.env.BASE_URL}sounds/brickblast/background.mp3`, 0.25);

    const resetState = {
      score: 0,
      grid: Array(9).fill(0).map(() => Array(9).fill(0)),
      isGameOver: false,
      hoverCoords: null,
      hoveredMeshes: [],
      activePiece: null,
      isValidDrop: false,
      nextPieces: [],
    };

    const handleBeforeUnload = () => {
      if (useGameStore.getState().isGameOver) {
        useGameStore.setState(resetState);
      }
    };

    window.addEventListener("beforeunload", handleBeforeUnload);

    return () => {
      stopBGM();
      window.removeEventListener("beforeunload", handleBeforeUnload);
      useGameStore.setState(resetState);
    };
  }, []);

  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        overflow: "hidden",
        touchAction: "none",
      }}
    >
      <Canvas
        style={{ touchAction: "none" }}
        ref={canvasRef}
        onCreated={({ gl }) => {
          canvasRefs.current = [gl.domElement];
          setIsCanvasReady(true);
        }}
        camera={{ fov: 80, near: 0.1, far: 1000, position: [0, -400, 100] }}
      >
              <CameraController />
              <Suspense fallback={null}>
                  <GameOverScreen />
                  <Score />
                  <TopBarControls />
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
