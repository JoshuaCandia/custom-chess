import type { GameState } from "../types/chess";

interface GameOverModalProps {
  gameState: GameState;
  onPlayAgain: () => void;
}

type Result = "win" | "loss" | "draw";

function resolveResult(gs: GameState): {
  result: Result;
  title: string;
  subtitle: string;
  icon: string;
} {
  const { playerColor, turn, isCheckmate, isStalemate, isDraw, message } = gs;

  // ── Timeout or disconnect ───────────────────────────────────────────────────
  if (message) {
    if (message.toLowerCase().includes("you lose") || message.toLowerCase().includes("time's up")) {
      return { result: "loss", title: "You Lost", subtitle: message, icon: "♚" };
    }
    if (message.toLowerCase().includes("wins on time")) {
      return { result: "win", title: "You Won!", subtitle: message, icon: "♔" };
    }
    if (message.toLowerCase().includes("disconnected")) {
      return { result: "win", title: "Opponent Left", subtitle: message, icon: "♔" };
    }
    return { result: "draw", title: "Game Over", subtitle: message, icon: "♟" };
  }

  // ── Checkmate ───────────────────────────────────────────────────────────────
  // After the winning move, turn() points to the checkmated player (they can't move).
  if (isCheckmate) {
    if (turn === playerColor) {
      return { result: "loss", title: "You Lost", subtitle: "Checkmate", icon: "♚" };
    }
    return { result: "win", title: "You Won!", subtitle: "Checkmate", icon: "♔" };
  }

  // ── Draw conditions ─────────────────────────────────────────────────────────
  if (isStalemate) {
    return { result: "draw", title: "Draw", subtitle: "Stalemate", icon: "½" };
  }
  if (isDraw) {
    return { result: "draw", title: "Draw", subtitle: "Draw by repetition or 50-move rule", icon: "½" };
  }

  return { result: "draw", title: "Game Over", subtitle: "", icon: "♟" };
}

const PALETTE: Record<Result, { title: string; icon: string; border: string; bg: string }> = {
  win: {
    title: "#c8a56a",
    icon: "#c8a56a",
    border: "rgba(200,162,96,0.4)",
    bg: "rgba(200,162,96,0.08)",
  },
  loss: {
    title: "#fca5a5",
    icon: "#f87171",
    border: "rgba(239,68,68,0.35)",
    bg: "rgba(239,68,68,0.08)",
  },
  draw: {
    title: "#e8d5b7",
    icon: "rgba(232,213,183,0.6)",
    border: "rgba(200,162,96,0.2)",
    bg: "rgba(240,217,181,0.05)",
  },
};

export function GameOverModal({ gameState, onPlayAgain }: GameOverModalProps) {
  const { result, title, subtitle, icon } = resolveResult(gameState);
  const p = PALETTE[result];

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ background: "rgba(12,8,5,0.78)", backdropFilter: "blur(6px)" }}
    >
      <div
        className="flex flex-col items-center gap-6 px-10 py-8 rounded-2xl"
        style={{
          background: "#231c14",
          border: `1px solid ${p.border}`,
          boxShadow: "0 32px 80px rgba(0,0,0,0.65)",
          minWidth: "280px",
          animation: "modal-in 0.2s ease-out",
        }}
      >
        {/* Icon */}
        <span
          style={{
            fontSize: "3.2rem",
            lineHeight: 1,
            color: p.icon,
          }}
        >
          {icon}
        </span>

        {/* Texts */}
        <div className="flex flex-col items-center gap-1.5 text-center">
          <h2
            className="text-2xl font-bold tracking-tight"
            style={{ color: p.title }}
          >
            {title}
          </h2>
          {subtitle && (
            <p className="text-sm" style={{ color: "rgba(232,213,183,0.5)" }}>
              {subtitle}
            </p>
          )}
        </div>

        {/* Moves played */}
        {gameState.moveHistory.length > 0 && (
          <p
            className="text-xs"
            style={{ color: "rgba(232,213,183,0.3)" }}
          >
            {Math.ceil(gameState.moveHistory.length / 2)} moves played
          </p>
        )}

        {/* Play again */}
        <button
          onClick={onPlayAgain}
          className="w-full py-2.5 rounded-xl text-sm font-semibold transition-all active:scale-[0.98]"
          style={{ background: "#c8a56a", color: "#1c1512" }}
          onMouseEnter={(e) => (e.currentTarget.style.background = "#d4b47a")}
          onMouseLeave={(e) => (e.currentTarget.style.background = "#c8a56a")}
        >
          Play Again
        </button>
      </div>

      <style>{`
        @keyframes modal-in {
          from { opacity: 0; transform: scale(0.92); }
          to   { opacity: 1; transform: scale(1); }
        }
      `}</style>
    </div>
  );
}
