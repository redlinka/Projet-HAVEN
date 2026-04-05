import type { ReactNode } from "react";

export interface Game {
  game: ReactNode;
  description: string;
  title: string;
  icon: ReactNode;
  img: string;
}

export interface User{
  id: number | null;
  SQL_id: number | null;
  sessionToken: string | null;
  games: [];
}

export interface GameEntry {
  _id: string;
  game: "PUZZLE" | "BRICKBLAST" | string;
  mode: string;
  difficulty: string;
  points: number;
  playedAt: string;
  expiresAt: string;
  used: boolean;
}

export type PuzzleSave = {
  mod?: any;
  board?: any;
  answer?: any;
  bricksRemaining?: number;
  currentBrick?: any;
  image?: string;
  nbPieces?: number;
};
