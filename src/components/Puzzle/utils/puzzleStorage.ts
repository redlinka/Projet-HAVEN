export const LS_MOD = "puzzle_mod";
export const LS_BOARD = "puzzle_board";
export const LS_ANSWER = "puzzle_answer";
export const LS_BRICKS = "puzzle_bricks_remaining"; 
export const LS_CURRENT_BRICK = "puzzle_current_brick";
export const LS_IMAGE = "puzzle_image";
export const LS_NB_PIECES = "puzzle_nb_pieces";

export function lsGet<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

export function lsClear() {
  [LS_MOD, LS_BOARD, LS_ANSWER, LS_BRICKS, LS_CURRENT_BRICK, LS_IMAGE, LS_NB_PIECES].forEach(
    (k) => localStorage.removeItem(k),
  );
}