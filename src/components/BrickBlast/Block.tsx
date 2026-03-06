import { useMemo, useRef, useState } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import {
  EffectComposer,
  Outline,
  Pixelation,
  Scanline,
} from "@react-three/postprocessing";

const COLORS = ["red", "green", "blue", "yellow", "purple"];

export const getRandomColor = () =>
  COLORS[Math.floor(Math.random() * COLORS.length)];

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
}: {
  initialPosition: THREE.Vector3;
  onHover: (ref: THREE.Mesh | null) => void; // if mesh is not hovered, ref is null
  color: string;
}) => {
  const [isDragged, setIsDragged] = useState(false);

  const boxRef = useRef<THREE.Mesh>(null!);
  const { raycaster, camera, pointer } = useThree();
  const plane = new THREE.Plane(new THREE.Vector3(0, 0, 1), 0);
  const targetPoint = new THREE.Vector3();

  useFrame(() => {
    if (isDragged) {
      raycaster.setFromCamera(pointer, camera);
      raycaster.ray.intersectPlane(plane, targetPoint);
      boxRef.current.position.x = targetPoint.x;
      boxRef.current.position.y = targetPoint.y;
      boxRef.current.position.z = THREE.MathUtils.lerp(
        boxRef.current.position.z,
        UNIT + 1,
        LERP_ALPHA,
      );
      boxRef.current.scale.lerp(SCALE_BIG, LERP_ALPHA);
    } else {
      boxRef.current.scale.lerp(SCALE_NORMAL, LERP_ALPHA);
      boxRef.current.position.z = THREE.MathUtils.lerp(
        boxRef.current.position.z,
        Math.ceil(UNIT / SCALE_FACTOR) + 1,
        LERP_ALPHA,
      );
      boxRef.current.position.lerp(initialPosition, 0.1);
    }
  });

  function rotationHandler() {
    boxRef.current.rotation.z += Math.PI / 4;
  }

  return (
    <>
      <mesh
        ref={boxRef}
        // drag & drop
        onPointerDown={() => {
          setIsDragged(true);
        }}
        onPointerUp={() => {
          setIsDragged(false);
        }}
        // hover
        onPointerEnter={() => {
          onHover(boxRef.current);
        }}
        onPointerLeave={() => {
          onHover(null);
        }}
        // rotation
        onDoubleClick={() => rotationHandler()}
        position={[initialPosition.x, initialPosition.y, initialPosition.z]} // mesh position
      >
        <boxGeometry args={[UNIT, UNIT, UNIT]} />
        <meshStandardMaterial color={color} />
      </mesh>
    </>
  );
};

export default function blocksGeneration() {
  const [hoveredMesh, setHoveredMesh] = useState<THREE.Mesh | null>(null);

  // save color for each pos bcause it changes if we dont do that.
  const colors = useMemo(
    () => INITIAL_POSITIONS.map(() => getRandomColor()),
    [],
  );

  return (
    <>
      {INITIAL_POSITIONS.map((pos, i) => (
        <Block
          key={i}
          initialPosition={pos}
          onHover={setHoveredMesh}
          color={colors[i]}
        />
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
        <Scanline opacity={0.5} density={1} />
      </EffectComposer>
    </>
  );
}
