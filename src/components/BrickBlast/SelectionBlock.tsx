import { useMemo, useRef, useState } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import {CELL_SIZE, COLORS, getRandomColor} from "./logic.ts";
import { getRandomPiece } from "./Pieces.ts";
import { useGameStore } from "./Store.ts";
import { BrickUnit } from "./BrickUnit.tsx";
import { rotateShape } from "./logic.ts";

// Constants ------------------------------------------------
const SCALE_FACTOR = 2;
const SELECTION_SIZE = CELL_SIZE / SCALE_FACTOR;
const SCALE_NORMAL = new THREE.Vector3(1, 1, 1);
const SCALE_BIG = SCALE_NORMAL.clone().multiplyScalar(SCALE_FACTOR);
const LERP_ALPHA = 0.15;

const INITIAL_POSITIONS = [
    new THREE.Vector3(55, 30, Math.ceil(SELECTION_SIZE / SCALE_FACTOR) + 1),
    new THREE.Vector3(55, 0, Math.ceil(SELECTION_SIZE / SCALE_FACTOR) + 1),
    new THREE.Vector3(55, -30, Math.ceil(SELECTION_SIZE / SCALE_FACTOR) + 1),
];


// brick component ------------------------------------------------
export const SelectionBlock = ({
    initialPosition,
    onHover,
    color,
    shape,
}: {
    initialPosition: THREE.Vector3;
    onHover: (ref: THREE.Mesh[] | null) => void;
    color: string;
    shape: number[][];
}) => {
    //grab actions from the Zustand
    const [isDragged, setIsDragged] = useState(false);
    const isDraggingGlobal = useGameStore((state) => state.isDraggingGlobal);
    const setIsDraggingGlobal = useGameStore((state) => state.setIsDraggingGlobal);
    const setActivePiece = useGameStore((state) => state.setActivePiece);

    const [localColor, setLocalColor] = useState(color);
    const [localShape, setLocalShape] = useState(shape);
    const currentShape = useRef<number[][]>(shape);

    const groupRef = useRef<THREE.Group>(null!);
    const meshRefs = useRef<THREE.Mesh[]>([]); // for outline effect
    const collectMesh = (m: THREE.Mesh | null) => {
      if (m && !meshRefs.current.includes(m)) meshRefs.current.push(m);
    };
    const pointerDownTime = useRef(0);
    const rotationStep = useRef(0);

    const { raycaster, camera, pointer } = useThree();
    const plane = useRef(new THREE.Plane(new THREE.Vector3(0, 0, 15), 0));
    const targetPoint = useRef(new THREE.Vector3());

    // Invisible bounding-box mesh used as a uniform pointer hit-area
    const computeBbox = (s: number[][]) => {
        const cols = s.map(([c]) => c);
        const rows = s.map(([, r]) => r);
        const minCol = Math.min(...cols),
        maxCol = Math.max(...cols);

        const minRow = Math.min(...rows), maxRow = Math.max(...rows);
        return {
            w: (maxCol - minCol + 1) * SELECTION_SIZE,
            h: (maxRow - minRow + 1) * SELECTION_SIZE,
            cx: ((maxCol + minCol) / 2) * SELECTION_SIZE,
            cy: ((maxRow + minRow) / 2) * SELECTION_SIZE,
        };
    };

    // replacing shape by ref because it is mutable
    const bbox = computeBbox(localShape);

    useFrame(() => {
        if (!groupRef.current) return;

        if (isDragged) {
            const isValidDrop = useGameStore.getState().isValidDrop;
            groupRef.current.visible = !isValidDrop;
            raycaster.setFromCamera(pointer, camera);
            raycaster.ray.intersectPlane(plane.current, targetPoint.current);
            groupRef.current.position.x = targetPoint.current.x;
            groupRef.current.position.y = targetPoint.current.y;
            groupRef.current.position.z = THREE.MathUtils.lerp(
            groupRef.current.position.z, (SELECTION_SIZE/SCALE_FACTOR)+1, LERP_ALPHA);
            groupRef.current.scale.lerp(SCALE_BIG, LERP_ALPHA);
        } else {
            groupRef.current.visible = true;
            groupRef.current.scale.lerp(SCALE_NORMAL, LERP_ALPHA);
            groupRef.current.position.z = THREE.MathUtils.lerp(
            groupRef.current.position.z,
            Math.ceil(SELECTION_SIZE / SCALE_FACTOR) + 1, LERP_ALPHA);
            groupRef.current.position.lerp(initialPosition, 0.1);
        }
    });

    const rotationHandler = () => {
        // rotate the shape data
        currentShape.current = rotateShape(currentShape.current);
        // rotate the mesh visually
        rotationStep.current = (rotationStep.current + 1) % 4;
        groupRef.current.rotation.z = rotationStep.current * (Math.PI / 2);
        // console log to verify that the shape data is rotating correctly and in sync with the visual rotation
        // console.log("step de rotation:", rotationStep.current);
        // console.log("shape après rotation:", currentShape.current);
    };

    return (
        <group
            ref={groupRef}
            position={[initialPosition.x, initialPosition.y, initialPosition.z]}

            onPointerDown={(e) => {
                e.stopPropagation();
                (e.target as Element).setPointerCapture(e.pointerId);
                setIsDragged(true);
                pointerDownTime.current = Date.now();
                setIsDraggingGlobal(true);
                setActivePiece({ shape: currentShape.current, color: localColor });
            }}

            onPointerUp={(e) => {
                e.stopPropagation();
                (e.target as Element).releasePointerCapture(e.pointerId);
                setIsDragged(false);

                const store = useGameStore.getState();

                if (store.isValidDrop && store.hoverCoords) {

                    const colorIndex = Number(Object.keys(COLORS).find(
                        key => COLORS[Number(key) as keyof typeof COLORS] === localColor
                    ));
                    
                    store.placePiece(currentShape.current, store.hoverCoords.x, store.hoverCoords.y, colorIndex);

                    const newShape = getRandomPiece();
                    const newColor = getRandomColor();

                    setLocalShape(newShape);
                    setLocalColor(newColor);
                    currentShape.current = newShape;

                    rotationStep.current = 0;
                    groupRef.current.rotation.z = 0;
                    groupRef.current.position.copy(initialPosition);
                } else {
                    // Only rotate if we didn't just drop it
                    if (Date.now() - pointerDownTime.current < 200) rotationHandler();
                }

                setIsDraggingGlobal(false);
                setActivePiece(null);
                store.setIsValidDrop(false); // Reset the flag
            }}

            onPointerEnter={() => {
                if (!isDraggingGlobal) onHover(meshRefs.current);
            }}
        >
            {/* Transparent hit-area so hover/drag is uniform across the whole piece */}
            <mesh position={[bbox.cx, bbox.cy, 0]}>
                <planeGeometry args={[bbox.w, bbox.h]} />
                <meshBasicMaterial transparent opacity={0} depthWrite={false} />
            </mesh>

            {localShape.map(([col, row], i) => (
                <group key={i} position={[col * SELECTION_SIZE, -row * SELECTION_SIZE, 0]}>
                    <BrickUnit color={localColor} refCallback={collectMesh} isSmall={true} />
                </group>
            ))}
      </group>
    );
};

export default function BlocksGeneration() {

    const setHoveredMeshes = useGameStore((state) => state.setHoveredMeshes);

  // save color for each pos bcause it changes if we dont do that.
  const configs = useMemo(
      () =>
          INITIAL_POSITIONS.map(() => ({
              color: getRandomColor(),
              shape: getRandomPiece(),
          })),
      [],
  );

  return (
    <>
      {INITIAL_POSITIONS.map((pos, i) => (
        <SelectionBlock
          key={i}
          initialPosition={pos}
          onHover={setHoveredMeshes}
          color={configs[i].color}
          shape={configs[i].shape}
        />
      ))}
    </>
  );
}
