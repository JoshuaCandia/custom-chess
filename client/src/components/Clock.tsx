import { useEffect, useState } from "react";

interface ClockProps {
  timeMs: number;
  isActive: boolean;
  label: string;
}

export function Clock({ timeMs, isActive, label }: ClockProps) {
  const [displayMs, setDisplayMs] = useState(timeMs);

  useEffect(() => {
    setDisplayMs(timeMs);
  }, [timeMs]);

  useEffect(() => {
    if (!isActive || displayMs <= 0) return;
    const id = setInterval(() => setDisplayMs((p) => Math.max(0, p - 100)), 100);
    return () => clearInterval(id);
  }, [isActive, timeMs]);

  const totalSec = Math.ceil(displayMs / 1000);
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  const isLow = displayMs < 30_000;

  return (
    <div
      className={`flex items-center justify-between px-3 py-1.5 rounded-lg w-full transition-colors ${
        isActive
          ? isLow
            ? "bg-red-700"
            : "bg-gray-700"
          : "bg-gray-800 opacity-50"
      }`}
    >
      <span className="text-xs text-gray-400">{label}</span>
      <span
        className={`font-mono text-base font-bold tabular-nums ${
          isLow ? "text-red-300" : "text-white"
        }`}
      >
        {String(m).padStart(2, "0")}:{String(s).padStart(2, "0")}
      </span>
    </div>
  );
}
