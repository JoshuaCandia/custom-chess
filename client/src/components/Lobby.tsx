import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import type { TimeControl } from "../types/chess";
import type { AuthUser } from "../types/user";
import { apiFetchProfile } from "../lib/userApi";
import { AppLayout } from "./AppLayout";

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
  { label: "∞",   sub: "Sin límite", value: null },
  { label: "1′",  sub: "Bullet",     value: 60   },
  { label: "5′",  sub: "Blitz",      value: 300  },
  { label: "10′", sub: "Rapid",      value: 600  },
];

const lobbyVariants = {
  initial: { opacity: 0, y: 24 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] } },
  exit:    { opacity: 0, y: -16, transition: { duration: 0.25, ease: "easeIn" } },
};

// ── Loading dots ──────────────────────────────────────────────────────────────
function LoadingDots() {
  return (
    <div className="flex gap-1.5">
      {[0, 1, 2].map((i) => (
        <div
          key={i}
          className="w-1.5 h-1.5 rounded-full bg-c-accent"
          style={{ animation: `dot 1.4s ease-in-out ${i * 0.2}s infinite` }}
        />
      ))}
    </div>
  );
}

// ── Mini stats widget ─────────────────────────────────────────────────────────
function MiniStats({ username }: { username: string }) {
  const { data: profile, isLoading } = useQuery({
    queryKey: ["profile", username],
    queryFn: () => apiFetchProfile(username),
    staleTime: 30_000,
    retry: false,
  });

  if (isLoading) {
    return (
      <div className="card flex items-center justify-center min-h-[120px]">
        <LoadingDots />
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
      className="card flex flex-col gap-4"
    >
      {/* ELO */}
      <div className="flex items-end justify-between">
        <div>
          <p className="m-0 text-[2rem] font-extrabold text-c-base leading-none">{elo}</p>
          <p className="m-0 mt-1 label-xs text-c-accent">ELO Rating</p>
        </div>
        <span className="text-[1.6rem] opacity-10 text-c-base">♔</span>
      </div>

      {/* Progress bar */}
      {stats.total > 0 ? (
        <>
          <div className="h-1.5 rounded-full overflow-hidden bg-c-surface2 flex">
            <div className="bg-c-win  transition-[width_0.6s]" style={{ width: `${winPct}%` }} />
            <div className="bg-c-draw transition-[width_0.6s]" style={{ width: `${drawPct}%` }} />
            <div className="bg-c-loss transition-[width_0.6s]" style={{ width: `${lossPct}%` }} />
          </div>

          <div className="flex justify-between">
            <StatPill value={stats.wins}           label="V"       colorClass="text-c-win"   />
            <StatPill value={stats.draws}          label="E"       colorClass="text-c-draw"  />
            <StatPill value={stats.losses}         label="D"       colorClass="text-c-loss"  />
            <StatPill value={`${stats.winRate}%`}  label="% vic."  colorClass="text-c-faint" />
          </div>
        </>
      ) : (
        <p className="m-0 text-[0.78rem] text-c-faint text-center py-2">
          Sin partidas — ¡creá una sala!
        </p>
      )}

      {/* Recent games */}
      {stats.recentGames.length > 0 && (
        <div className="flex flex-col gap-1.5">
          <p className="m-0 label-xs">Recientes</p>
          {stats.recentGames.slice(0, 3).map((g) => {
            const isWin  = (g.color === "white" && g.result === "white") || (g.color === "black" && g.result === "black");
            const isDraw = g.result === "draw";
            const resultClass = isWin ? "text-c-win" : isDraw ? "text-c-draw" : "text-c-loss";

            return (
              <div
                key={g.id}
                className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-c-surface2 border border-c-faint"
              >
                <span className="text-c-muted">{g.color === "white" ? "♔" : "♚"}</span>
                <span className="flex-1 text-xs text-c-muted truncate">vs {g.opponent}</span>
                <span className={`text-xs font-bold ${resultClass}`}>
                  {isWin ? "V" : isDraw ? "E" : "D"}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </motion.div>
  );
}

function StatPill({ value, label, colorClass }: { value: number | string; label: string; colorClass: string }) {
  return (
    <div className="flex flex-col items-center gap-0.5">
      <span className={`text-base font-bold leading-none ${colorClass}`}>{value}</span>
      <span className="text-[0.62rem] text-c-faint uppercase tracking-wide">{label}</span>
    </div>
  );
}

// ── Main Lobby ────────────────────────────────────────────────────────────────
export function Lobby({ onCreateRoom, onJoinRoom, error, onSignIn, user, onViewProfile }: LobbyProps) {
  const [timeControl, setTimeControl] = useState<TimeControl>(null);
  const [roomInput, setRoomInput] = useState("");
  const isLoggedIn = user != null;

  function handleJoin(e: React.FormEvent) {
    e.preventDefault();
    const id = roomInput.trim().toUpperCase();
    if (id) onJoinRoom(id);
  }

  return (
    <AppLayout>
    <motion.div
      variants={lobbyVariants}
      initial="initial"
      animate="animate"
      exit="exit"
      className="min-h-svh flex flex-col bg-c-bg"
    >
      {/* ── Top nav (mobile only — sidebar handles desktop) ── */}
      <header className="page-nav sm:hidden">
        <div className="flex items-center gap-2">
          <span className="text-xl leading-none">♟</span>
          <span className="text-sm font-bold tracking-tight text-c-base">Custom Chess</span>
        </div>

        <div className="flex items-center gap-2">
          {isLoggedIn ? (
            <button
              className="btn btn-accent-outline text-xs max-w-[160px] truncate"
              onClick={onViewProfile}
            >
              {user.username}{user.elo != null ? ` · ${user.elo}` : ""}
            </button>
          ) : onSignIn ? (
            <button className="btn btn-accent-outline text-xs" onClick={onSignIn}>
              Iniciar sesión
            </button>
          ) : null}
        </div>
      </header>

      {/* ── Page body ── */}
      <div className={`flex-1 flex justify-center px-4 pb-24 md:pb-8 ${isLoggedIn ? "items-start pt-8" : "items-center py-8"}`}>
        <div className={`w-full ${isLoggedIn ? "max-w-[760px]" : "max-w-sm"}`}>
          <div className={isLoggedIn ? "grid grid-cols-1 md:grid-cols-[340px_1fr] gap-6 items-start" : "flex flex-col gap-5"}>

            {/* ── Play card ── */}
            <div className="flex flex-col gap-5">

              {/* Hero (guest only) */}
              {!isLoggedIn && (
                <div className="text-center mb-1">
                  <span className="text-[2.5rem] leading-none">♟</span>
                  <h1 className="m-0 mt-2 mb-1 text-2xl font-extrabold tracking-tight text-c-base">
                    Custom Chess
                  </h1>
                  <p className="m-0 text-sm text-c-muted">Jugá ajedrez con tus amigos</p>
                </div>
              )}

              {/* Section title (logged-in) */}
              {isLoggedIn && (
                <div>
                  <h2 className="m-0 mb-0.5 text-xl font-extrabold tracking-tight text-c-base">
                    Jugar
                  </h2>
                  <p className="m-0 text-[0.82rem] text-c-faint">
                    Creá una sala o ingresá a una existente
                  </p>
                </div>
              )}

              {/* Error */}
              {error && <div className="error-banner">{error}</div>}

              {/* Time control */}
              <div className="flex flex-col gap-2">
                <span className="label-xs">Control de tiempo</span>
                <div className="grid grid-cols-4 gap-1.5">
                  {TIME_OPTIONS.map((opt) => (
                    <button
                      key={String(opt.value)}
                      className={`btn-tc ${timeControl === opt.value ? "active" : ""}`}
                      onClick={() => setTimeControl(opt.value)}
                    >
                      {opt.label}
                      <span className="text-[0.6rem] font-normal opacity-70">{opt.sub}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Create room */}
              <button className="btn btn-primary" onClick={() => onCreateRoom(timeControl)}>
                Crear sala
              </button>

              {/* Divider */}
              <div className="flex items-center gap-3">
                <div className="divider flex-1" />
                <span className="text-[0.72rem] text-c-faint">o unirse a una</span>
                <div className="divider flex-1" />
              </div>

              {/* Join room */}
              <form onSubmit={handleJoin} className="flex gap-2">
                <input
                  type="text"
                  placeholder="SALA-4F2"
                  value={roomInput}
                  onChange={(e) => setRoomInput(e.target.value)}
                  className="input-field auto-width uppercase flex-1"
                />
                <button type="submit" className="btn btn-secondary shrink-0">
                  Entrar
                </button>
              </form>

              {/* Guest CTA */}
              {!isLoggedIn && onSignIn && (
                <button className="btn btn-accent-outline w-full py-2.5" onClick={onSignIn}>
                  ♟ Iniciá sesión para guardar tu progreso
                </button>
              )}
            </div>

            {/* ── Mini stats (logged-in) ── */}
            {isLoggedIn && <MiniStats username={user.username} />}
          </div>
        </div>
      </div>
    </motion.div>
    </AppLayout>
  );
}
