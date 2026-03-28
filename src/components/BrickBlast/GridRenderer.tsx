import { useGameStore } from "./Store.ts";
import {COLORS, getWorldCoordsFromGrid} from "./logic.ts";
import {BrickUnit} from "./BrickUnit.tsx";

export const GridRenderer = () => {
    // Grab the 2D array from your global backpack
    const board = useGameStore((state) => state.grid);

    return (
        <group>
            {board.map((row, y) =>
                row.map((cellValue, x) => {
                    // If the cell is 0, render absolutely nothing
                    if (cellValue === 0) return null;

                    // Resolve the number to a hex color string
                    const color = COLORS[cellValue as keyof typeof COLORS];

                    // Translate the 2D array index (x,y) into 3D world space
                    const position = getWorldCoordsFromGrid(x, y);

                    return (
                        <group
                            key={`cell-${x}-${y}`}
                            // Set the physical position in the 3D world
                            position={[position.x, position.y, 1]}
                        >
                            <BrickUnit color={color} />
                        </group>
                    );
                })
            )}
        </group>
    );
};