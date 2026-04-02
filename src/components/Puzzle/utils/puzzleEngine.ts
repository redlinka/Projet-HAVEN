import type { Brick } from "../Brick";

export function randint(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

export function initPuzzleBoard(cols: number, rows: number) {
  return Array(cols * rows).fill("");
}

export function shuffleArray (array: Brick[]) {
  const newArray = [...array];
  for (let i = array.length - 1; i > 0; i--) {
    const randomIndex = Math.floor(Math.random() * (i + 1));
    [newArray[i], newArray[randomIndex]] = [newArray[randomIndex], newArray[i]];
  }
  return newArray;
};

export function calculScore(userArray: string[], answerArray: string[]) {
  var res = 0;
  for (var i = 0; i < userArray.length; i++) {
    if (userArray[i] === answerArray[i]) {
      res += 1;
    }
  }
  return res;
};

export function addBrick(array: string[], boardSize: number, pos: { x: number; y: number }, brick: Brick | null,) {
    if (!brick) return;

    const newBoard = [...array];

    for (let y = 0; y < brick.h; y++) {
    for (let x = 0; x < brick.w; x++) {
        const targetX = pos.x + x;
        const targetY = pos.y + y;

        if (
        targetX < 0 ||
        targetX >= boardSize ||
        targetY < 0 ||
        targetY >= boardSize
        ) {
        return null;
        }

        const index = targetY * boardSize + targetX;
        if (newBoard[index] !== "") {
        return null;
        }

        newBoard[index] = brick.color;
    }
    }

    return newBoard;
    };

export function checkPlacementValid (board: string[], cols: number, brick: Brick): boolean {
    for (let i = 0; i < board.length; i++) {
        if ((i % cols) + brick.w > cols) continue;

        let fits = true;

        for (let row = 0; row < brick.h; row++) {
        for (let col = 0; col < brick.w; col++) {
            const idx = i + col + row * cols;

            if (idx >= board.length || board[idx] !== "") {
            fits = false;
            break;
            }
        }
        if (!fits) break;
        }

        if (fits) return true;
    }

    return false;
};

export async function getGameData (cols: number, rows: number) {
    const path = `${import.meta.env.BASE_URL}bricks/`;
    const difficulty = `${cols}x${rows}`;
    const folder = randint(1, 3);
    const pavagePath = `${path}${difficulty}/${folder}/pavage.txt`;
    const imagePath = `${path}${difficulty}/${folder}/image.png`;
    const bricksPath = `${path}${difficulty}/${folder}/bricks.txt`;

    const [brickData, answerData] = await Promise.all([
        readBrickFile(bricksPath),
        readPavageFile(pavagePath),
    ]);
    return { brickData, answerData, imagePath };
};

// FILE READER

export async function readBrickFile(filePath: string): Promise<Brick[]> {
    const response = await fetch(filePath);
    const text = await response.text();
    const lines = text.split("\n");
    const bricksArray: Brick[] = [];

    lines.forEach((line, index) => {
    if (!line.trim()) return;
    if (index !== 0) {
        const [sizeColor, rota] = line.split(",");
        const [size, colorHex] = sizeColor.split("/");
        console.log(colorHex);
        const [w, h] = size.split("-");
        const rotaInt = parseInt(rota);
        bricksArray.push({
        id: index,
        w: parseInt(rotaInt ? h : w),
        h: parseInt(rotaInt ? w : h),
        color: `${colorHex.toLocaleUpperCase()}`,
        });
    }
    });
    return bricksArray;
}

export async function readPavageFile(filePath: string): Promise<string[]> {
  console.log(filePath);
  const response = await fetch(filePath);
  const text = await response.text();
  const lines = text.split(/\r?\n/);
  let hexaArray: string[] = [];

  lines.forEach((line, index) => {
    if (!line.trim()) return;
    if (index !== 0) {
      hexaArray = hexaArray.concat(line.toLocaleUpperCase().trim().split(" "));
    }
  });

  return hexaArray;
}
