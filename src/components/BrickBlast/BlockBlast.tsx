import {Canvas} from "@react-three/fiber"
import {Suspense} from "react";
import {Background, BlockHolder, CameraController, Grid, Score} from "./SceneElements.tsx";


export const BlockScene = () => {
    return (
        <div style={{ width: "100%", height: "100%" }}>
            <Canvas style={{ width: "100%", height: "100%" }} camera={{ fov:45, near: 0.1, far: 2000, position: [60, 200, 15]}}>
                <CameraController />
                <Suspense fallback={null}>
                    <Score />
                    <Grid />
                    <BlockHolder />
                    <Background />
                </Suspense>
            </Canvas>
        </div>
    )
}
export default BlockScene;