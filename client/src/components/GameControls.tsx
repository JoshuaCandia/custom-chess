import { useState } from "react";
import type { GameState } from "../types/chess";

interface GameControlsProps {
  gameState: GameState;
  onResign: () => void;
  onOfferDraw: () => void;
  onRespondDraw: (accept: boolean) => void;
}

export function GameControls({
  gameState,
  onResign,
  onOfferDraw,
  onRespondDraw,
}: GameControlsProps) {
  const [confirmResign, setConfirmResign] = useState(false);
  const { status, drawOfferPending, drawOfferSent } = gameState;

  if (status !== "playing") return null;

  // ── Prominent draw offer banner ────────────────────────────────────────────
  if (drawOfferPending) {
    return (
      <div
        className="shrink-0 flex flex-col gap-2 rounded-xl px-3 py-2.5"
        style={{
          background: "var(--c-accent-dim)",
          border: "1px solid var(--c-accent)",
          animation: "drawPulse 1.2s ease-in-out infinite",
        }}
      >
        <span
          className="text-xs font-semibold text-center"
          style={{ color: "var(--c-accent)" }}
        >
          ½ Draw offered by opponent
        </span>
        <div className="flex gap-2">
          <button
            onClick={() => onRespondDraw(true)}
            className="flex-1 py-1.5 rounded-lg text-xs font-bold transition-all"
            style={{
              background: "rgba(74,222,128,0.15)",
              border: "1px solid rgba(74,222,128,0.4)",
              color: "var(--c-win)",
              cursor: "pointer",
            }}
          >
            Accept
          </button>
          <button
            onClick={() => onRespondDraw(false)}
            className="flex-1 py-1.5 rounded-lg text-xs font-bold transition-all"
            style={{
              background: "rgba(239,68,68,0.1)",
              border: "1px solid rgba(239,68,68,0.3)",
              color: "var(--c-loss)",
              cursor: "pointer",
            }}
          >
            Decline
          </button>
        </div>
        <style>{`
          @keyframes drawPulse {
            0%, 100% { box-shadow: 0 0 0 0 var(--c-accent-dim); }
            50% { box-shadow: 0 0 0 4px var(--c-accent-dim); }
          }
        `}</style>
      </div>
    );
  }

  // ── Normal controls ────────────────────────────────────────────────────────
  return (
    <div
      className="flex items-center justify-center gap-2 shrink-0"
      style={{ padding: "2px 0" }}
    >
      <button
        onClick={onOfferDraw}
        disabled={drawOfferSent}
        className="rounded-lg text-xs transition-all"
        style={{
          background: "var(--c-surface-2)",
          border: "1px solid var(--c-border-faint)",
          color: drawOfferSent ? "var(--c-text-faint)" : "var(--c-text-muted)",
          fontSize: "0.72rem",
          padding: "3px 10px",
          cursor: drawOfferSent ? "default" : "pointer",
        }}
      >
        {drawOfferSent ? "Draw offered…" : "½ Draw"}
      </button>

      {confirmResign ? (
        <>
          <button
            onClick={() => {
              onResign();
              setConfirmResign(false);
            }}
            className="rounded-lg text-xs font-semibold transition-all"
            style={{
              background: "rgba(239,68,68,0.18)",
              border: "1px solid rgba(239,68,68,0.4)",
              color: "var(--c-loss)",
              fontSize: "0.72rem",
              fontWeight: 600,
              padding: "3px 10px",
              cursor: "pointer",
            }}
          >
            Confirm resign
          </button>
          <button
            onClick={() => setConfirmResign(false)}
            className="rounded-lg text-xs transition-all"
            style={{
              background: "none",
              border: "1px solid var(--c-border-faint)",
              color: "var(--c-text-faint)",
              fontSize: "0.72rem",
              padding: "3px 8px",
              cursor: "pointer",
            }}
          >
            Cancel
          </button>
        </>
      ) : (
        <button
          onClick={() => setConfirmResign(true)}
          className="rounded-lg text-xs transition-all"
          style={{
            background: "var(--c-surface-2)",
            border: "1px solid var(--c-border-faint)",
            color: "var(--c-text-muted)",
            fontSize: "0.72rem",
            padding: "3px 10px",
            cursor: "pointer",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.color = "var(--c-loss)";
            e.currentTarget.style.borderColor = "rgba(239,68,68,0.28)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.color = "var(--c-text-muted)";
            e.currentTarget.style.borderColor = "var(--c-border-faint)";
          }}
        >
          Resign
        </button>
      )}
    </div>
  );
}
