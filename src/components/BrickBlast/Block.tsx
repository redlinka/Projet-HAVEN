import { useMemo, useRef, useState } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import {
  EffectComposer,
  Outline,
  Pixelation,
  Scanline,
} from "@react-three/postprocessing";
import {Edges} from "@react-three/drei";


// colors for the blocks--------------------------------------------------
const COLORS = ["red", "green", "blue", "yellow", "purple"];

const darkenColor = (hex: string, factor = 0.7): string => {
    const c = new THREE.Color(hex);
    c.multiplyScalar(factor);
    return "#" + c.getHexString();
};

export const getRandomColor = () =>
  COLORS[Math.floor(Math.random() * COLORS.length)];

// bricks shapes---------------------------------------------------
const centerPiece = (shape: number[][]): number[][] => {
  const maxCol = Math.max(...shape.map(([c]) => c));
  const maxRow = Math.max(...shape.map(([, r]) => r));
  return shape.map(([c, r]) => [c - maxCol / 2, r - maxRow / 2]);
};

export const PIECES: Record<string, number[][]> = {
  O1: centerPiece([[0, 0]]),
  O2: centerPiece([[0,0],[1,0],[0,1],[1,1]]),
  O3: centerPiece([[0,0],[1,0],[2,0],[0,1],[1,1],[2,1],[0,2],[1,2],[2,2]]),
  I2: centerPiece([[0,0],[1,0]]),
  I3: centerPiece([[0,0],[1,0],[2,0]]),
  I4: centerPiece([[0,0],[1,0],[2,0],[3,0]]),
  I5: centerPiece([[0,0],[1,0],[2,0],[3,0],[4,0]]),
  L:  centerPiece([[0,0],[0,1],[0,2],[1,2]]),
  L2: centerPiece([[0,0],[1,0],[2,0],[0,1],[0,2]]),
  T:  centerPiece([[0,0],[1,0],[2,0],[1,1]]),
  C:  centerPiece([[0,0],[1,0],[0,1]]),
  C2: centerPiece([[0,0],[1,0],[2,0],[2,1],[2,2]]),
  S:  centerPiece([[1,0],[2,0],[0,1],[1,1]]),
  Z:  centerPiece([[0,0],[1,0],[1,1],[2,1]]),
};

const PIECE_KEYS = Object.keys(PIECES);
export const getRandomPiece = () =>
  PIECES[PIECE_KEYS[Math.floor(Math.random() * PIECE_KEYS.length)]];

// global const ---------------------------------------------------------------
const UNIT = 100 / 18;
const SCALE_FACTOR = 2;
const SCALE_NORMAL = new THREE.Vector3(1, 1, 1);
const SCALE_BIG = SCALE_NORMAL.clone().multiplyScalar(SCALE_FACTOR);
const LERP_ALPHA = 0.15;
//const INITIAL_POSITION = new THREE.Vector3(55,30,Math.ceil(UNIT/SCALE_FACTOR) + 1)
const INITIAL_POSITIONS = [
  new THREE.Vector3(55, 30, Math.ceil(UNIT / SCALE_FACTOR) + 1),
  new THREE.Vector3(55, 0, Math.ceil(UNIT / SCALE_FACTOR) + 1),
  new THREE.Vector3(55, -30, Math.ceil(UNIT / SCALE_FACTOR) + 1),
];

