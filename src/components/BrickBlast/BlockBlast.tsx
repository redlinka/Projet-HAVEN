import {Canvas} from "@react-three/fiber"
import {Suspense} from "react";
import {CameraController, Grid} from "./GameElements.tsx";


export const BlockScene = () => {
    return (
        <div style={{ width: "100vw", height: "100vh" }}>
            <Canvas camera={{ fov: 80, near: 0.1, far: 1000, position: [60, 75, 15]}}>
                <CameraController />
                <Suspense fallback={null}>
                    <Grid />
                </Suspense>
            </Canvas>
        </div>
    )
}
export default BlockScene;