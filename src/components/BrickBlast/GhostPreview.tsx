import {useEffect, useRef} from "react";
import { useGameStore } from "./Store.ts";
import * as THREE from "three";
import {CELL_SIZE, checkCollision, getWorldCoordsFromGrid} from "./logic.ts";
import {BrickUnit} from "./BrickUnit.tsx";

export const GhostPreview = () => {

    const activePiece = useGameStore((state) => state.activePiece);
    const grid = useGameStore((state) => state.grid);
    const ghostGroupRef = useRef<THREE.Group>(null!);

    useEffect(() => {

        const unsubscribe = useGameStore.subscribe((currentState, prevState) => {

            const newCoords = currentState.hoverCoords;
            const prevCoords = prevState.hoverCoords;
            const piece = currentState.activePiece;

            if (!ghostGroupRef.current || newCoords === prevCoords) return;

            // CONDITION 1: In the void OR no piece is actively held
            if (newCoords === null || piece === null) {
                ghostGroupRef.current.visible = false;
                return;
            }

            // 2: Hovering the grid with a piece
            const isValid = checkCollision(piece.shape, newCoords.x, newCoords.y, grid);

            if (!isValid) {
                ghostGroupRef.current.visible = false; // Hide it if it overlaps
            } else {
                // It fits! Move it manually and reveal it
                const basePos = getWorldCoordsFromGrid(newCoords.x, newCoords.y);
                ghostGroupRef.current.position.set(basePos.x, basePos.y, 1);
                ghostGroupRef.current.visible = true;
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
                const worldY = (-Math.round(rowOffset)-1) * CELL_SIZE;

                return (
                    <group key={`ghost-${i}`} position={[worldX, worldY, 0]}>
                        <BrickUnit color={activePiece.color} isSmall={false} opacity={0.5} />
                    </group>
                );
            })}
        </group>
    );
};