import type { GameState } from "../types/chess";

export function GameStatus({ gameState }: { gameState: GameState }) {
  const {
    playerColor,
    turn,
    isCheck,
    isCheckmate,
    isStalemate,
    isDraw,
    status,
    message,
    opponentOffline,
  } = gameState;

  const isMyTurn = turn === playerColor && status === "playing";

  let text = "";
  let bg = "";
  let color = "";

  if (opponentOffline) {
    text = "Opponent offline — waiting 30s…";
    bg = "rgba(250,204,21,0.08)"; color = "rgba(250,204,21,0.65)";
  } else if (message) {
    text = message;
    bg = "rgba(200,162,96,0.15)"; color = "#c8a56a";
  } else if (isCheckmate) {
    text = `Checkmate — ${turn === "w" ? "Black" : "White"} wins!`;
    bg = "rgba(239,68,68,0.15)"; color = "#fca5a5";
  } else if (isStalemate) {
    text = "Stalemate — Draw!";
    bg = "rgba(240,217,181,0.06)"; color = "rgba(232,213,183,0.6)";
  } else if (isDraw) {
    text = "Draw!";
    bg = "rgba(240,217,181,0.06)"; color = "rgba(232,213,183,0.6)";
  } else if (isCheck) {
    text = `${turn === "w" ? "White" : "Black"} is in check!`;
    bg = "rgba(239,68,68,0.12)"; color = "#fca5a5";
  } else if (isMyTurn) {
    text = "Your turn";
    bg = "rgba(200,162,96,0.15)"; color = "#c8a56a";
  } else {
    text = "Opponent's turn…";
    bg = "rgba(240,217,181,0.04)"; color = "rgba(232,213,183,0.45)";
  }

  return (
    <div
      className="w-full text-center text-xs font-medium py-1.5 rounded-lg shrink-0"
      style={{ background: bg, color }}
    >
      {text}
    </div>
  );
}
