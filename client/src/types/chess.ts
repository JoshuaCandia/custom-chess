export type Color = "w" | "b";
export type GameStatus = "idle" | "waiting" | "playing" | "finished";
export type TimeControl = number | null; // seconds per player

export interface ChatMessage {
  text: string;
  from: Color;
}

export interface MoveInput {
  from: string;
  to: string;
  promotion?: "q" | "r" | "b" | "n";
}

export interface MoveMadePayload {
  fen: string;
  move: { san: string; from: string; to: string };
  turn: Color;
  isCheck: boolean;
  isCheckmate: boolean;
  isStalemate: boolean;
  isDraw: boolean;
  timeWhite: number;
  timeBlack: number;
}

export interface GameState {
  roomId: string;
  playerColor: Color;
  fen: string;
  turn: Color;
  status: GameStatus;
  isCheck: boolean;
  isCheckmate: boolean;
  isStalemate: boolean;
  isDraw: boolean;
  message: string | null;
  lastMove: { from: string; to: string } | null;
  timeControl: TimeControl;
  timeWhite: number; // ms remaining
  timeBlack: number; // ms remaining
  moveHistory: string[]; // SAN strings in order
  myUsername: string;
  opponentUsername: string;
  drawOfferPending: boolean;  // opponent offered draw to me
  drawOfferSent: boolean;     // I offered draw, waiting for response
  opponentOffline: boolean;   // opponent disconnected, grace period running
}
