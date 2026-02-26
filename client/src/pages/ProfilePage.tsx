import { useParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { apiFetchProfile } from "../lib/userApi";
import type { GameRecord } from "../types/user";

function StatCard({ label, value, sub }: { label: string; value: string | number; sub?: string }) {
  return (
    <div
      style={{
        background: "rgba(240,217,181,0.04)",
        border: "1px solid rgba(200,162,96,0.14)",
        borderRadius: "14px",
        padding: "18px 16px",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: "4px",
        minWidth: "80px",
      }}
    >
      <span style={{ fontSize: "1.75rem", fontWeight: 800, color: "#e8d5b7", lineHeight: 1 }}>
        {value}
      </span>
      <span style={{ fontSize: "0.7rem", color: "rgba(232,213,183,0.45)", textTransform: "uppercase", letterSpacing: "0.08em" }}>
        {label}
      </span>
      {sub && (
        <span style={{ fontSize: "0.7rem", color: "rgba(200,162,96,0.5)" }}>{sub}</span>
      )}
    </div>
  );
}

function ColorBar({ label, wins, losses, draws, played }: {
  label: string; wins: number; losses: number; draws: number; played: number;
}) {
  const winPct = played > 0 ? (wins / played) * 100 : 0;
  const lossPct = played > 0 ? (losses / played) * 100 : 0;
  const drawPct = played > 0 ? (draws / played) * 100 : 0;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <span style={{ fontSize: "0.8rem", fontWeight: 600, color: "rgba(232,213,183,0.7)" }}>
          {label}
        </span>
        <span style={{ fontSize: "0.75rem", color: "rgba(232,213,183,0.35)" }}>
          {played} games
        </span>
      </div>

      {/* Progress bar */}
      <div style={{ height: "6px", borderRadius: "3px", overflow: "hidden", background: "rgba(240,217,181,0.06)", display: "flex" }}>
        <div style={{ width: `${winPct}%`, background: "#4ade80", transition: "width 0.6s ease" }} />
        <div style={{ width: `${drawPct}%`, background: "rgba(200,162,96,0.5)", transition: "width 0.6s ease" }} />
        <div style={{ width: `${lossPct}%`, background: "rgba(239,68,68,0.6)", transition: "width 0.6s ease" }} />
      </div>

      <div style={{ display: "flex", gap: "16px" }}>
        <span style={{ fontSize: "0.75rem", color: "#4ade80" }}>{wins}W</span>
        <span style={{ fontSize: "0.75rem", color: "rgba(200,162,96,0.7)" }}>{draws}D</span>
        <span style={{ fontSize: "0.75rem", color: "rgba(239,68,68,0.7)" }}>{losses}L</span>
      </div>
    </div>
  );
}

function RecentGameRow({ game }: { game: GameRecord }) {
  const isWin =
    (game.color === "white" && game.result === "white") ||
    (game.color === "black" && game.result === "black");
  const isDraw = game.result === "draw";

  const resultColor = isWin ? "#4ade80" : isDraw ? "rgba(200,162,96,0.7)" : "rgba(239,68,68,0.7)";
  const resultLabel = isWin ? "Win" : isDraw ? "Draw" : "Loss";
  const pieceIcon = game.color === "white" ? "♔" : "♚";

  const reasonLabel: Record<string, string> = {
    checkmate: "Checkmate",
    timeout: "Timeout",
    stalemate: "Stalemate",
    draw: "Draw",
  };

  const timeAgo = (() => {
    const diff = Date.now() - new Date(game.playedAt).getTime();
    const m = Math.floor(diff / 60000);
    if (m < 60) return `${m}m ago`;
    const h = Math.floor(m / 60);
    if (h < 24) return `${h}h ago`;
    return `${Math.floor(h / 24)}d ago`;
  })();

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: "12px",
        padding: "10px 14px",
        borderRadius: "10px",
        background: "rgba(240,217,181,0.03)",
        border: "1px solid rgba(200,162,96,0.08)",
      }}
    >
      <span style={{ fontSize: "1.1rem", color: game.color === "white" ? "rgba(200,162,96,0.9)" : "rgba(232,213,183,0.6)" }}>
        {pieceIcon}
      </span>
      <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: "2px" }}>
        <span style={{ fontSize: "0.8rem", color: "#e8d5b7" }}>vs {game.opponent}</span>
        <span style={{ fontSize: "0.7rem", color: "rgba(232,213,183,0.35)" }}>
          {reasonLabel[game.reason] ?? game.reason}
          {game.timeControl ? ` · ${game.timeControl / 60}min` : ""}
          {" · "}{game.moveCount} moves
        </span>
      </div>
      <span style={{ fontSize: "0.8rem", fontWeight: 700, color: resultColor }}>{resultLabel}</span>
      <span style={{ fontSize: "0.7rem", color: "rgba(232,213,183,0.28)", minWidth: "48px", textAlign: "right" }}>{timeAgo}</span>
    </div>
  );
}

