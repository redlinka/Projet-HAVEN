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
                    useGameStore.setState({
                        hoverCoords: {
                            x: Math.floor(e.uv!.x * 9),
                            y: Math.floor(e.uv!.y * 9),
                        }
                    });
                }}
            >
                <Edges lineWidth={10} color="white"/>
                <planeGeometry args={[100, 100]}/>
                <meshStandardMaterial map={texture}/>
            </mesh>
        </>
    );
};