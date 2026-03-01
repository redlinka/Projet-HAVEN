const RAINBOW = ["red", "orange", "yellow", "green", "blue", "indigo", "violet"];

const DIRECTIONS = [
    [1, 0], [-1, 0], [0, 1], [0, -1]
];

function generateBlocks(blockSize = 1) {
    const count = Math.floor(Math.random() * 9) + 1;
    const color = RAINBOW[Math.floor(Math.random() * RAINBOW.length)];

    const startX = Math.floor(Math.random() * 9);
    const startZ = Math.floor(Math.random() * 9);

    const placed = new Set();
    const blocks = [];
    const availableFaces = [];

    const key = (x, z) => `${x},${z}`;

    const addBlock = (x, z) => {
        placed.add(key(x, z));
        blocks.push({ x, z });

        for (const [dx, dz] of DIRECTIONS) {
            const nx = x + dx;
            const nz = z + dz;
            if (nx >= 0 && nx < 9 && nz >= 0 && nz < 9 && !placed.has(key(nx, nz))) {
                availableFaces.push([nx, nz]);
            }
        }
    };

    addBlock(startX, startZ);

    for (let i = 1; i < count; i++) {
        const valid = availableFaces.filter(([x, z]) => !placed.has(key(x, z)));
        if (valid.length === 0) break;

        const [nx, nz] = valid[Math.floor(Math.random() * valid.length)];
        addBlock(nx, nz);
    }

    return { blocks, color };
}

export const Block = ({ blockSize = 1 }) => {
    const { blocks, color } = generateBlocks(blockSize);

    return (
        <group>
            {blocks.map(({ x, z }, i) => (
                <mesh key={i} position={[x * blockSize, blockSize / 2, z * blockSize]}>
                    <boxGeometry args={[blockSize, blockSize, blockSize]} />
                    <meshStandardMaterial color={color} />
                </mesh>
            ))}
        </group>
    );
};