import { useEffect, useState } from "react";
import testBrique from "/bricks/img1.txt";

interface Brick {
    w: number;
    h: number;
    color: string;
    x: number;
    y: number;
}

// Global css style

const STUD_STYLE = `
    .lego-brick {
        position: absolute;
        border-radius: 3px;
        box-shadow: inset -2px -2px 4px rgba(0,0,0,0.25), inset 2px 2px 4px rgba(255,255,255,0.2);
        box-sizing: border-box;
    }

    .lego-stud {
        position: absolute;
        width: 30px;
        height: 30px;
        border-radius: 50%;
        background: inherit;
        filter: brightness(1.15);
        box-shadow: 0 2px 4px rgba(0,0,0,0.35), inset 0 1px 2px rgba(255,255,255,0.3);
        transform: translateZ(0);
        pointer-events: none;
    } `;

const BLOCK_SIZE = 50;
const STUD_SIZE = 30;
const STUD_OFFSET = (BLOCK_SIZE - STUD_SIZE) / 2; 



async function readFile(filePath: string): Promise<Brick[]> {
    const response = await fetch(filePath);
    const text = await response.text();

    const lines = text.split("\n");
    const bricksArray: Brick[] = [];

    lines.forEach((line, index) => {
        if (!line.trim()) return;

        if (index !== 0) {
            const [sizeColor, xStr, yStr] = line.split(",");
            const [size, colorHex] = sizeColor.split("/");
            const [wStr, hStr] = size.split("-");

            const brick: Brick = {
                w: parseInt(wStr),
                h: parseInt(hStr),
                color: `#${colorHex}`,
                x: parseInt(xStr),
                y: parseInt(yStr),
            };

            bricksArray.push(brick);
        }
    });

    return bricksArray;
}

function LegoBrick({ b }: { b: Brick }) {
    const studs: { x: number; y: number }[] = [];
    for (let row = 0; row < b.h; row++) {
        for (let col = 0; col < b.w; col++) {
            studs.push({
                x: col * BLOCK_SIZE + STUD_OFFSET,
                y: row * BLOCK_SIZE + STUD_OFFSET,
            });
        }
    }

    return (
        <div
            className="lego-brick"
            style={{
                left: `${b.x * BLOCK_SIZE}px`,
                top: `${b.y * BLOCK_SIZE}px`,
                width: `${b.w * BLOCK_SIZE}px`,
                height: `${b.h * BLOCK_SIZE}px`,
                backgroundColor: b.color,
            }}
        >
            {studs.map((s, i) => (
                <div
                    key={i}
                    className="lego-stud"
                    style={{ left: `${s.x}px`, top: `${s.y}px` }}
                />
            ))}
        </div>
    );
}

export default function Bricks() {
    const [bricks, setBricks] = useState<Brick[]>([]);

    const gridCols = Math.max(1, bricks.reduce((max, b) => Math.max(max, b.x + b.w), 0));
    const gridRows = Math.max(1, bricks.reduce((max, b) => Math.max(max, b.y + b.h), 0));
    const containerWidth = gridCols * BLOCK_SIZE;
    const containerHeight = gridRows * BLOCK_SIZE;

    useEffect(() => {
        const load = async () => {
            const data = await readFile(testBrique);
            setBricks(data);
        };
        load();
    }, []);

    return (
        <>
            <style>{STUD_STYLE}</style>

            <div
                style={{
                    width: "100%",
                    height: "100%",
                    overflow: "auto",
                    backgroundColor: "#d0d0d0",
                    padding: "16px",
                    boxSizing: "border-box",
                    fontFamily: "monospace",
                }}
            >
                <div
                    style={{
                        position: "relative",
                        width: `${containerWidth}px`,
                        height: `${containerHeight}px`,
                        minWidth: `${containerWidth}px`,
                        minHeight: `${containerHeight}px`,
                        backgroundColor: "#c8c8c8",
                        backgroundImage:
                            `linear-gradient(rgba(0,0,0,0.06) 1px, transparent 1px),
                             linear-gradient(90deg, rgba(0,0,0,0.06) 1px, transparent 1px)`,
                        backgroundSize: `${BLOCK_SIZE}px ${BLOCK_SIZE}px`,
                        border: "2px solid #999",
                        borderRadius: "4px",
                        boxShadow: "0 4px 16px rgba(0,0,0,0.2)",
                        flexShrink: 0,
                    }}
                >
                    {bricks.map((b, i) => (
                        <LegoBrick key={i} b={b} />
                    ))}
                </div>
            </div>
        </>
    );
}
