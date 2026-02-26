import { create } from "zustand";

type Mode = "dark" | "light";

function apply(mode: Mode) {
  document.documentElement.classList.toggle("light", mode === "light");
  try { localStorage.setItem("chess_color_mode", mode); } catch { /* ignore */ }
}

// Apply immediately (before React renders) to prevent flash
const initial = (localStorage.getItem("chess_color_mode") as Mode | null) ?? "dark";
apply(initial);

interface ColorModeStore {
  mode: Mode;
  toggle: () => void;
  setMode: (m: Mode) => void;
}

export const useColorMode = create<ColorModeStore>((set) => ({
  mode: initial,
  toggle: () =>
    set((s) => {
      const next: Mode = s.mode === "dark" ? "light" : "dark";
      apply(next);
      return { mode: next };
    }),
  setMode: (m) =>
    set(() => {
      apply(m);
      return { mode: m };
    }),
}));
