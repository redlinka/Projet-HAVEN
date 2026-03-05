import {useRef, useState} from "react";
import {useFrame, useThree} from "@react-three/fiber";
import * as THREE from "three"
import {EffectComposer, Outline, Pixelation, Scanline} from '@react-three/postprocessing'

const UNIT = 100/18
const SCALE_FACTOR = 2
const SCALE_NORMAL = new THREE.Vector3(1,1,1)
const SCALE_BIG = SCALE_NORMAL.clone().multiplyScalar(SCALE_FACTOR)
const LERP_ALPHA = 0.15
//const INITIAL_POSITION = new THREE.Vector3(55,30,Math.ceil(UNIT/SCALE_FACTOR) + 1)
const INITIAL_POSITION = new THREE.Vector3(0,0,Math.ceil(UNIT/SCALE_FACTOR) + 1)

export const Block = () => {

    const [isDragged, setIsDragged] = useState(false)
    const [isHovered, setIsHovered] = useState(false)

    const boxRef = useRef<THREE.Mesh>(null!)
    const { raycaster, camera, pointer } = useThree()
    const plane = new THREE.Plane(new THREE.Vector3(0, 0, 1), 0)
    const targetPoint = new THREE.Vector3()

    useFrame(() => {
        if (isDragged) {

            raycaster.setFromCamera(pointer, camera)
            raycaster.ray.intersectPlane(plane, targetPoint)
            boxRef.current.position.x = targetPoint.x
            boxRef.current.position.y = targetPoint.y
            boxRef.current.position.z =THREE.MathUtils.lerp(boxRef.current.position.z, UNIT + 1, LERP_ALPHA)
            boxRef.current.scale.lerp(SCALE_BIG, LERP_ALPHA)
        } else {
            boxRef.current.scale.lerp(SCALE_NORMAL, LERP_ALPHA)
            boxRef.current.position.z = THREE.MathUtils.lerp(boxRef.current.position.z, Math.ceil(UNIT/SCALE_FACTOR) + 1, LERP_ALPHA)
            boxRef.current.position.lerp(INITIAL_POSITION, 0.1)
        }
    })


    return (
        <>
        <mesh ref={boxRef}

              onPointerDown={() => {
                  setIsDragged(true)
              }}

              onPointerUp={() => {
                  setIsDragged(false)
              }}

              onPointerEnter={() => setIsHovered(true)}
              onPointerLeave={() => setIsHovered(false)}

              position={[0,0,Math.ceil(UNIT/SCALE_FACTOR) + 1]}
        >
            <boxGeometry args={[UNIT,UNIT,UNIT]} />
            <meshStandardMaterial color="red" />
        </mesh>
        <EffectComposer autoClear={false}>
            <Outline
                selection={isHovered ? [boxRef] : []}
                edgeStrength={1000}
                blur={true}
                kernelSize={2}
            />
            <Pixelation granularity={4.5} />
            <Scanline density={1} />
        </EffectComposer>
        </>
    )
}
export default Block;