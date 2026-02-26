import { useState } from "react";
import { BOARD_THEMES, type BoardTheme } from "../types/theme";

const STORAGE_KEY = "chess-board-theme";

export function useTheme() {
  const [theme, setTheme] = useState<BoardTheme>(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    return BOARD_THEMES.find((t) => t.id === saved) ?? BOARD_THEMES[0];
  });

  function changeTheme(t: BoardTheme) {
    setTheme(t);
    localStorage.setItem(STORAGE_KEY, t.id);
  }

  return { theme, changeTheme };
}
