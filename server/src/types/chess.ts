import { Chess } from "chess.js";

export type TimeControl = number | null; // seconds per player, null = no timer

export interface Player {
  socketId: string;
  color: "w" | "b";
  connected: boolean;
  userId?: string;
  username: string;
}

export interface Room {
  id: string;
  players: Player[];
  game: Chess;
  status: "waiting" | "playing" | "finished";
  createdAt: number;
  timeControl: TimeControl;
  timeWhite: number; // ms remaining
  timeBlack: number; // ms remaining
  lastMoveTimestamp: number;
  timerRef: NodeJS.Timeout | null;
}

export interface MoveInput {
  from: string;
  to: string;
  promotion?: "q" | "r" | "b" | "n";
}

export interface CreateRoomPayload {
  timeControl: TimeControl;
}

export interface JoinRoomPayload {
  roomId: string;
}

export interface MakeMovePayload {
  roomId: string;
  move: MoveInput;
}

export interface ChatMessagePayload {
  roomId: string;
  text: string;
}
