import {useMemo, useRef, useState} from "react";
import {useFrame, useThree} from "@react-three/fiber";
import * as THREE from "three";
import {Edges} from "@react-three/drei";
import {CELL_SIZE} from "./logic.ts";
import {getRandomPiece} from "./Pieces.ts";
import {useGameStore} from "./Store.ts";

// Constants ------------------------------------------------
const BRICK_SIZE = CELL_SIZE/2
const BRICK_H = BRICK_SIZE * 0.6; // lego brick body height
const STUD_R = BRICK_SIZE * 0.3; // lego stud radius
const STUD_H = BRICK_SIZE * 0.1; // lego stud height
const GAP = 0; // gap between adjacent bricks

const SCALE_FACTOR = 2;
const SCALE_NORMAL = new THREE.Vector3(1, 1, 1);
const SCALE_BIG = SCALE_NORMAL.clone().multiplyScalar(SCALE_FACTOR);
const LERP_ALPHA = 0.15;

const INITIAL_POSITIONS = [
  new THREE.Vector3(55, 30, Math.ceil(BRICK_SIZE / SCALE_FACTOR) + 1),
  new THREE.Vector3(55, 0, Math.ceil(BRICK_SIZE / SCALE_FACTOR) + 1),
  new THREE.Vector3(55, -30, Math.ceil(BRICK_SIZE / SCALE_FACTOR) + 1),
];

// Colors ------------------------------------------------
const COLORS = ["red", "green", "blue", "yellow", "purple"];

const darkenColor = (hex: string, factor = 2): string => {
  const c = new THREE.Color(hex);
  c.multiplyScalar(factor);
  return "#" + c.getHexString();
};

const getRandomColor = () =>
    COLORS[Math.floor(Math.random() * COLORS.length)];


// brick component ------------------------------------------------
export const Block = ({
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
  const [isDragged, setIsDragged] = useState(false);

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
  const bbox = useMemo(() => {
    const cols = shape.map(([c]) => c);
    const rows = shape.map(([, r]) => r);
    const minCol = Math.min(...cols),
        maxCol = Math.max(...cols);
    const minRow = Math.min(...rows),
        maxRow = Math.max(...rows);
    return {
      w: (maxCol - minCol + 1) * BRICK_SIZE,
      h: (maxRow - minRow + 1) * BRICK_SIZE,
      cx: ((maxCol + minCol) / 2) * BRICK_SIZE,
      cy: ((maxRow + minRow) / 2) * BRICK_SIZE,
    };
  }, [shape]);

  useFrame(() => {
    if (!groupRef.current) return;

    if (isDragged) {
      raycaster.setFromCamera(pointer, camera);
      raycaster.ray.intersectPlane(plane.current, targetPoint.current);
      groupRef.current.position.x = targetPoint.current.x;
      groupRef.current.position.y = targetPoint.current.y;
      groupRef.current.position.z = THREE.MathUtils.lerp(
          groupRef.current.position.z,
          (BRICK_SIZE/2)+1,
          LERP_ALPHA,
      );
      groupRef.current.scale.lerp(SCALE_BIG, LERP_ALPHA);
    } else {
      groupRef.current.scale.lerp(SCALE_NORMAL, LERP_ALPHA);
      groupRef.current.position.z = THREE.MathUtils.lerp(
          groupRef.current.position.z,
          Math.ceil(BRICK_SIZE / SCALE_FACTOR) + 1,
          LERP_ALPHA,
      );
      groupRef.current.position.lerp(initialPosition, 0.1);
    }
  });

  const rotationHandler = () => {
    rotationStep.current = (rotationStep.current + 1) % 4;
    groupRef.current.rotation.z = rotationStep.current * (Math.PI / 2);
    console.log("rotate block", rotationStep.current);
  };

  return (
      <group
          ref={groupRef}
          position={[initialPosition.x, initialPosition.y, initialPosition.z]}
          // drag & drop + sinlge click for rotation
          onPointerUp={(e) => {
            e.stopPropagation(); // prevent every block from receiving the event and all rotating together it cause a block to call multiple times the rotation handler and it cause a bug where the block rotate twice instead of once.
            (e.target as Element).releasePointerCapture(e.pointerId);
            setIsDragged(false);
            if (Date.now() - pointerDownTime.current < 200) rotationHandler();
          }}
          onPointerDown={(e) => {
            e.stopPropagation();
            (e.target as Element).setPointerCapture(e.pointerId);
            setIsDragged(true);
            pointerDownTime.current = Date.now();
          }}
          // hover
          onPointerEnter={() => onHover(meshRefs.current)}
          onPointerLeave={() => onHover(null)}
      >
        {/* Transparent hit-area so hover/drag is uniform across the whole piece */}
        <mesh position={[bbox.cx, bbox.cy, 0]}>
          <planeGeometry args={[bbox.w, bbox.h]} />
          <meshBasicMaterial transparent opacity={0} depthWrite={false} />
        </mesh>

        {/* One Lego brick (body + stud) per shape cell */}
        {shape.map(([col, row], i) => (
            <group key={i} position={[col * BRICK_SIZE, row * BRICK_SIZE, 0]}>
              {/* Brick body */}
              <mesh ref={collectMesh} position={[0, 0, BRICK_H / 2]}>
                <Edges lineWidth={1} color={darkenColor(color, 0.8)} />
                <boxGeometry args={[BRICK_SIZE - GAP, BRICK_SIZE - GAP, BRICK_H]} />
                <meshStandardMaterial color={color} />
              </mesh>
              {/* the stud on top */}
              <mesh
                  ref={collectMesh}
                  position={[0, 0, BRICK_H + STUD_H / 2]}
                  rotation={[Math.PI / 2, 0, 0]}
              >
                <Edges lineWidth={5} color={darkenColor(color, 0.8)} threshold={90} />
                <cylinderGeometry args={[STUD_R, STUD_R, STUD_H, 16]} />
                <meshStandardMaterial color={color} />
              </mesh>
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
            <Block
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
