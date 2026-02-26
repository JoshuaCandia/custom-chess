import { useEffect, useState } from "react";
import type { Color } from "../types/chess";

interface PlayerRowProps {
  colorSide: Color;
  label: string;
  username?: string;
  timeMs: number;
  isActive: boolean;
  showClock: boolean;
}

export function PlayerRow({
  colorSide,
  label,
  username,
  timeMs,
  isActive,
  showClock,
}: PlayerRowProps) {
  const [displayMs, setDisplayMs] = useState(timeMs);

  useEffect(() => {
    setDisplayMs(timeMs);
  }, [timeMs]);

  useEffect(() => {
    if (!isActive || !showClock || displayMs <= 0) return;
    const id = setInterval(
      () => setDisplayMs((p) => Math.max(0, p - 100)),
      100
    );
    return () => clearInterval(id);
  }, [isActive, timeMs, showClock]);

  const totalSec = Math.ceil(displayMs / 1000);
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  const isLow = showClock && displayMs < 30_000 && displayMs > 0;

  return (
    <div
      className="flex items-center justify-between shrink-0 px-3 py-2 rounded-xl transition-all"
      style={{
        background: isActive ? "rgba(200,162,96,0.08)" : "transparent",
        border: "1px solid",
        borderColor: isActive ? "rgba(200,162,96,0.3)" : "rgba(200,162,96,0.08)",
      }}
    >
      {/* Left: color dot + name */}
      <div className="flex items-center gap-2.5">
        <div
          className="w-3 h-3 rounded-full flex-shrink-0"
          style={
            colorSide === "w"
              ? { background: "#f0d9b5", boxShadow: "0 0 0 1.5px rgba(200,162,96,0.4)" }
              : { background: "#3d2b1a", border: "1.5px solid rgba(200,162,96,0.5)" }
          }
        />
        <span
          className="text-sm font-medium leading-none"
          style={{ color: isActive ? "#e8d5b7" : "rgba(232,213,183,0.55)" }}
        >
          {username ?? label}
        </span>
        <span
          className="text-xs leading-none"
          style={{ color: "rgba(232,213,183,0.3)" }}
        >
          {colorSide === "w" ? "White" : "Black"}
        </span>
      </div>

      {/* Right: clock */}
      {showClock && (
        <span
          className="font-mono text-sm font-semibold tabular-nums leading-none"
          style={{
            color: isLow
              ? "#f87171"
              : isActive
              ? "#e8d5b7"
              : "rgba(232,213,183,0.4)",
          }}
        >
          {String(m).padStart(2, "0")}:{String(s).padStart(2, "0")}
        </span>
      )}
    </div>
  );
}
