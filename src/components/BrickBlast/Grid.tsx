import {useLoader} from "@react-three/fiber";
import * as THREE from "three";
import {useGameStore} from "./Store.ts";
import {Edges} from "@react-three/drei";
import {GRID_WORLD_X, GRID_WORLD_Y} from "./logic.ts";

export const Grid = () => {
    const texture = useLoader(
        THREE.TextureLoader,
        "/img/brickblast/grid_asset3.png",
    );

    return (
        <>
            <ambientLight intensity={6}/>
            <mesh
                position={[GRID_WORLD_X, GRID_WORLD_Y, 1]}
                onPointerMove={(e) => {

                    let gridX = Math.floor(e.uv!.x * 9);

                    // Invert Y mapping so 0 is top
                    let gridY = Math.floor((1 - e.uv!.y) * 9);

                    // Safety clamp just in case the mouse hits the exact microscopic edge (1.0)
                    gridX = Math.max(0, Math.min(8, gridX));
                    gridY = Math.max(0, Math.min(8, gridY));

                    useGameStore.setState({
                        hoverCoords: { x: gridX, y: gridY }
                    });
                }}

                onPointerOut={() => {
                    useGameStore.setState({ hoverCoords: null });
                }}
            >
                <Edges lineWidth={10} color="white"/>
                <planeGeometry args={[100, 100]}/>
                <meshStandardMaterial map={texture}/>
            </mesh>
        </>
    );
};