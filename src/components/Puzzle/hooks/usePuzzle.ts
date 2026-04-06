import { useEffect, useRef, useState } from "react";

import type { Brick } from "../Brick";

import {
  getGameData,
  addBrick,
  checkPlacementValid,
  shuffleArray,
  initPuzzleBoard,
  calculScore,
} from "../utils/puzzleEngine";
import {
  LS_ANSWER,
  LS_BOARD,
  LS_BRICKS,
  LS_CURRENT_BRICK,
  LS_IMAGE,
  LS_MOD,
  LS_NB_PIECES,
  lsClear,
  lsGet,
  lsSet,
} from "../utils/puzzleStorage";
import { useRoom } from "../../../contexts/RoomContext";

// INTERFACES

export interface PuzzleState {
  mod: { cols: number; rows: number };
  setMod: React.Dispatch<React.SetStateAction<{ cols: number; rows: number }>>;
  loading: boolean;

  // PIECES AND BOARD
  allBricks: Brick[];
  currentBrick: Brick | null;
  board: string[];
  answerBoard: string[];
  score: number;
  nbPieces: number;

  // IMG
  imagePath: string;
  imageZoomed: boolean;
  setImageZoomed: React.Dispatch<React.SetStateAction<boolean>>;

  // ENDGAME
  endGame: boolean;
  handleModeMenu: () => void;

  // DRAG & DROP
  activeBrick: Brick | null;
  dragPos: { x: number; y: number } | null;
  isOnBoard: boolean;
  handlePointerDown: (brick: Brick, e: React.PointerEvent) => void;
}

interface UsePuzzleOptions {
  playOnDrag: () => void;
  playOnDrop: () => void;
  playWrongPlacement: () => void;
}

//MAIN FUNCTION

