import {useFrame, useLoader} from "@react-three/fiber";
import * as THREE from 'three';

export const CameraController = () => {
    useFrame((state) => {
        state.camera.lookAt((state.pointer.x/5)+60, 0, (state.pointer.y/2)+5)
    });
    return null;
};

export const Grid = () => {
    const texture = useLoader(THREE.TextureLoader, 'src/assets/grid_asset.png')
    return (
        <mesh rotation={[-Math.PI/2, 0, 0]}>
            <planeGeometry args={[100, 100]}/>
            <meshBasicMaterial map={texture} />
        </mesh>
    )
}