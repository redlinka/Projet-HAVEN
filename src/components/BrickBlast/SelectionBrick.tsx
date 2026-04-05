import { useEffect, useMemo, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import {ASPECT_COEFF, CELL_SIZE, checkGameOver, clearFullLines, COLORS, getRandomColor} from "./logic.ts";
import { getRandomPiece } from "./Shapes.ts";
import { useGameStore } from "./Store.ts";
import { BrickUnit } from "./BrickUnit.tsx";
import { rotateShape } from "./logic.ts";
import {playSFX} from "./audio.ts";

// Constants
const SCALE_NORMAL = new THREE.Vector3(1, 1, 1);
const SCALE_POP = new THREE.Vector3(1.5, 1.5, 2);
const SCALE_FACTOR = 2;
const SELECTION_SIZE = CELL_SIZE / SCALE_FACTOR;
const SCALE_BIG = SCALE_NORMAL.clone().multiplyScalar(SCALE_FACTOR);
const LERP_ALPHA = 0.15;

const getInitialPositions = (isPortrait: boolean) => {
    const z = Math.ceil(SELECTION_SIZE / SCALE_FACTOR) + 1;
    if (isPortrait) {
        // Portrait Mode: Spaced horizontally under the grid (Centered around X = -30)
        return [
            new THREE.Vector3(-65, -75, z),
            new THREE.Vector3(-30, -75, z),
            new THREE.Vector3(5, -75, z),
        ];
    }
    // Landscape Mode: Spaced vertically to the right of the grid
    return [
        new THREE.Vector3(55, 30, z),
        new THREE.Vector3(55, 0, z),
        new THREE.Vector3(55, -30, z),
    ];
};

// brick component representing the pieces in the selection area
export const SelectionBrick = ({
                                   initialPosition,
                                   onHover,
                                   color,
                                   shape,
                                   nextPieceIndex,
                               }: {
    initialPosition: THREE.Vector3;
    onHover: (ref: THREE.Mesh[] | null) => void;
    color: string;
    shape: number[][];
    nextPieceIndex: number;
}) => {

    const isDragged = useRef(false);
    const isPoppingIn = useRef(true);
    const isConsumed = useRef(false);

    //grab actions from the Zustand
    const isDraggingGlobal = useGameStore((state) => state.isDraggingGlobal);
    const setIsDraggingGlobal = useGameStore((state) => state.setIsDraggingGlobal);
    const setActivePiece = useGameStore((state) => state.setActivePiece);
    const setNextPieces = useGameStore((state) => state.setNextPieces);

    const currentShape = useRef<number[][]>(shape);

    //outline-relative variables
    const groupRef = useRef<THREE.Group>(null!);
    const meshRefs = useRef<THREE.Mesh[]>([]);
    const collectMesh = (m: THREE.Mesh | null) => {
        if (m && !meshRefs.current.includes(m)) meshRefs.current.push(m);
    };

    //variables relative to camera movement
    const { raycaster, camera, pointer } = useThree();
    const plane = useRef(new THREE.Plane(new THREE.Vector3(0, 0, 15), 0));
    const targetPoint = useRef(new THREE.Vector3());

    const pointerDownTime = useRef(0);
    const rotationStep = useRef(0);

    // Invisible bounding-box mesh used as a uniform pointer hit-area
    const computeBbox = (s: number[][]) => {
        const cols = s.map(([c]) => c);
        const rows = s.map(([, r]) => r);
        const minCol = Math.min(...cols), maxCol = Math.max(...cols);
        const minRow = Math.min(...rows), maxRow = Math.max(...rows);

        return {
            w: (maxCol - minCol + 1) * SELECTION_SIZE,
            h: (maxRow - minRow + 1) * SELECTION_SIZE,
            cx: ((maxCol + minCol) / 2) * SELECTION_SIZE,
            cy: ((maxRow + minRow) / 2) * SELECTION_SIZE,
        };
    };

    const bbox = computeBbox(shape);

    useFrame(() => {
        if (!groupRef.current || isConsumed.current) return;

        if (isDragged.current) {

            const isValidDrop = useGameStore.getState().isValidDrop;
            groupRef.current.visible = !isValidDrop;

            //moving and scaling the brick according to the casted ray
            raycaster.setFromCamera(pointer, camera);
            raycaster.ray.intersectPlane(plane.current, targetPoint.current);
            groupRef.current.position.x = targetPoint.current.x;
            groupRef.current.position.y = targetPoint.current.y;
            groupRef.current.position.z = THREE.MathUtils.lerp(
                groupRef.current.position.z,
                (SELECTION_SIZE/SCALE_FACTOR)+1, LERP_ALPHA
            );
            groupRef.current.scale.lerp(SCALE_BIG, LERP_ALPHA);
        } else {
            //automatic callback to initial spot
            if (isPoppingIn.current) {
                // Lerp fast towards SCALE_POP
                groupRef.current.scale.lerp(SCALE_POP, LERP_ALPHA);

                // Once we hit the peak, turn off the pop-in phase
                if (groupRef.current.scale.x > 1.4) {
                    isPoppingIn.current = false;
                }
            } else {
                // Smoothly settle back down to SCALE_NORMAL
                groupRef.current.scale.lerp(SCALE_NORMAL, LERP_ALPHA);
            }

            groupRef.current.position.z = THREE.MathUtils.lerp(
                groupRef.current.position.z,
                Math.ceil(SELECTION_SIZE / SCALE_FACTOR) + 1, LERP_ALPHA
            );
            groupRef.current.position.lerp(initialPosition, 0.1);
            groupRef.current.visible = true;
        }
    });

    const rotationHandler = () => {
        currentShape.current = rotateShape(currentShape.current);
        rotationStep.current = (rotationStep.current + 1) % 4;
        groupRef.current.rotation.z = rotationStep.current * (Math.PI / 2);
    };

    useEffect(() => {
        if (groupRef.current) groupRef.current.scale.set(0, 0, 0);
    }, []);

    // Reset state if React reuses this component for a new piece
    // (e.g. same slot/color/shape key collision on refill).
    useEffect(() => {
        isConsumed.current = false;
        isPoppingIn.current = true;
        isDragged.current = false;
        rotationStep.current = 0;
        currentShape.current = shape;
        if (groupRef.current) {
            groupRef.current.scale.set(0, 0, 0);
            groupRef.current.rotation.z = 0;
            groupRef.current.visible = true;
        }
    }, [color, shape]);

    return (
        <group
            ref={groupRef}
            position={[initialPosition.x, initialPosition.y, initialPosition.z]}

            onPointerDown={(e) => {
                e.stopPropagation();
                (e.target as Element).setPointerCapture(e.pointerId);
                playSFX(`${import.meta.env.BASE_URL}sounds/brickblast/pop.wav`, 0.5);
                isDragged.current = true;
                isPoppingIn.current = false;
                pointerDownTime.current = Date.now();
                setIsDraggingGlobal(true);
                setActivePiece({ shape: currentShape.current, color: color });
            }}

            onPointerUp={(e) => {
                const store = useGameStore.getState();
                const dropValid = store.isValidDrop;
                const dropCoords = store.hoverCoords;

                e.stopPropagation();
                (e.target as Element).releasePointerCapture(e.pointerId);

                if (dropValid && dropCoords) {

                    playSFX(`${import.meta.env.BASE_URL}sounds/brickblast/pop.wav`, 0.5);

                    const colorIndex = Number(Object.keys(COLORS).find(
                        key => COLORS[Number(key) as keyof typeof COLORS] === color
                    ));

                    // 1. Stamp the grid
                    store.placePiece(currentShape.current, dropCoords.x, dropCoords.y, colorIndex);

                    // 2. Clear any full lines
                    const newBoard = clearFullLines(useGameStore.getState().grid);
                    store.setGrid(newBoard);

                    isConsumed.current = true;
                    groupRef.current.visible = false;

                    // 4. Update the store to mark THIS piece's slot as empty
                    const currentPieces =
                        useGameStore.getState().nextPieces;
                    const updatedPieces = [...currentPieces];
                    updatedPieces[nextPieceIndex] = null;

                    let piecesToCheck = updatedPieces;

                    // 5. If all 3 slots are empty, fetch a brand new batch
                    if (updatedPieces.every(p => p === null)) {
                        const newBatch = Array.from({ length: 3 }).map(() => ({
                            color: getRandomColor(),
                            shape: getRandomPiece(),
                        }));
                        setNextPieces(newBatch);
                        piecesToCheck = newBatch;
                    } else {
                        setNextPieces(updatedPieces);
                    }

                    // 6. Run the Game Over check
                    const latestGrid = useGameStore.getState().grid;
                    const isOver = checkGameOver(latestGrid, piecesToCheck);

                    if (isOver) {
                        playSFX(`${import.meta.env.BASE_URL}sounds/brickblast/game_over_2.mp3`, 0.5);
                        store.setIsGameOver(true);
                        console.log("GAME OVER");
                    }

                } else {
                    if (Date.now() - pointerDownTime.current < 200) rotationHandler();
                }

                isDragged.current = false;
                setIsDraggingGlobal(false);
                setActivePiece(null);
                store.setIsValidDrop(false);
                store.setHoveredMeshes([]);
            }}

            onPointerCancel={(e) => {
                e.stopPropagation();
                try {
                    (e.target as Element).releasePointerCapture(e.pointerId);
                } catch (err) {
                    //ignore
                }
                isDragged.current = false;
                setIsDraggingGlobal(false);
                setActivePiece(null);
                useGameStore.getState().setIsValidDrop(false);
                useGameStore.getState().setHoveredMeshes([]);
            }}

            onPointerEnter={() => {
                if (!isDraggingGlobal) onHover(meshRefs.current);
            }}

            onPointerLeave={() => {
                if (!isDraggingGlobal) onHover(null);
            }}
        >
            {/* Transparent hit-area so hover/drag is uniform across the whole piece */}
            <mesh position={[bbox.cx, bbox.cy, 0]}>
                <planeGeometry args={[bbox.w, bbox.h]} />
                <meshBasicMaterial transparent opacity={0} depthWrite={false} />
            </mesh>

            {shape.map(([col, row], i) => (
                <group key={i} position={[col * SELECTION_SIZE, -row * SELECTION_SIZE, 0]}>
                    <BrickUnit color={color} refCallback={collectMesh} isSmall={true} />
                </group>
            ))}
        </group>
    );
};

export default function BlocksGeneration() {

    const setHoveredMeshes = useGameStore((state) => state.setHoveredMeshes);
    const nextPieces = useGameStore((state) => state.nextPieces);
    const setNextPieces = useGameStore((state) => state.setNextPieces);

    const { size } = useThree();
    const isPortrait = size.width * ASPECT_COEFF < size.height;
    const positions = getInitialPositions(isPortrait);

    useMemo(() => {
        if (nextPieces.length === 0) {
            const initialPieces = Array.from({ length: 3 }).map(() => ({
                color: getRandomColor(),
                shape: getRandomPiece(),
            }));
            setNextPieces(initialPieces);
        }
    }, [nextPieces.length, setNextPieces]);

    return (
        <>
            {positions.map((pos, i) => {
                const piece = nextPieces[i];
                if (!piece) return null;

                const uniqueKey = `piece-${i}-${piece.color}-${JSON.stringify(piece.shape)}`;

                return (
                    <SelectionBrick
                        key={uniqueKey}
                        initialPosition={pos}
                        onHover={setHoveredMeshes}
                        color={piece.color}
                        shape={piece.shape}
                        nextPieceIndex={i}
                    />
                );
            })}
        </>
    );
}