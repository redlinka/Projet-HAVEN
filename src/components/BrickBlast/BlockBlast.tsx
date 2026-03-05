import {Canvas} from "@react-three/fiber"
import {Suspense, useEffect, useRef, useState} from "react";
import {Background, Grid, BlockHolder, CameraController, Score} from "./SceneElements.tsx";
import {LegoBrick} from "./blocks.tsx";

export interface GameData {
    x: number;
    y: number;
}

export const BlockScene = () => {
    const [fov, setFov] = useState(80);
    const sharedData = useRef<GameData>({ x: 0, y: 0 });

    useEffect(() => {
        const update = () => {
            setFov(window.innerWidth < window.innerHeight ? 100 : 80);
        };
        update();
        window.addEventListener("resize", update);
        return () => window.removeEventListener("resize", update);
    }, []);

    return (
        <div style={{ width: "100vw", height: "100vh" }}>
            <Canvas camera={{ fov: fov, near: 0.1, far: 1000, position: [0, -15, 80]}}>
                <CameraController />
                <Suspense fallback={null}>
                    <Score data={sharedData} />
                    <Grid data={sharedData} />
                    <BlockHolder />
                    <LegoBrick />
                    <Background />
                </Suspense>
            </Canvas>
        </div>
    )
}
export default BlockScene;