import type { VoiceStatus } from "../hooks/useVoiceChat";

interface VoiceButtonProps {
  status: VoiceStatus;
  isMuted: boolean;
  onStart: () => void;
  onToggleMute: () => void;
  onStop: () => void;
}

function MicSVG({ muted }: { muted: boolean }) {
  return (
    <svg
      width="13"
      height="13"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect x="9" y="1" width="6" height="13" rx="3" />
      <path d="M5 10a7 7 0 0 0 14 0" />
      <line x1="12" y1="17" x2="12" y2="21" />
      <line x1="8"  y1="21" x2="16" y2="21" />
      {muted && <line x1="3" y1="3" x2="21" y2="21" stroke="currentColor" />}
    </svg>
  );
}

const LABELS: Record<VoiceStatus, string> = {
  idle:       "Join voice chat",
  requesting: "Requesting mic…",
  connecting: "Connecting…",
  connected:  "Voice on — click to mute",
  error:      "Voice error — click to retry",
};

export function VoiceButton({
  status,
  isMuted,
  onStart,
  onToggleMute,
  onStop,
}: VoiceButtonProps) {
  function handleClick() {
    if (status === "idle" || status === "error")    return onStart();
    if (status === "connected")                     return onToggleMute();
  }

  // Visual config per state
  const cfg = {
    idle: {
      color:   "rgba(232,213,183,0.3)",
      bg:      "transparent",
      border:  "rgba(200,162,96,0.12)",
      cursor:  "pointer",
    },
    requesting: {
      color:   "rgba(232,213,183,0.55)",
      bg:      "rgba(240,217,181,0.06)",
      border:  "rgba(200,162,96,0.2)",
      cursor:  "wait",
    },
    connecting: {
      color:   "#c8a56a",
      bg:      "rgba(200,162,96,0.1)",
      border:  "rgba(200,162,96,0.3)",
      cursor:  "default",
    },
    connected: {
      color:   isMuted ? "rgba(232,213,183,0.45)" : "#86efac",
      bg:      isMuted ? "rgba(240,217,181,0.06)" : "rgba(134,239,172,0.12)",
      border:  isMuted ? "rgba(200,162,96,0.15)"  : "rgba(134,239,172,0.35)",
      cursor:  "pointer",
    },
    error: {
      color:   "#f87171",
      bg:      "rgba(239,68,68,0.1)",
      border:  "rgba(239,68,68,0.3)",
      cursor:  "pointer",
    },
  }[status];

  const isSpinning = status === "requesting" || status === "connecting";

  return (
    <button
      onClick={handleClick}
      title={LABELS[status]}
      disabled={status === "requesting" || status === "connecting"}
      className="flex items-center justify-center rounded-lg transition-all"
      style={{
        width: "26px",
        height: "26px",
        color: cfg.color,
        background: cfg.bg,
        border: `1px solid ${cfg.border}`,
        cursor: cfg.cursor,
        position: "relative",
        flexShrink: 0,
      }}
    >
      {isSpinning ? (
        <span
          style={{
            width: "10px",
            height: "10px",
            borderRadius: "50%",
            border: "2px solid rgba(200,162,96,0.3)",
            borderTopColor: "#c8a56a",
            animation: "spin 0.8s linear infinite",
            display: "inline-block",
          }}
        />
      ) : (
        <MicSVG muted={status === "connected" && isMuted} />
      )}

      {/* Pulse ring when connected */}
      {status === "connected" && !isMuted && (
        <span
          style={{
            position: "absolute",
            inset: "-3px",
            borderRadius: "10px",
            border: "1.5px solid rgba(134,239,172,0.3)",
            animation: "voice-pulse 2s ease-in-out infinite",
            pointerEvents: "none",
          }}
        />
      )}

      <style>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
        @keyframes voice-pulse {
          0%, 100% { opacity: 0.3; transform: scale(1); }
          50%       { opacity: 0.7; transform: scale(1.08); }
        }
      `}</style>
    </button>
  );
}
