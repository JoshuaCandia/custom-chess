import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import type { TimeControl } from "../types/chess";
import type { AuthUser } from "../types/user";
import { apiFetchProfile } from "../lib/userApi";

interface LobbyProps {
  onCreateRoom: (timeControl: TimeControl) => void;
  onJoinRoom: (roomId: string) => void;
  error: string | null;
  onSignIn?: () => void;
  user?: AuthUser | null;
  onViewProfile?: () => void;
  onLogout?: () => void;
}

const TIME_OPTIONS: { label: string; sub: string; value: TimeControl }[] = [
  { label: "∞",   sub: "No limit", value: null },
  { label: "1′",  sub: "Bullet",   value: 60   },
  { label: "5′",  sub: "Blitz",    value: 300  },
  { label: "10′", sub: "Rapid",    value: 600  },
];

const lobbyVariants = {
  initial: { opacity: 0, y: 24 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] } },
  exit: { opacity: 0, y: -16, transition: { duration: 0.25, ease: "easeIn" } },
};

// ── Mini stats widget ──────────────────────────────────────────────────────────

function MiniStats({ username }: { username: string }) {
  const { data: profile, isLoading } = useQuery({
    queryKey: ["profile", username],
    queryFn: () => apiFetchProfile(username),
    staleTime: 30_000,
    retry: false,
  });

  const panelStyle: React.CSSProperties = {
    background: "var(--c-surface)",
    border: "1px solid var(--c-border-faint)",
    borderRadius: "16px",
    padding: "20px",
  };

  if (isLoading) {
    return (
      <div style={{ ...panelStyle, display: "flex", alignItems: "center", justifyContent: "center", minHeight: "120px" }}>
        <div style={{ display: "flex", gap: "5px" }}>
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              style={{
                width: "5px",
                height: "5px",
                borderRadius: "50%",
                background: "var(--c-accent)",
                opacity: 0.5,
                animation: `dot 1.4s ease-in-out ${i * 0.2}s infinite`,
              }}
            />
          ))}
        </div>
        <style>{`@keyframes dot { 0%,80%,100%{opacity:.2;transform:scale(.85)} 40%{opacity:.9;transform:scale(1)} }`}</style>
      </div>
    );
  }

  if (!profile) return null;

  const { stats, elo } = profile;
  const winPct  = stats.total > 0 ? (stats.wins   / stats.total) * 100 : 0;
  const drawPct = stats.total > 0 ? (stats.draws  / stats.total) * 100 : 0;
  const lossPct = stats.total > 0 ? (stats.losses / stats.total) * 100 : 0;

  return (
    <motion.div
      initial={{ opacity: 0, x: 16 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.4, delay: 0.15 }}
      style={{ ...panelStyle, display: "flex", flexDirection: "column", gap: "16px" }}
    >
      {/* ELO */}
      <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between" }}>
        <div>
          <p style={{ margin: 0, fontSize: "2rem", fontWeight: 800, color: "var(--c-text)", lineHeight: 1 }}>
            {elo}
          </p>
          <p style={{ margin: "4px 0 0", fontSize: "0.7rem", color: "var(--c-accent)", textTransform: "uppercase", letterSpacing: "0.08em", fontWeight: 600 }}>
            ELO Rating
          </p>
        </div>
        <span style={{ fontSize: "1.6rem", opacity: 0.12, color: "var(--c-text)" }}>♔</span>
      </div>

      {/* Win/draw/loss bar */}
      {stats.total > 0 ? (
        <>
          <div
            style={{
              height: "6px",
              borderRadius: "3px",
              overflow: "hidden",
              background: "var(--c-surface-2)",
              display: "flex",
            }}
          >
            <div style={{ width: `${winPct}%`,  background: "var(--c-win)",  transition: "width 0.6s ease" }} />
            <div style={{ width: `${drawPct}%`, background: "var(--c-draw)", transition: "width 0.6s ease" }} />
            <div style={{ width: `${lossPct}%`, background: "var(--c-loss)", transition: "width 0.6s ease" }} />
          </div>

          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <StatPill value={stats.wins}   label="W"        color="var(--c-win)"        />
            <StatPill value={stats.draws}  label="D"        color="var(--c-draw)"       />
            <StatPill value={stats.losses} label="L"        color="var(--c-loss)"       />
            <StatPill value={`${stats.winRate}%`} label="Win rate" color="var(--c-text-faint)" />
          </div>
        </>
      ) : (
        <p style={{ margin: 0, fontSize: "0.78rem", color: "var(--c-text-faint)", textAlign: "center", padding: "8px 0" }}>
          No games yet — create a room to start!
        </p>
      )}

      {/* Recent games */}
      {stats.recentGames.length > 0 && (
        <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
          <p style={{ margin: 0, fontSize: "0.68rem", fontWeight: 700, color: "var(--c-text-faint)", textTransform: "uppercase", letterSpacing: "0.1em" }}>
            Recent
          </p>
          {stats.recentGames.slice(0, 3).map((g) => {
            const isWin  = (g.color === "white" && g.result === "white") || (g.color === "black" && g.result === "black");
            const isDraw = g.result === "draw";
            const resultColor = isWin ? "var(--c-win)" : isDraw ? "var(--c-draw)" : "var(--c-loss)";
            const resultLabel = isWin ? "W" : isDraw ? "D" : "L";

            return (
              <div
                key={g.id}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                  padding: "6px 10px",
                  borderRadius: "8px",
                  background: "var(--c-surface-2)",
                  border: "1px solid var(--c-border-faint)",
                }}
              >
                <span style={{ fontSize: "0.9rem", color: "var(--c-text-muted)" }}>
                  {g.color === "white" ? "♔" : "♚"}
                </span>
                <span style={{ flex: 1, fontSize: "0.75rem", color: "var(--c-text-muted)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  vs {g.opponent}
                </span>
                <span style={{ fontSize: "0.75rem", fontWeight: 700, color: resultColor }}>
                  {resultLabel}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </motion.div>
  );
}

function StatPill({ value, label, color }: { value: number | string; label: string; color: string }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "2px" }}>
      <span style={{ fontSize: "1rem", fontWeight: 700, color, lineHeight: 1 }}>{value}</span>
      <span style={{ fontSize: "0.62rem", color: "var(--c-text-faint)", textTransform: "uppercase", letterSpacing: "0.05em" }}>{label}</span>
    </div>
  );
}

// ── Main Lobby ─────────────────────────────────────────────────────────────────

export function Lobby({ onCreateRoom, onJoinRoom, error, onSignIn, user, onViewProfile, onLogout }: LobbyProps) {
  const [timeControl, setTimeControl] = useState<TimeControl>(null);
  const [roomInput, setRoomInput] = useState("");
  const navigate = useNavigate();

  function handleJoin(e: React.FormEvent) {
    e.preventDefault();
    const id = roomInput.trim().toUpperCase();
    if (id) onJoinRoom(id);
  }

  const isLoggedIn = user != null;

  return (
    <motion.div
      variants={lobbyVariants}
      initial="initial"
      animate="animate"
      exit="exit"
      style={{ minHeight: "100svh", display: "flex", flexDirection: "column", background: "var(--c-bg)" }}
    >
      {/* ── Top nav ── */}
      <header
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "0 20px",
          height: "52px",
          flexShrink: 0,
          borderBottom: "1px solid var(--c-border-faint)",
          background: "var(--c-surface)",
        }}
      >
        {/* Logo */}
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <span style={{ fontSize: "1.2rem", lineHeight: 1 }}>♟</span>
          <span style={{ fontSize: "0.8rem", fontWeight: 700, letterSpacing: "-0.01em", color: "var(--c-text)" }}>
            Custom Chess
          </span>
        </div>

        {/* Actions */}
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          {/* Settings */}
          <button
            onClick={() => navigate("/settings")}
            title="Settings"
            style={{
              background: "none",
              border: "1px solid var(--c-border-faint)",
              borderRadius: "8px",
              padding: "5px 9px",
              color: "var(--c-text-faint)",
              fontSize: "0.85rem",
              cursor: "pointer",
              transition: "all 0.15s",
              lineHeight: 1,
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = "var(--c-border)";
              e.currentTarget.style.color = "var(--c-text-muted)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = "var(--c-border-faint)";
              e.currentTarget.style.color = "var(--c-text-faint)";
            }}
          >
            ⚙
          </button>

          {isLoggedIn ? (
            <>
              <button
                onClick={onViewProfile}
                style={{
                  background: "var(--c-accent-dim)",
                  border: "1px solid var(--c-border)",
                  borderRadius: "8px",
                  color: "var(--c-accent)",
                  fontSize: "0.78rem",
                  cursor: "pointer",
                  padding: "5px 12px",
                  fontWeight: 600,
                  transition: "background 0.15s",
                }}
                onMouseEnter={(e) => (e.currentTarget.style.background = "var(--c-border)")}
                onMouseLeave={(e) => (e.currentTarget.style.background = "var(--c-accent-dim)")}
              >
                {user.username}{user.elo != null ? ` · ${user.elo}` : ""}
              </button>
              <button
                onClick={onLogout}
                style={{
                  background: "none",
                  border: "1px solid var(--c-border-faint)",
                  borderRadius: "8px",
                  color: "var(--c-text-faint)",
                  fontSize: "0.78rem",
                  cursor: "pointer",
                  padding: "5px 10px",
                  transition: "color 0.15s",
                }}
                onMouseEnter={(e) => (e.currentTarget.style.color = "var(--c-text-muted)")}
                onMouseLeave={(e) => (e.currentTarget.style.color = "var(--c-text-faint)")}
              >
                Sign out
              </button>
            </>
          ) : onSignIn ? (
            <button
              onClick={onSignIn}
              style={{
                background: "var(--c-accent-dim)",
                border: "1px solid var(--c-border)",
                borderRadius: "8px",
                color: "var(--c-accent)",
                fontSize: "0.78rem",
                cursor: "pointer",
                padding: "5px 12px",
                fontWeight: 600,
                transition: "background 0.15s",
              }}
              onMouseEnter={(e) => (e.currentTarget.style.background = "var(--c-border)")}
              onMouseLeave={(e) => (e.currentTarget.style.background = "var(--c-accent-dim)")}
            >
              Sign in
            </button>
          ) : null}
        </div>
      </header>

      {/* ── Page body ── */}
      <div
        style={{
          flex: 1,
          display: "flex",
          alignItems: isLoggedIn ? "flex-start" : "center",
          justifyContent: "center",
          padding: isLoggedIn ? "40px 20px" : "0 20px",
        }}
      >
        <div
          style={{
            width: "100%",
            maxWidth: isLoggedIn ? "760px" : "340px",
            display: "grid",
            gridTemplateColumns: isLoggedIn ? "340px 1fr" : "1fr",
            gap: "24px",
            alignItems: "start",
          }}
        >
          {/* ── Play card ── */}
          <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
            {!isLoggedIn && (
              <div style={{ textAlign: "center", marginBottom: "4px" }}>
                <span style={{ fontSize: "2.5rem", lineHeight: 1 }}>♟</span>
                <h1 style={{ margin: "8px 0 4px", fontSize: "1.5rem", fontWeight: 800, letterSpacing: "-0.02em", color: "var(--c-text)" }}>
                  Custom Chess
                </h1>
                <p style={{ margin: 0, fontSize: "0.85rem", color: "var(--c-text-muted)" }}>
                  Play chess with your teammates
                </p>
              </div>
            )}

            {isLoggedIn && (
              <div>
                <h2 style={{ margin: "0 0 2px", fontSize: "1.25rem", fontWeight: 800, letterSpacing: "-0.02em", color: "var(--c-text)" }}>
                  Play a game
                </h2>
                <p style={{ margin: 0, fontSize: "0.82rem", color: "var(--c-text-faint)" }}>
                  Create a private room or join an existing one
                </p>
              </div>
            )}

            {/* Error */}
            {error && (
              <div
                style={{
                  padding: "10px 14px",
                  borderRadius: "10px",
                  background: "rgba(185,28,28,0.1)",
                  color: "var(--c-loss)",
                  border: "1px solid rgba(185,28,28,0.2)",
                  fontSize: "0.85rem",
                }}
              >
                {error}
              </div>
            )}

            {/* Time control */}
            <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
              <label
                style={{
                  fontSize: "0.68rem",
                  fontWeight: 700,
                  textTransform: "uppercase",
                  letterSpacing: "0.1em",
                  color: "var(--c-text-faint)",
                }}
              >
                Time control
              </label>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "6px" }}>
                {TIME_OPTIONS.map((opt) => {
                  const active = timeControl === opt.value;
                  return (
                    <button
                      key={String(opt.value)}
                      onClick={() => setTimeControl(opt.value)}
                      style={{
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "center",
                        gap: "2px",
                        padding: "10px 4px",
                        borderRadius: "10px",
                        fontSize: "0.9rem",
                        fontWeight: 700,
                        cursor: "pointer",
                        transition: "all 0.15s",
                        background: active ? "var(--c-accent)" : "var(--c-surface-2)",
                        color: active ? "var(--c-bg)" : "var(--c-text-muted)",
                        border: active ? "2px solid transparent" : "2px solid var(--c-border-faint)",
                      }}
                    >
                      {opt.label}
                      <span style={{ fontSize: "0.62rem", fontWeight: 400, opacity: 0.7 }}>{opt.sub}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Create room */}
            <button
              onClick={() => onCreateRoom(timeControl)}
              style={{
                width: "100%",
                padding: "13px",
                borderRadius: "12px",
                fontSize: "0.9rem",
                fontWeight: 700,
                cursor: "pointer",
                transition: "opacity 0.15s, transform 0.1s",
                background: "var(--c-accent)",
                color: "var(--c-bg)",
                border: "none",
              }}
              onMouseEnter={(e) => (e.currentTarget.style.opacity = "0.88")}
              onMouseLeave={(e) => (e.currentTarget.style.opacity = "1")}
              onMouseDown={(e) => (e.currentTarget.style.transform = "scale(0.98)")}
              onMouseUp={(e) => (e.currentTarget.style.transform = "scale(1)")}
            >
              Create Room
            </button>

            {/* Divider */}
            <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
              <div style={{ flex: 1, height: "1px", background: "var(--c-border-faint)" }} />
              <span style={{ fontSize: "0.72rem", color: "var(--c-text-faint)" }}>or join existing</span>
              <div style={{ flex: 1, height: "1px", background: "var(--c-border-faint)" }} />
            </div>

            {/* Join room */}
            <form onSubmit={handleJoin} style={{ display: "flex", gap: "8px" }}>
              <input
                type="text"
                placeholder="SALA-4F2"
                value={roomInput}
                onChange={(e) => setRoomInput(e.target.value)}
                style={{
                  flex: 1,
                  minWidth: 0,
                  padding: "10px 14px",
                  borderRadius: "10px",
                  fontSize: "0.875rem",
                  textTransform: "uppercase",
                  outline: "none",
                  background: "var(--c-surface)",
                  border: "1px solid var(--c-border-faint)",
                  color: "var(--c-text)",
                  transition: "border-color 0.15s",
                }}
                onFocus={(e) => (e.currentTarget.style.borderColor = "var(--c-accent)")}
                onBlur={(e) => (e.currentTarget.style.borderColor = "var(--c-border-faint)")}
              />
              <button
                type="submit"
                style={{
                  padding: "10px 18px",
                  borderRadius: "10px",
                  fontSize: "0.875rem",
                  fontWeight: 600,
                  cursor: "pointer",
                  background: "var(--c-surface-2)",
                  color: "var(--c-text)",
                  border: "1px solid var(--c-border)",
                  transition: "background 0.15s",
                }}
                onMouseEnter={(e) => (e.currentTarget.style.background = "var(--c-border-faint)")}
                onMouseLeave={(e) => (e.currentTarget.style.background = "var(--c-surface-2)")}
              >
                Join
              </button>
            </form>

            {/* Guest sign-in CTA */}
            {!isLoggedIn && onSignIn && (
              <button
                onClick={onSignIn}
                style={{
                  width: "100%",
                  padding: "10px",
                  borderRadius: "10px",
                  border: "1px solid var(--c-border-faint)",
                  background: "var(--c-accent-dim)",
                  color: "var(--c-accent)",
                  fontSize: "0.8rem",
                  fontWeight: 500,
                  cursor: "pointer",
                  transition: "all 0.15s",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "6px",
                }}
                onMouseEnter={(e) => (e.currentTarget.style.background = "var(--c-border-faint)")}
                onMouseLeave={(e) => (e.currentTarget.style.background = "var(--c-accent-dim)")}
              >
                ♟ Sign in to track your progress
              </button>
            )}
          </div>

          {/* ── Mini stats (logged-in only) ── */}
          {isLoggedIn && <MiniStats username={user.username} />}
        </div>
      </div>
    </motion.div>
  );
}
