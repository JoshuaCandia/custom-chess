import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { useColorMode } from "../store/colorModeStore";
import { useTheme } from "../hooks/useTheme";
import { useAuth } from "../hooks/useAuth";
import { ThemePicker } from "../components/ThemePicker";
import { BOARD_THEMES } from "../types/theme";
import { apiUpdateSettings } from "../lib/userApi";
import type { BoardTheme } from "../types/theme";

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div
      style={{
        background: "var(--c-surface)",
        border: "1px solid var(--c-border-faint)",
        borderRadius: "16px",
        padding: "20px",
      }}
    >
      <h3
        style={{
          margin: "0 0 16px",
          fontSize: "0.72rem",
          fontWeight: 700,
          color: "var(--c-text-faint)",
          textTransform: "uppercase",
          letterSpacing: "0.1em",
        }}
      >
        {title}
      </h3>
      {children}
    </div>
  );
}

export function SettingsPage() {
  const navigate = useNavigate();
  const { mode, setMode } = useColorMode();
  const { theme, changeTheme } = useTheme();
  const { user, logout } = useAuth();

  function handleBoardTheme(t: BoardTheme) {
    changeTheme(t);
    if (user) apiUpdateSettings({ theme: t.id }).catch(() => {});
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      style={{
        minHeight: "100svh",
        background: "var(--c-bg)",
        padding: "20px 16px",
        maxWidth: "520px",
        margin: "0 auto",
        display: "flex",
        flexDirection: "column",
        gap: "24px",
      }}
    >
      {/* Header */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: "8px",
        }}
      >
        <button
          onClick={() => navigate(-1)}
          style={{
            background: "none",
            border: "1px solid var(--c-border)",
            borderRadius: "8px",
            padding: "6px 12px",
            color: "var(--c-text-muted)",
            fontSize: "0.8rem",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            gap: "5px",
            transition: "border-color 0.15s, color 0.15s",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.borderColor = "var(--c-accent)";
            e.currentTarget.style.color = "var(--c-text)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.borderColor = "var(--c-border)";
            e.currentTarget.style.color = "var(--c-text-muted)";
          }}
        >
          ← Back
        </button>

        <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
          <span style={{ fontSize: "1rem" }}>♟</span>
          <span
            style={{
              fontSize: "0.72rem",
              fontWeight: 700,
              letterSpacing: "0.15em",
              textTransform: "uppercase",
              color: "var(--c-text-faint)",
            }}
          >
            Settings
          </span>
        </div>

        {/* Spacer to center the logo */}
        <div style={{ width: "72px" }} />
      </div>

      {/* Appearance */}
      <Section title="Appearance">
        {/* Color mode */}
        <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
          <label
            style={{ fontSize: "0.8rem", fontWeight: 600, color: "var(--c-text-muted)" }}
          >
            Color mode
          </label>
          <div
            style={{
              display: "flex",
              background: "var(--c-surface-2)",
              border: "1px solid var(--c-border-faint)",
              borderRadius: "10px",
              padding: "3px",
              gap: "3px",
            }}
          >
            {(["dark", "light"] as const).map((m) => (
              <button
                key={m}
                onClick={() => setMode(m)}
                style={{
                  flex: 1,
                  padding: "8px",
                  borderRadius: "8px",
                  border: "none",
                  background: mode === m ? "var(--c-accent-dim)" : "transparent",
                  color: mode === m ? "var(--c-accent)" : "var(--c-text-faint)",
                  fontWeight: 600,
                  fontSize: "0.8125rem",
                  cursor: "pointer",
                  transition: "all 0.15s",
                }}
              >
                {m === "dark" ? "🌙 Dark" : "☀️ Light"}
              </button>
            ))}
          </div>
        </div>

        {/* Board theme */}
        <div style={{ display: "flex", flexDirection: "column", gap: "8px", marginTop: "18px" }}>
          <label
            style={{ fontSize: "0.8rem", fontWeight: 600, color: "var(--c-text-muted)" }}
          >
            Board theme
          </label>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
            {BOARD_THEMES.map((t) => {
              const active = t.id === theme.id;
              return (
                <button
                  key={t.id}
                  title={t.name}
                  onClick={() => handleBoardTheme(t)}
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    gap: "6px",
                    padding: "8px",
                    borderRadius: "10px",
                    border: active
                      ? "2px solid var(--c-accent)"
                      : "2px solid var(--c-border-faint)",
                    background: active ? "var(--c-accent-dim)" : "transparent",
                    cursor: "pointer",
                    transition: "all 0.15s",
                  }}
                >
                  {/* 4×4 mini board preview */}
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "repeat(4, 14px)",
                      borderRadius: "4px",
                      overflow: "hidden",
                    }}
                  >
                    {Array.from({ length: 16 }, (_, i) => {
                      const row = Math.floor(i / 4);
                      const col = i % 4;
                      return (
                        <div
                          key={i}
                          style={{
                            width: 14,
                            height: 14,
                            background: (row + col) % 2 === 0 ? t.light : t.dark,
                          }}
                        />
                      );
                    })}
                  </div>
                  <span
                    style={{
                      fontSize: "0.65rem",
                      color: active ? "var(--c-accent)" : "var(--c-text-faint)",
                      fontWeight: active ? 600 : 400,
                    }}
                  >
                    {t.name}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </Section>

      {/* Account */}
      {user && (
        <Section title="Account">
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              marginBottom: "14px",
            }}
          >
            <div>
              <p
                style={{
                  margin: "0 0 2px",
                  fontSize: "0.9rem",
                  fontWeight: 600,
                  color: "var(--c-text)",
                }}
              >
                {user.username}
                {user.elo != null && (
                  <span
                    style={{
                      marginLeft: "8px",
                      fontSize: "0.78rem",
                      fontWeight: 500,
                      color: "var(--c-accent)",
                    }}
                  >
                    {user.elo} ELO
                  </span>
                )}
              </p>
              {user.email && (
                <p style={{ margin: 0, fontSize: "0.75rem", color: "var(--c-text-muted)" }}>
                  {user.email}
                </p>
              )}
            </div>
            <button
              onClick={() => navigate(`/profile/${user.username}`)}
              style={{
                background: "var(--c-accent-dim)",
                border: "1px solid var(--c-border)",
                borderRadius: "8px",
                padding: "6px 14px",
                color: "var(--c-accent)",
                fontSize: "0.78rem",
                fontWeight: 600,
                cursor: "pointer",
                transition: "background 0.15s",
              }}
              onMouseEnter={(e) =>
                (e.currentTarget.style.background = "rgba(200,162,96,0.2)")
              }
              onMouseLeave={(e) =>
                (e.currentTarget.style.background = "var(--c-accent-dim)")
              }
            >
              View Profile
            </button>
          </div>

          <button
            onClick={() => {
              logout();
              navigate("/login");
            }}
            style={{
              width: "100%",
              padding: "9px",
              borderRadius: "10px",
              border: "1px solid var(--c-border-faint)",
              background: "transparent",
              color: "var(--c-text-muted)",
              fontSize: "0.8rem",
              cursor: "pointer",
              transition: "all 0.15s",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = "rgba(239,68,68,0.08)";
              e.currentTarget.style.color = "rgba(239,68,68,0.7)";
              e.currentTarget.style.borderColor = "rgba(239,68,68,0.2)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = "transparent";
              e.currentTarget.style.color = "var(--c-text-muted)";
              e.currentTarget.style.borderColor = "var(--c-border-faint)";
            }}
          >
            Sign out
          </button>
        </Section>
      )}
    </motion.div>
  );
}
