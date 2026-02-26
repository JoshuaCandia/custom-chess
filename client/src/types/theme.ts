export interface BoardTheme {
  id: string;
  name: string;
  light: string;       // light square color
  dark: string;        // dark square color
  border: string;      // board border color
  dotOnLight: string;  // valid-move dot on light squares
  dotOnDark: string;   // valid-move dot on dark squares
  ringOnLight: string; // capture-ring on light squares
  ringOnDark: string;  // capture-ring on dark squares
}

export const BOARD_THEMES: BoardTheme[] = [
  {
    id: "classic",
    name: "Classic",
    light: "#f0d9b5",
    dark: "#b58863",
    border: "#8b6340",
    dotOnLight: "rgba(0,0,0,0.18)",
    dotOnDark:  "rgba(0,0,0,0.30)",
    ringOnLight: "rgba(0,0,0,0.14)",
    ringOnDark:  "rgba(0,0,0,0.25)",
  },
  {
    id: "green",
    name: "Green",
    light: "#eeeed2",
    dark: "#769656",
    border: "#5a7a3a",
    dotOnLight: "rgba(0,0,0,0.15)",
    dotOnDark:  "rgba(0,0,0,0.25)",
    ringOnLight: "rgba(0,0,0,0.12)",
    ringOnDark:  "rgba(0,0,0,0.20)",
  },
  {
    id: "blue",
    name: "Blue",
    light: "#dee3e6",
    dark: "#8ca2ad",
    border: "#6a8090",
    dotOnLight: "rgba(0,0,0,0.15)",
    dotOnDark:  "rgba(0,0,0,0.22)",
    ringOnLight: "rgba(0,0,0,0.12)",
    ringOnDark:  "rgba(0,0,0,0.18)",
  },
  {
    id: "walnut",
    name: "Walnut",
    light: "#f0d9b5",
    dark: "#6b3a2a",
    border: "#4a2218",
    dotOnLight: "rgba(0,0,0,0.18)",
    dotOnDark:  "rgba(255,255,255,0.30)",
    ringOnLight: "rgba(0,0,0,0.14)",
    ringOnDark:  "rgba(255,255,255,0.25)",
  },
  {
    id: "midnight",
    name: "Midnight",
    light: "#aab0c0",
    dark: "#404868",
    border: "#2a3050",
    dotOnLight: "rgba(0,0,0,0.20)",
    dotOnDark:  "rgba(255,255,255,0.35)",
    ringOnLight: "rgba(0,0,0,0.16)",
    ringOnDark:  "rgba(255,255,255,0.28)",
  },
];
