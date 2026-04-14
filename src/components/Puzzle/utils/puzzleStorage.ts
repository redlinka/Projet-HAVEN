import type { PuzzleSave } from "../../../types/types";

const LS_KEY = "puzzle_save";

export const LS_MOD = "puzzle_mod";
export const LS_BOARD = "puzzle_board";
export const LS_ANSWER = "puzzle_answer";
export const LS_BRICKS = "puzzle_bricks_remaining";
export const LS_CURRENT_BRICK = "puzzle_current_brick";
export const LS_IMAGE = "puzzle_image";
export const LS_NB_PIECES = "puzzle_nb_pieces";

const keyMap: Record<string, keyof PuzzleSave> = {
  [LS_MOD]: "mod",
  [LS_BOARD]: "board",
  [LS_ANSWER]: "answer",
  [LS_BRICKS]: "bricksRemaining",
  [LS_CURRENT_BRICK]: "currentBrick",
  [LS_IMAGE]: "image",
  [LS_NB_PIECES]: "nbPieces",
};

function getSave(): PuzzleSave {
  try {
    return JSON.parse(localStorage.getItem(LS_KEY) || "{}");
  } catch {
    return {};
  }
}

function setSave(save: PuzzleSave) {
  localStorage.setItem(LS_KEY, JSON.stringify(save));
}

export function lsGet<T>(key: string): T | null {
  try {
    const save = getSave();
    const mappedKey = keyMap[key];

    if (!mappedKey) return null;

    return (save[mappedKey] as T) ?? null;
  } catch {
    return null;
  }
}

export function lsSet(key: string, value: any) {
  const mappedKey = keyMap[key];
  if (!mappedKey) return;

  const save = getSave();
  save[mappedKey] = value;
  setSave(save);
}

export function lsClear() {
  localStorage.removeItem(LS_KEY);
}