export function usePuzzle({
  playOnDrag,
  playOnDrop,
  playWrongPlacement,
}: UsePuzzleOptions): PuzzleState {
  
  const {roomId} = useRoom();

  const savedMod =lsGet<{ cols: number; rows: number }>(LS_MOD) ?? { cols: 0, rows: 0 } ;

  const [mod, setMod] = useState(!roomId ? savedMod : { cols: 0, rows: 0 });
  const [loading, setLoading] = useState(false);
  const [allBricks, setAllBricks] = useState<Brick[]>(!roomId ? lsGet<Brick[]>(LS_BRICKS) ?? [] : []);
  const [currentBrick, setCurrentBrick] = useState<Brick | null>(
    lsGet<Brick>(LS_CURRENT_BRICK),
  );

  const [board, setBoard] = useState<string[]>(!roomId ? lsGet<string[]>(LS_BOARD) ?? [] : []);
  const [answerBoard, setAnswerBoard] = useState<string[]>(!roomId ? lsGet<string[]>(LS_ANSWER) ?? [] : []);
  const [score, setScore] = useState(0);

  const [imagePath, setImagePath] = useState<string>(!roomId ? lsGet<string>(LS_IMAGE) ?? "" : "",);
  const [imageZoomed, setImageZoomed] = useState(false);

  const [nbPieces, setNbPieces] = useState<number>(!roomId ? lsGet<number>(LS_NB_PIECES) ?? 0 : 0);

  // DRAG STATE
  const [activeBrick, setActiveBrick] = useState<Brick | null>(null);
  const draggingBrickRef = useRef<Brick | null>(null);
  const modRef = useRef(mod);

  const [dragPos, setDragPos] = useState<{ x: number; y: number } | null>(null);
  const [isOnBoard, setIsOnBoard] = useState(false);
  const [endGame, setEndGame] = useState<boolean>(false);

  useEffect(() => {
    modRef.current = mod;
  }, [mod]);

  // DRAG & DROP LISTENERS
  useEffect(() => {
    const getBoardInfos = () => {
      const canvas = document.getElementById("cnv");
      if (!canvas) return null;
      const rect = canvas.getBoundingClientRect();
      const BS = rect.width / modRef.current.cols;
      return { rect, BS };
    };

    const onMove = (e: PointerEvent) => {
      const brick = draggingBrickRef.current;
      if (!brick) return;

      setDragPos({ x: e.clientX, y: e.clientY });

      const boardInfo = getBoardInfos();
      if (!boardInfo) return;

      const { rect, BS } = boardInfo;
      const topLeftX = e.clientX - rect.left - (brick.w * BS) / 2;
      const topLeftY = e.clientY - rect.top - (brick.h * BS) / 2;
      const i = Math.round(topLeftX / BS);
      const j = Math.round(topLeftY / BS);

      const inside =
        i >= 0 &&
        i + brick.w <= modRef.current.cols &&
        j >= 0 &&
        j + brick.h <= modRef.current.rows;

      setIsOnBoard(inside);
    };

    const onEnd = (e: PointerEvent) => {
      const currentBrickToPlace = draggingBrickRef.current;
      if (!currentBrickToPlace) return;

      const boardInfo = getBoardInfos();
      if (boardInfo) {
        const { rect, BS } = boardInfo;
        const topLeftX =
          e.clientX - rect.left - (currentBrickToPlace.w * BS) / 2;
        const topLeftY =
          e.clientY - rect.top - (currentBrickToPlace.h * BS) / 2;
        const i = Math.round(topLeftX / BS);
        const j = Math.round(topLeftY / BS);

        setBoard((prevBoard) => {
          const updatedBoard = addBrick(
            prevBoard,
            modRef.current.cols,
            { x: i, y: j },
            currentBrickToPlace,
          );

          if (updatedBoard) {
            playOnDrop();

            lsSet(LS_BOARD, updatedBoard);

            setAllBricks((prevBricks) => {
              const remaining = prevBricks.slice(1);
              const next = prevBricks[0] ?? null;

              setCurrentBrick(next); 

              lsSet(LS_BRICKS, remaining);
              lsSet(LS_CURRENT_BRICK, next);

              if (!next) {
                localStorage.setItem("reason", "ALL PIECES PLACED");
                setEndGame(true);
                lsClear();
              } else if (!checkPlacementValid(updatedBoard, modRef.current.cols, next)) {
                localStorage.setItem("reason", "PIECE CANNOT FIT THE BOARD. GAME OVER!");
                setEndGame(true);
                lsClear();
              }

              return remaining;
            });

            return updatedBoard;
          } else {
            playWrongPlacement();
            return prevBoard;
          }
        });
      }

      draggingBrickRef.current = null;
      setActiveBrick(null);
      setDragPos(null);
      setIsOnBoard(false);
    };

    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onEnd);

    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onEnd);
    };
  }, [playOnDrop, playWrongPlacement]);

  const handlePointerDown = (brick: Brick, e: React.PointerEvent) => {
    playOnDrag();
    draggingBrickRef.current = brick;
    setActiveBrick(brick);
    setDragPos({ x: e.clientX, y: e.clientY });
    (e.currentTarget as Element).setPointerCapture(e.pointerId);
  };

  const handleModeMenu = () => {
    setEndGame(false);
    lsClear();
    setMod({ cols: 0, rows: 0 });
  };

  // GAME LOADING
  useEffect(() => {
    if (!mod.cols || !mod.rows) return;

    const savedBoard = lsGet<string[]>(LS_BOARD);
    const savedModLS = lsGet<{ cols: number; rows: number }>(LS_MOD);
    const isResume =
      savedBoard &&
      savedBoard.length > 0 &&
      savedModLS?.cols === mod.cols &&
      savedModLS?.rows === mod.rows;

    if (isResume) return;

    const loadGame = async () => {
      setLoading(true);
      try {
        const { imagePath, brickData, answerData } = await getGameData(
          modRef.current.cols,
          modRef.current.rows,
        );
        const shuffled = shuffleArray(brickData);
        const nb = shuffled.length;
        const firstBrick = shuffled[0] ?? null;
        const remaining = shuffled.slice(1);

        setNbPieces(nb);
        setImagePath(imagePath);
        setAllBricks(remaining);
        setCurrentBrick(firstBrick);
        setAnswerBoard(answerData);
        setBoard(initPuzzleBoard(mod.cols, mod.rows));

        lsSet(LS_MOD, { cols: mod.cols, rows: mod.rows });
        lsSet(LS_BOARD, initPuzzleBoard(mod.cols, mod.rows));
        lsSet(LS_ANSWER, answerData);
        lsSet(LS_BRICKS, remaining);
        lsSet(LS_CURRENT_BRICK, firstBrick);
        lsSet(LS_IMAGE, imagePath);
        lsSet(LS_NB_PIECES, nb);
      } catch (err) {
        console.error("Error loading game:", err);
      } finally {
        setLoading(false);
      }
    };

    loadGame();
  }, [mod]);

  // SCORE
  useEffect(() => {
    if (board.length > 0 && answerBoard.length > 0) {
      // console.log(board);
      const newScore = calculScore(board, answerBoard);
      setScore(newScore);
    }
  }, [board, answerBoard]);

  return {
    mod,
    setMod,
    loading,
    allBricks,
    currentBrick,
    board,
    answerBoard,
    score,
    nbPieces,
    imagePath,
    imageZoomed,
    setImageZoomed,
    endGame,
    handleModeMenu,
    activeBrick,
    dragPos,
    isOnBoard,
    handlePointerDown,
  };
}
