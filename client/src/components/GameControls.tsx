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

  return (
    <div
      className="flex items-center justify-center gap-2 shrink-0"
      style={{ padding: "2px 0" }}
    >
      {drawOfferPending ? (
        <>
          <span
            style={{ fontSize: "0.72rem", color: "rgba(200,162,96,0.75)" }}
          >
            Draw offered
          </span>
          <button
            onClick={() => onRespondDraw(true)}
            style={{
              background: "rgba(74,222,128,0.12)",
              border: "1px solid rgba(74,222,128,0.3)",
              borderRadius: "8px",
              color: "#4ade80",
              fontSize: "0.72rem",
              fontWeight: 600,
              padding: "3px 10px",
              cursor: "pointer",
            }}
          >
            Accept
          </button>
          <button
            onClick={() => onRespondDraw(false)}
            style={{
              background: "rgba(239,68,68,0.08)",
              border: "1px solid rgba(239,68,68,0.25)",
              borderRadius: "8px",
              color: "rgba(252,165,165,0.75)",
              fontSize: "0.72rem",
              fontWeight: 600,
              padding: "3px 10px",
              cursor: "pointer",
            }}
          >
            Decline
          </button>
        </>
      ) : (
        <button
          onClick={onOfferDraw}
          disabled={drawOfferSent}
          style={{
            background: "rgba(240,217,181,0.04)",
            border: "1px solid rgba(200,162,96,0.13)",
            borderRadius: "8px",
            color: drawOfferSent
              ? "rgba(232,213,183,0.22)"
              : "rgba(232,213,183,0.42)",
            fontSize: "0.72rem",
            padding: "3px 10px",
            cursor: drawOfferSent ? "default" : "pointer",
            transition: "all 0.15s",
          }}
        >
          {drawOfferSent ? "Draw offered…" : "½ Draw"}
        </button>
      )}

      {confirmResign ? (
        <>
          <button
            onClick={() => {
              onResign();
              setConfirmResign(false);
            }}
            style={{
              background: "rgba(239,68,68,0.18)",
              border: "1px solid rgba(239,68,68,0.4)",
              borderRadius: "8px",
              color: "#fca5a5",
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
            style={{
              background: "none",
              border: "1px solid rgba(200,162,96,0.12)",
              borderRadius: "8px",
              color: "rgba(232,213,183,0.32)",
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
          style={{
            background: "rgba(240,217,181,0.04)",
            border: "1px solid rgba(200,162,96,0.13)",
            borderRadius: "8px",
            color: "rgba(232,213,183,0.42)",
            fontSize: "0.72rem",
            padding: "3px 10px",
            cursor: "pointer",
            transition: "all 0.15s",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.color = "rgba(252,165,165,0.65)";
            e.currentTarget.style.borderColor = "rgba(239,68,68,0.28)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.color = "rgba(232,213,183,0.42)";
            e.currentTarget.style.borderColor = "rgba(200,162,96,0.13)";
          }}
        >
          Resign
        </button>
      )}
    </div>
  );
}
