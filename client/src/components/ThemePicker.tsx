import { BOARD_THEMES, type BoardTheme } from "../types/theme";

interface ThemePickerProps {
  current: BoardTheme;
  onChange: (t: BoardTheme) => void;
}

export function ThemePicker({ current, onChange }: ThemePickerProps) {
  return (
    <div className="flex items-center gap-1.5">
      {BOARD_THEMES.map((t) => {
        const active = t.id === current.id;
        return (
          <button
            key={t.id}
            title={t.name}
            onClick={() => onChange(t)}
            style={{
              width: "20px",
              height: "20px",
              padding: 0,
              borderRadius: "4px",
              border: active
                ? "2px solid rgba(232,213,183,0.8)"
                : "2px solid rgba(232,213,183,0.15)",
              overflow: "hidden",
              cursor: "pointer",
              background: "none",
              flexShrink: 0,
              transition: "border-color 0.15s",
            }}
          >
            {/* 2×2 mini checkerboard */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                width: "100%",
                height: "100%",
              }}
            >
              <div style={{ background: t.light }} />
              <div style={{ background: t.dark }} />
              <div style={{ background: t.dark }} />
              <div style={{ background: t.light }} />
            </div>
          </button>
        );
      })}
    </div>
  );
}
