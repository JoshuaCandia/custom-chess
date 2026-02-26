import { useState } from "react";
import { motion } from "framer-motion";
import type { TimeControl } from "../types/chess";

interface LobbyProps {
  onCreateRoom: (timeControl: TimeControl) => void;
  onJoinRoom: (roomId: string) => void;
  error: string | null;
  onSignIn?: () => void;
}

const TIME_OPTIONS: { label: string; sub: string; value: TimeControl }[] = [
  { label: "∞",   sub: "No limit", value: null },
  { label: "1'",  sub: "Bullet",   value: 60   },
  { label: "5'",  sub: "Blitz",    value: 300  },
  { label: "10'", sub: "Rapid",    value: 600  },
];

const lobbyVariants = {
  initial: { opacity: 0, y: 24 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] } },
  exit: { opacity: 0, y: -16, transition: { duration: 0.25, ease: "easeIn" } },
};

export function Lobby({ onCreateRoom, onJoinRoom, error, onSignIn }: LobbyProps) {
  const [timeControl, setTimeControl] = useState<TimeControl>(null);
  const [roomInput, setRoomInput] = useState("");

  function handleJoin(e: React.FormEvent) {
    e.preventDefault();
    const id = roomInput.trim().toUpperCase();
    if (id) onJoinRoom(id);
  }

  return (
    <motion.div
      variants={lobbyVariants}
      initial="initial"
      animate="animate"
      exit="exit"
      className="flex flex-col items-center justify-center min-h-screen p-6"
    >
      <div className="w-full max-w-[340px] flex flex-col gap-7">

        {/* Logo + title */}
        <div className="flex flex-col items-center gap-2">
          <span style={{ fontSize: "2.5rem", lineHeight: 1 }}>♟</span>
          <h1 className="text-2xl font-bold tracking-tight">Custom Chess</h1>
          <p className="text-sm" style={{ color: "rgba(232,213,183,0.5)" }}>
            Play chess with your teammates
          </p>
          {onSignIn && (
            <button
              onClick={onSignIn}
              style={{
                marginTop: "4px",
                background: "none",
                border: "none",
                color: "rgba(200,162,96,0.65)",
                fontSize: "0.78rem",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: "4px",
                padding: "4px 8px",
                borderRadius: "6px",
                transition: "color 0.15s",
              }}
              onMouseEnter={(e) => (e.currentTarget.style.color = "#c8a56a")}
              onMouseLeave={(e) => (e.currentTarget.style.color = "rgba(200,162,96,0.65)")}
            >
              <span>♟</span> Sign in to save your progress
            </button>
          )}
        </div>

        {/* Error */}
        {error && (
          <div
            className="text-sm text-center px-3 py-2 rounded-lg"
            style={{
              background: "rgba(239,68,68,0.15)",
              color: "#fca5a5",
              border: "1px solid rgba(239,68,68,0.3)",
            }}
          >
            {error}
          </div>
        )}

        {/* Time control */}
        <div className="flex flex-col gap-2.5">
          <label
            className="text-xs font-medium uppercase tracking-widest"
            style={{ color: "rgba(232,213,183,0.4)" }}
          >
            Time control
          </label>
          <div className="grid grid-cols-4 gap-1.5">
            {TIME_OPTIONS.map((opt) => {
              const active = timeControl === opt.value;
              return (
                <button
                  key={String(opt.value)}
                  onClick={() => setTimeControl(opt.value)}
                  className="flex flex-col items-center gap-0.5 py-2.5 rounded-lg text-sm font-semibold transition-all"
                  style={{
                    background: active ? "#c8a56a" : "rgba(240,217,181,0.06)",
                    color: active ? "#1c1512" : "rgba(232,213,183,0.65)",
                    border: active ? "none" : "1px solid rgba(200,162,96,0.15)",
                  }}
                >
                  {opt.label}
                  <span className="text-[10px] font-normal opacity-70">{opt.sub}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Create room */}
        <button
          onClick={() => onCreateRoom(timeControl)}
          className="w-full py-3 rounded-xl text-sm font-semibold transition-all active:scale-[0.98]"
          style={{ background: "#c8a56a", color: "#1c1512" }}
          onMouseEnter={(e) => (e.currentTarget.style.background = "#d4b47a")}
          onMouseLeave={(e) => (e.currentTarget.style.background = "#c8a56a")}
        >
          Create Room
        </button>

        {/* Divider */}
        <div className="flex items-center gap-3">
          <div className="flex-1 h-px" style={{ background: "rgba(200,162,96,0.15)" }} />
          <span className="text-xs" style={{ color: "rgba(232,213,183,0.3)" }}>or join existing</span>
          <div className="flex-1 h-px" style={{ background: "rgba(200,162,96,0.15)" }} />
        </div>

        {/* Join room */}
        <form onSubmit={handleJoin} className="flex gap-2">
          <input
            type="text"
            placeholder="SALA-4F2"
            value={roomInput}
            onChange={(e) => setRoomInput(e.target.value)}
            className="flex-1 min-w-0 px-3 py-2.5 rounded-xl text-sm uppercase outline-none transition-all"
            style={{
              background: "rgba(240,217,181,0.06)",
              border: "1px solid rgba(200,162,96,0.2)",
              color: "#e8d5b7",
            }}
            onFocus={(e) => (e.currentTarget.style.borderColor = "rgba(200,162,96,0.5)")}
            onBlur={(e) => (e.currentTarget.style.borderColor = "rgba(200,162,96,0.2)")}
          />
          <button
            type="submit"
            className="px-4 py-2.5 rounded-xl text-sm font-semibold transition-all active:scale-[0.98]"
            style={{
              background: "rgba(240,217,181,0.08)",
              color: "#e8d5b7",
              border: "1px solid rgba(200,162,96,0.2)",
            }}
            onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(240,217,181,0.14)")}
            onMouseLeave={(e) => (e.currentTarget.style.background = "rgba(240,217,181,0.08)")}
          >
            Join
          </button>
        </form>

      </div>
    </motion.div>
  );
}