export const Block = ({
  initialPosition,
  onHover,
  color,
  shape,
}: {
  initialPosition: THREE.Vector3;
  onHover: (ref: THREE.Group | null) => void; // if mesh is not hovered, ref is null
  color: string;
  shape: number[][];
}) => {
  const [isDragged, setIsDragged] = useState(false);

  const groupRef = useRef<THREE.Group>(null!);
  const { raycaster, camera, pointer } = useThree();
  const plane = useRef(new THREE.Plane(new THREE.Vector3(0, 0, 1), 0));
  const targetPoint = useRef(new THREE.Vector3());

  useFrame(() => {
    if (!groupRef.current) return;
    if (isDragged) {
      raycaster.setFromCamera(pointer, camera);
      raycaster.ray.intersectPlane(plane.current, targetPoint.current);
      groupRef.current.position.x = targetPoint.current.x;
      groupRef.current.position.y = targetPoint.current.y;
      groupRef.current.position.z = THREE.MathUtils.lerp(
        groupRef.current.position.z, UNIT + 1, LERP_ALPHA,
      );
      groupRef.current.scale.lerp(SCALE_BIG, LERP_ALPHA);
    } else {
      groupRef.current.scale.lerp(SCALE_NORMAL, LERP_ALPHA);
      groupRef.current.position.z = THREE.MathUtils.lerp(
        groupRef.current.position.z,
        Math.ceil(UNIT / SCALE_FACTOR) + 1,
        LERP_ALPHA,
      );
      groupRef.current.position.lerp(initialPosition, 0.1);
    }
  });

  const bbox = useMemo(() => {
  const maxCol = Math.max(...shape.map(([c]) => c));
  const maxRow = Math.max(...shape.map(([, r]) => r));
  const minCol = Math.min(...shape.map(([c]) => c));
  const minRow = Math.min(...shape.map(([, r]) => r));
  return {
    w: (maxCol - minCol + 1) * UNIT,
    h: (maxRow - minRow + 1) * UNIT,
    cx: ((maxCol + minCol) / 2) * UNIT,
    cy: ((maxRow + minRow) / 2) * UNIT,
  };
  }, [shape]);

  const rotationStep = useRef(1);

  function rotationHandler() {
    rotationStep.current = (rotationStep.current + 1) % 4; // for rotation in 90° steps, reset after 4 steps
    console.log("rotate block", rotationStep.current);
    groupRef.current.rotation.z = rotationStep.current * (Math.PI / 2); // rotate 90°
  }
  
  const pointerDownTime = useRef(0);

  return (
    <group
      ref={groupRef}
      position={[initialPosition.x, initialPosition.y, initialPosition.z]}

      // drag & drop
      onPointerDown={() => {
        setIsDragged(true);
        pointerDownTime.current = Date.now();
      }}

      onPointerUp={() => {
        setIsDragged(false);
        // if pointer was down for less than 200ms, consider it a click and rotate the block
        if (Date.now() - pointerDownTime.current < 200) {
          rotationHandler();
        }
      }}
      // hover
      onPointerEnter={
        () => onHover(groupRef.current)
      }
      onPointerLeave={
        () => onHover(null)
      }
  
    >
      <mesh position={[bbox.cx, bbox.cy, 0]}>
        <Edges lineWidth={10} color={darkenColor(color, 0.8)} />
        <planeGeometry args={[bbox.w, bbox.h]} />
        <meshBasicMaterial transparent opacity={0} depthWrite={false} />
      </mesh>

      {shape.map(([col, row], i) => (
        <mesh key={i} position={[col * UNIT, row * UNIT, 0]}>
          ...
        </mesh>
      ))}
      {shape.map(([col, row], i) => (
        <mesh key={i} position={[col * UNIT, row * UNIT, 0]}>
          <boxGeometry args={[UNIT - 0.3, UNIT - 0.3, UNIT]} />
          <meshStandardMaterial color={color} />
        </mesh>
      ))}
    </group>
  );
};

export default function blocksGeneration() {
  const [hoveredMesh, setHoveredMesh] = useState<THREE.Group | null>(null);

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
          onHover={setHoveredMesh}
          color={configs[i].color}
          shape={configs[i].shape}      />
      ))}
      {/* to have hover again bcause it didn't worked when placed in Block */}
      <EffectComposer autoClear={false}>
        <Outline
          selection={hoveredMesh ? [hoveredMesh] : []}
          edgeStrength={1000}
          blur={true}
          kernelSize={2}
        />
        <Pixelation granularity={3} />
        <Scanline opacity={.2} density={1} />
      </EffectComposer>
    </>
  );
}
