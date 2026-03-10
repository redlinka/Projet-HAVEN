import { Edges } from "@react-three/drei";
import {useMemo, useRef, useState} from "react";
import * as THREE from "three";
import {useFrame, useThree} from "@react-three/fiber";
import {EffectComposer, Outline, Pixelation, Scanline} from "@react-three/postprocessing";

const COLORS = ["red", "green", "blue", "yellow", "purple"];

const darkenColor = (hex: string, factor = 0.7): string => {
  const c = new THREE.Color(hex);
  c.multiplyScalar(factor);
  return "#" + c.getHexString();
};

export const getRandomColor = () =>
  COLORS[Math.floor(Math.random() * COLORS.length)];

const UNIT = 100 / 9;
const BRICK_H = UNIT * 0.6;
const STUD_R = UNIT * 0.3;
const STUD_H = UNIT * 0.1;
const SCALE_FACTOR = 2
const SCALE_NORMAL = new THREE.Vector3(0.5,0.5,0.5)
const SCALE_BIG = SCALE_NORMAL.clone().multiplyScalar(SCALE_FACTOR)
const LERP_ALPHA = 0.15
const GAP = 0.3; // écart entre briques

const makeInitialPosition = (x = 0, y = 0) => new THREE.Vector3(x, y, Math.ceil(UNIT / SCALE_FACTOR));

export const LegoBrick = (
    {
      cols = 2,
      rows = 1,
      color = "#ff0000",
      position
    }:
    {
      cols?: number;
      rows?: number;
      color?: string;
      position?: THREE.Vector3;

    }) => {
  const brickW = cols * UNIT;
  const brickD = rows * UNIT;

  const [isDragged, setIsDragged] = useState(false)
  const [isHovered, setIsHovered] = useState(false)

  const brickRef = useRef<THREE.Mesh>(null!)
  const outlineTargets = useRef<THREE.Mesh[]>([]);

  const initialPosition = useMemo(
      () => position ?? makeInitialPosition(),
      // eslint-disable-next-line react-hooks/exhaustive-deps
      []
  );

  const { raycaster, camera, pointer } = useThree()

  const plane = useMemo(() => new THREE.Plane(new THREE.Vector3(0, 0, 1), -15), []);
  const targetPoint = useRef(new THREE.Vector3());

  useFrame(() => {
    if (!brickRef.current) return;

    if (isDragged) {

      raycaster.setFromCamera(pointer, camera)
      raycaster.ray.intersectPlane(plane, targetPoint.current)
      brickRef.current.position.x = targetPoint.current.x;
      brickRef.current.position.y = targetPoint.current.y;
      brickRef.current.position.z =THREE.MathUtils.lerp(brickRef.current.position.z, UNIT + 1, LERP_ALPHA)
      brickRef.current.scale.lerp(SCALE_BIG, LERP_ALPHA)
    } else {
      brickRef.current.scale.lerp(SCALE_NORMAL, LERP_ALPHA)
      brickRef.current.position.lerp(initialPosition, 0.1);
    }
  })

  const studs = useMemo(() => {
    const list: [number, number][] = [];
    for (let c = 0; c < cols; c++) {
      for (let r = 0; r < rows; r++) {
        list.push([
          -brickW / 2 + UNIT / 2 + c * UNIT,
          -brickD / 2 + UNIT / 2 + r * UNIT,
        ]);
      }
    }
    return list;
  }, [cols, rows, brickW, brickD]);

  const collectRef = (mesh: THREE.Mesh | null) => {
    if (mesh && !outlineTargets.current.includes(mesh)) {
      outlineTargets.current.push(mesh);
    }
  };

  return (
      <>
          <mesh
              ref={brickRef}
              position={initialPosition}

              onPointerDown={(e) => { e.stopPropagation(); setIsDragged(true); }}
              onPointerUp={() => {setIsDragged(false)}}
              onPointerEnter={() => setIsHovered(true)}
              onPointerLeave={() => setIsHovered(false)}
          >
                <mesh ref={collectRef} position={[0, 0, BRICK_H / 2]}>
                  <Edges lineWidth={10} color={darkenColor(color, 0.8)} />
                  <boxGeometry args={[brickW - GAP, brickD - GAP, BRICK_H]} />
                  <meshBasicMaterial color={color} />
                </mesh>

                {studs.map(([sx, sy], i) => (
                    <mesh
                        ref={collectRef}
                        key={i}
                        position={[sx, sy, BRICK_H + STUD_H / 2]}
                        rotation={[Math.PI / 2, 0, 0]}
                    >

                        <cylinderGeometry args={[STUD_R, STUD_R, STUD_H, 16]} />
                        <meshBasicMaterial color={darkenColor(color, 0.8)} />
                    </mesh>
                ))}
          </mesh>
        <EffectComposer autoClear={false}>
          <Outline
              selection={isHovered ? outlineTargets.current : []}
              edgeStrength={1000}
              blur={true}
              kernelSize={2}
          />
          <Pixelation granularity={3} />
          <Scanline opacity={0.5} density={1} />
        </EffectComposer>
      </>
    );
};

// ─── Formes Tétris définies comme grilles de studs ───────────────────────────
// (pour usage futur sur la grille de jeu)
export const PIECES = {
  I: [
    [0, 0],
    [0, 1],
    [0, 2],
    [0, 3],
  ],
  O: [
    [0, 0],
    [1, 0],
    [0, 1],
    [1, 1],
  ],
  T: [
    [0, 0],
    [1, 0],
    [2, 0],
    [1, 1],
  ],
  L: [
    [0, 0],
    [0, 1],
    [0, 2],
    [1, 0],
  ],
  S: [
    [1, 0],
    [2, 0],
    [0, 1],
    [1, 1],
  ],
};

// ─── 3 briques dans le BlockHolder ───────────────────────────────────────────
// Le BlockHolder couvre x: 30→80, y: -50→50
export const BlockHolderBlocks = () => {
  const bricks = useMemo(
    () => [
      { cols: 2, rows: 1, x: 42, y: 25, color: getRandomColor() }, // 2×1
      { cols: 2, rows: 2, x: 55, y: 0, color: getRandomColor() }, // 2×2 (carré)
      { cols: 4, rows: 1, x: 60, y: -28, color: getRandomColor() }, // 4×1 (barre)
    ],
    [], // calculé une seule fois au montage
  );

  return (
    <>
      {bricks.map((b, i) => (
        <LegoBrick
          key={i}
          cols={b.cols}
          rows={b.rows}
          color={b.color}
          position={new THREE.Vector3(b.x, b.y, 2)}
        />
      ))}
    </>
  );
};