export function ProfilePage() {
  const { username } = useParams<{ username: string }>();
  const navigate = useNavigate();

  const { data: profile, isLoading, error } = useQuery({
    queryKey: ["profile", username],
    queryFn: () => apiFetchProfile(username!),
    enabled: !!username,
    retry: false,
  });

  const joinedDate = profile
    ? new Date(profile.createdAt).toLocaleDateString("en-US", { month: "long", year: "numeric" })
    : "";

  const initials = (username ?? "?").slice(0, 2).toUpperCase();

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      style={{
        minHeight: "100svh",
        padding: "20px 16px",
        maxWidth: "640px",
        margin: "0 auto",
        display: "flex",
        flexDirection: "column",
        gap: "0",
      }}
    >
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "32px" }}>
        <button
          onClick={() => navigate(-1)}
          style={{
            background: "none",
            border: "1px solid rgba(200,162,96,0.18)",
            borderRadius: "8px",
            padding: "6px 12px",
            color: "rgba(232,213,183,0.55)",
            fontSize: "0.8rem",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            gap: "6px",
            transition: "all 0.15s",
          }}
          onMouseEnter={(e) => { e.currentTarget.style.borderColor = "rgba(200,162,96,0.4)"; e.currentTarget.style.color = "#e8d5b7"; }}
          onMouseLeave={(e) => { e.currentTarget.style.borderColor = "rgba(200,162,96,0.18)"; e.currentTarget.style.color = "rgba(232,213,183,0.55)"; }}
        >
          ← Back
        </button>
        <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
          <span style={{ fontSize: "1rem" }}>♟</span>
          <span style={{ fontSize: "0.7rem", fontWeight: 700, letterSpacing: "0.15em", textTransform: "uppercase", color: "rgba(200,162,96,0.55)" }}>
            Custom Chess
          </span>
        </div>
      </div>

      {isLoading && (
        <div style={{ display: "flex", justifyContent: "center", paddingTop: "80px" }}>
          <div style={{ display: "flex", gap: "6px" }}>
            {[0, 1, 2].map((i) => (
              <div key={i} style={{ width: "6px", height: "6px", borderRadius: "50%", background: "rgba(200,162,96,0.4)", animation: `pulse 1.4s ease-in-out ${i * 0.2}s infinite` }} />
            ))}
          </div>
          <style>{`@keyframes pulse { 0%,80%,100%{opacity:.25;transform:scale(.85)} 40%{opacity:1;transform:scale(1)} }`}</style>
        </div>
      )}

      {error && (
        <div style={{ textAlign: "center", paddingTop: "80px", color: "rgba(232,213,183,0.4)" }}>
          <div style={{ fontSize: "2rem", marginBottom: "12px" }}>♟</div>
          <p style={{ margin: 0 }}>User not found</p>
        </div>
      )}

      {profile && (
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          style={{ display: "flex", flexDirection: "column", gap: "24px" }}
        >
          {/* Identity */}
          <div style={{ display: "flex", alignItems: "center", gap: "20px" }}>
            <div
              style={{
                width: "64px",
                height: "64px",
                borderRadius: "50%",
                background: "rgba(200,162,96,0.12)",
                border: "2px solid rgba(200,162,96,0.25)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "1.4rem",
                fontWeight: 800,
                color: "#c8a56a",
                flexShrink: 0,
              }}
            >
              {initials}
            </div>
            <div>
              <h1 style={{ margin: "0 0 4px", fontSize: "1.5rem", fontWeight: 800, color: "#e8d5b7", letterSpacing: "-0.02em" }}>
                {profile.username}
              </h1>
              <p style={{ margin: 0, fontSize: "0.78rem", color: "rgba(232,213,183,0.35)" }}>
                Member since {joinedDate}
              </p>
            </div>
          </div>

          {/* Stats grid */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: "10px" }}>
            <StatCard label="ELO" value={profile.elo} />
            <StatCard label="Games" value={profile.stats.total} />
            <StatCard label="Wins" value={profile.stats.wins} />
            <StatCard label="Win %" value={`${profile.stats.winRate}%`} />
            <StatCard label="Draws" value={profile.stats.draws} />
          </div>

          {/* Color breakdown */}
          {profile.stats.total > 0 && (
            <div
              style={{
                background: "rgba(240,217,181,0.03)",
                border: "1px solid rgba(200,162,96,0.1)",
                borderRadius: "14px",
                padding: "20px",
                display: "flex",
                flexDirection: "column",
                gap: "16px",
              }}
            >
              <h3 style={{ margin: 0, fontSize: "0.8rem", fontWeight: 700, color: "rgba(232,213,183,0.5)", textTransform: "uppercase", letterSpacing: "0.1em" }}>
                Performance by Color
              </h3>
              <ColorBar label="As White ♔" {...profile.stats.asWhite} />
              <ColorBar label="As Black ♚" {...profile.stats.asBlack} />
            </div>
          )}

          {/* Recent games */}
          {profile.stats.recentGames.length > 0 && (
            <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
              <h3 style={{ margin: 0, fontSize: "0.8rem", fontWeight: 700, color: "rgba(232,213,183,0.5)", textTransform: "uppercase", letterSpacing: "0.1em" }}>
                Recent Games
              </h3>
              <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                {profile.stats.recentGames.map((g) => (
                  <RecentGameRow key={g.id} game={g} />
                ))}
              </div>
            </div>
          )}

          {profile.stats.total === 0 && (
            <div style={{ textAlign: "center", padding: "32px 0", color: "rgba(232,213,183,0.3)" }}>
              <div style={{ fontSize: "2rem", marginBottom: "8px" }}>♟</div>
              <p style={{ margin: 0, fontSize: "0.85rem" }}>No games played yet</p>
            </div>
          )}
        </motion.div>
      )}
    </motion.div>
  );
}
