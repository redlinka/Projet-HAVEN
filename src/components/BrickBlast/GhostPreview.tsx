import {useEffect, useRef} from "react";
import { useGameStore } from "./Store.ts";
import * as THREE from "three";
import {CELL_SIZE, checkCollision, getWorldCoordsFromGrid} from "./logic.ts";
import {BrickUnit} from "./BrickUnit.tsx";

export const GhostPreview = () => {

    const activePiece = useGameStore((state) => state.activePiece);
    const grid = useGameStore((state) => state.grid);
    const ghostGroupRef = useRef<THREE.Group>(null!);
    const ghostMeshesRef = useRef<THREE.Mesh[]>([]);
    const collectGhostMesh = (m: THREE.Mesh | null) => {
        if (m && !ghostMeshesRef.current.includes(m)) ghostMeshesRef.current.push(m);
    };

    useEffect(() => {

        const unsubscribe = useGameStore.subscribe((currentState, prevState) => {

            const newCoords = currentState.hoverCoords;
            const prevCoords = prevState.hoverCoords;
            const piece = currentState.activePiece;
            const store = useGameStore.getState();

            const removeGhostOutlines = () => {
                const safeMeshes = store.hoveredMeshes.filter(
                    (m) => !ghostMeshesRef.current.includes(m)
                );
                store.setHoveredMeshes(safeMeshes);
            };

            if (!ghostGroupRef.current || newCoords === prevCoords) return;

            // CONDITION 1: In the void OR no piece is actively held
            if (newCoords === null || piece === null) {
                ghostGroupRef.current.visible = false;
                store.setIsValidDrop(false);
                removeGhostOutlines();
                return;
            }

            // 2: Hovering the grid with a piece
            const isValid = checkCollision(piece.shape, newCoords.x, newCoords.y, grid);

            if (!isValid) {
                ghostGroupRef.current.visible = false;
                store.setIsValidDrop(false);
                removeGhostOutlines();
            } else {
                // It fits! Move it manually and reveal it
                const basePos = getWorldCoordsFromGrid(newCoords.x, newCoords.y);
                ghostGroupRef.current.position.set(basePos.x, basePos.y, 1);
                ghostGroupRef.current.visible = true;

                store.setIsValidDrop(true);
                const combinedMeshes = Array.from(new Set([...store.hoveredMeshes, ...ghostMeshesRef.current]));
                store.setHoveredMeshes(combinedMeshes);
            }
        });

        // Cleanup function
        return () => unsubscribe();
    }, [grid]);

    if (!activePiece) return null;

    return (
        <group ref={ghostGroupRef} visible={false}>
            {activePiece.shape.map(([colOffset, rowOffset], i) => {
                const worldX = Math.round(colOffset) * CELL_SIZE;
                const worldY = (-Math.round(rowOffset)) * CELL_SIZE;

                return (
                    <group key={`ghost-${i}`} position={[worldX, worldY, 0]}>
                        <BrickUnit color={activePiece.color} isSmall={false} opacity={0.5} refCallback={collectGhostMesh} />
                    </group>
                );
            })}
        </group>
    );
};