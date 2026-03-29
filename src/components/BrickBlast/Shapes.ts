// Piece shapes
const centerPiece = (shape: number[][]): number[][] => {
    const maxCol = Math.max(...shape.map(([c]) => c));
    const maxRow = Math.max(...shape.map(([, r]) => r));
    return shape.map(([c, r]) => [c - maxCol / 2, r - maxRow / 2]);
};

export const Shapes: Record<string, number[][]> = {
    O1: centerPiece([[0, 0]]),
    O2: centerPiece([
        [0, 0], [1, 0],
        [0, 1], [1, 1],
    ]),
    O3: centerPiece([
        [0, 0], [1, 0], [2, 0],
        [0, 1], [1, 1], [2, 1],
        [0, 2], [1, 2], [2, 2],
    ]),
    I2: centerPiece([
        [0, 0], [1, 0],
    ]),
    I3: centerPiece([
        [0, 0], [1, 0], [2, 0],
    ]),
    I4: centerPiece([
        [0, 0], [1, 0], [2, 0], [3, 0],
    ]),
    I5: centerPiece([
        [0, 0], [1, 0], [2, 0], [3, 0], [4, 0],
    ]),
    L: centerPiece([
        [0, 0],
        [0, 1],
        [0, 2], [1, 2],
    ]),
    L2: centerPiece([
        [0, 0], [1, 0], [2, 0],
        [0, 1],
        [0, 2],
    ]),
    T: centerPiece([
        [0, 0], [1, 0], [2, 0],
                [1, 1],
    ]),
    C: centerPiece([
        [0, 0], [1, 0],
        [0, 1],
    ]),
    SL: centerPiece([
        [0, 0],
                [1, 1],
                        [2, 2],
    ]),
    S: centerPiece([
                [1, 0], [2, 0],
        [0, 1], [1, 1],
    ]),
    Z: centerPiece([
        [0, 0], [1, 0],
                [1, 1], [2, 1],
    ]),
};
const PIECE_KEYS = Object.keys(Shapes);
export const getRandomPiece = () =>
    Shapes[PIECE_KEYS[Math.floor(Math.random() * PIECE_KEYS.length)]];