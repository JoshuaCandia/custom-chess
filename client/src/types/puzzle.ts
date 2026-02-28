export interface PuzzleData {
  id: string;
  fen: string;
  moves: string[];
  rating: number;
  themes: string[];
}

export interface PuzzleWithStatus extends PuzzleData {
  solvedByMe: boolean;
}

export interface DailyPuzzleResponse {
  puzzle: PuzzleData & {
    initialPly: number;
    pgn: string;
  };
  solvedByMe: boolean;
}

export interface PuzzlesListResponse {
  puzzles: PuzzleWithStatus[];
  emptyDb?: boolean;
}

export interface PuzzleStats {
  solved: number;
  attempted: number;
  accuracy: number;
  byTheme: Array<{ theme: string; solved: number; attempted: number }>;
}
