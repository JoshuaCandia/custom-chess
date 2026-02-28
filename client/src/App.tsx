import { useState, useEffect } from "react";
import { Routes, Route, Navigate, Outlet, useNavigate } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import type { GameState } from "./types/chess";
import { useIsMobile } from "./hooks/useIsMobile";
import { AnimatePresence } from "framer-motion";
import { useAuthStore } from "./store/authStore";
import { useSocket } from "./hooks/useSocket";
import { useAuth } from "./hooks/useAuth";
import { useTheme } from "./hooks/useTheme";
import { useVoiceChat } from "./hooks/useVoiceChat";
import { Lobby } from "./components/Lobby";
import { Board } from "./components/Board";
import { GameStatus } from "./components/GameStatus";
import { PlayerRow } from "./components/PlayerRow";
import { SidePanel } from "./components/SidePanel";
import { ThemePicker } from "./components/ThemePicker";
import { VoiceButton } from "./components/VoiceButton";
import { GameControls } from "./components/GameControls";
import { GameOverModal } from "./components/GameOverModal";
import { AuthModal } from "./components/AuthModal";
import { WelcomeModal } from "./components/WelcomeModal";
import { ProfilePage } from "./pages/ProfilePage";
import { LoginPage } from "./pages/LoginPage";
import { SettingsPage } from "./pages/SettingsPage";
import { PuzzlePage } from "./pages/PuzzlePage";
import { apiUpdateSettings } from "./lib/userApi";
import { BOARD_THEMES, type BoardTheme } from "./types/theme";

// ── Loading screen ─────────────────────────────────────────────────────────────
function LoadingScreen() {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        minHeight: "100svh",
        background: "var(--c-bg)",
      }}
    >
      <div style={{ display: "flex", gap: "6px" }}>
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            style={{
              width: "7px",
              height: "7px",
              borderRadius: "50%",
              background: "var(--c-accent)",
              animation: `dot 1.4s ease-in-out ${i * 0.2}s infinite`,
            }}
          />
        ))}
      </div>
      <style>{`@keyframes dot { 0%,80%,100%{opacity:.25;transform:scale(.85)} 40%{opacity:1;transform:scale(1)} }`}</style>
    </div>
  );
}

// ── Protected layout — guards all routes that require auth/guest ───────────────
function ProtectedLayout() {
  const { user, loading, guestMode } = useAuth();

  if (loading) return <LoadingScreen />;
  if (!user && !guestMode) return <Navigate to="/login" replace />;
  return <Outlet />;
}

// ── Waiting screen ─────────────────────────────────────────────────────────────
function WaitingScreen({
  roomId,
  timeControl,
  onCancel,
}: {
  roomId: string;
  timeControl: number | null;
  onCancel: () => void;
}) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    await navigator.clipboard.writeText(roomId);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  const tcLabel = timeControl
    ? timeControl >= 600
      ? `${timeControl / 60} min · Rapid`
      : timeControl >= 300
      ? `${timeControl / 60} min · Blitz`
      : "1 min · Bullet"
    : null;

  return (
    <div className="flex flex-col items-center justify-center min-h-screen gap-8 p-6">
      <div className="flex flex-col items-center gap-2">
        <span style={{ fontSize: "2.5rem" }}>♟</span>
        <h2 className="text-xl font-semibold">Waiting for opponent</h2>
        <p className="text-sm" style={{ color: "var(--c-text-muted)" }}>
          Share this code to invite someone
        </p>
      </div>

      <div
        className="flex items-center gap-3 px-5 py-3 rounded-2xl"
        style={{
          background: "var(--c-surface-2)",
          border: "1px solid var(--c-border)",
        }}
      >
        <span className="font-mono text-2xl font-bold tracking-[0.15em]">{roomId}</span>
        <button
          onClick={copy}
          className="text-xs px-2.5 py-1 rounded-lg transition-all font-medium"
          style={{
            background: copied ? "rgba(74,222,128,0.15)" : "var(--c-surface-2)",
            color: copied ? "#86efac" : "var(--c-text-muted)",
            border: `1px solid ${copied ? "rgba(74,222,128,0.3)" : "var(--c-border)"}`,
          }}
        >
          {copied ? "Copied!" : "Copy"}
        </button>
      </div>

      {tcLabel && (
        <div
          className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full"
          style={{
            background: "var(--c-surface-2)",
            border: "1px solid var(--c-border-faint)",
            color: "var(--c-text-muted)",
          }}
        >
          <span>⏱</span>
          <span>{tcLabel}</span>
        </div>
      )}

      <div className="flex gap-1.5">
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            className="w-1.5 h-1.5 rounded-full"
            style={{
              background: "var(--c-text-faint)",
              animation: `pulse 1.4s ease-in-out ${i * 0.2}s infinite`,
            }}
          />
        ))}
      </div>

      <button
        onClick={onCancel}
        className="text-xs px-4 py-2 rounded-xl transition-all"
        style={{
          background: "var(--c-surface-2)",
          border: "1px solid var(--c-border)",
          color: "var(--c-text-muted)",
          cursor: "pointer",
        }}
      >
        Cancel
      </button>

      <style>{`
        @keyframes pulse {
          0%, 80%, 100% { opacity: 0.25; transform: scale(0.85); }
          40% { opacity: 1; transform: scale(1); }
        }
      `}</style>
    </div>
  );
}

// ── Mobile bottom controls bar ────────────────────────────────────────────────
function MobileControls({
  gameState,
  onResign,
  onOfferDraw,
  onRespondDraw,
}: {
  gameState: GameState;
  onResign: () => void;
  onOfferDraw: () => void;
  onRespondDraw: (accept: boolean) => void;
}) {
  const [confirmResign, setConfirmResign] = useState(false);
  const { status, drawOfferPending, drawOfferSent } = gameState;

  if (status !== "playing") return null;

  const bar = {
    flexShrink: 0 as const,
    padding: "10px 12px",
    paddingBottom: "max(10px, env(safe-area-inset-bottom))",
    borderTop: "1px solid var(--c-border-faint)",
    background: "var(--c-surface)",
  };

  if (drawOfferPending) {
    return (
      <div style={{ ...bar, display: "flex", flexDirection: "column", gap: "8px" }}>
        <span style={{ fontSize: "0.8rem", fontWeight: 600, textAlign: "center", color: "var(--c-accent)" }}>
          ½ Empate propuesto por el oponente
        </span>
        <div style={{ display: "flex", gap: "8px" }}>
          <button
            onClick={() => onRespondDraw(true)}
            style={{ flex: 1, padding: "11px 0", borderRadius: "12px", border: "1px solid rgba(74,222,128,0.4)", background: "rgba(74,222,128,0.12)", color: "var(--c-win)", fontWeight: 700, fontSize: "0.9rem", cursor: "pointer" }}
          >
            Aceptar
          </button>
          <button
            onClick={() => onRespondDraw(false)}
            style={{ flex: 1, padding: "11px 0", borderRadius: "12px", border: "1px solid rgba(239,68,68,0.35)", background: "rgba(239,68,68,0.1)", color: "var(--c-loss)", fontWeight: 700, fontSize: "0.9rem", cursor: "pointer" }}
          >
            Rechazar
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ ...bar, display: "flex", gap: "8px" }}>
      <button
        onClick={onOfferDraw}
        disabled={drawOfferSent}
        style={{ flex: 1, padding: "11px 0", borderRadius: "12px", border: "1px solid var(--c-border)", background: "var(--c-surface-2)", color: drawOfferSent ? "var(--c-text-faint)" : "var(--c-text-muted)", fontSize: "0.875rem", cursor: drawOfferSent ? "default" : "pointer" }}
      >
        {drawOfferSent ? "Empate propuesto…" : "½ Empate"}
      </button>
      {confirmResign ? (
        <>
          <button
            onClick={() => { onResign(); setConfirmResign(false); }}
            style={{ flex: 1, padding: "11px 0", borderRadius: "12px", border: "1px solid rgba(239,68,68,0.4)", background: "rgba(239,68,68,0.15)", color: "var(--c-loss)", fontWeight: 700, fontSize: "0.875rem", cursor: "pointer" }}
          >
            ✓ Confirmar
          </button>
          <button
            onClick={() => setConfirmResign(false)}
            style={{ padding: "11px 16px", borderRadius: "12px", border: "1px solid var(--c-border-faint)", background: "none", color: "var(--c-text-faint)", fontSize: "0.875rem", cursor: "pointer" }}
          >
            ✕
          </button>
        </>
      ) : (
        <button
          onClick={() => setConfirmResign(true)}
          style={{ flex: 1, padding: "11px 0", borderRadius: "12px", border: "1px solid var(--c-border)", background: "var(--c-surface-2)", color: "var(--c-text-muted)", fontSize: "0.875rem", cursor: "pointer" }}
        >
          Rendirse
        </button>
      )}
    </div>
  );
}

// ── Main game content ──────────────────────────────────────────────────────────
function MainContent() {
  const { user, logout } = useAuth();
  const { justRegistered, setJustRegistered } = useAuthStore();
  const queryClient = useQueryClient();
  const currentUsername = user?.username ?? "Guest";
  const {
    gameState,
    chatMessages,
    error,
    socketRef,
    createRoom,
    joinRoom,
    makeMove,
    sendChat,
    resign,
    leaveRoom,
    resetGame,
    offerDraw,
    respondDraw,
  } = useSocket(currentUsername);
  const { theme, changeTheme } = useTheme();
  const isMobile = useIsMobile();
  const [showAuthModal, setShowAuthModal] = useState(false);
  const navigate = useNavigate();

  const { voiceStatus, isMuted, startVoiceChat, toggleMute, stopVoiceChat } = useVoiceChat(
    socketRef,
    gameState?.roomId ?? null,
    gameState?.playerColor ?? null,
    gameState?.status ?? "idle"
  );

  // Sync theme from server when user logs in
  useEffect(() => {
    if (user?.theme) {
      const serverTheme = BOARD_THEMES.find((t) => t.id === user.theme);
      if (serverTheme) changeTheme(serverTheme);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  function handleChangeTheme(t: BoardTheme) {
    changeTheme(t);
    if (user) {
      // Update query cache so the useEffect([user?.id]) sync uses the new theme on next mount.
      queryClient.setQueryData<typeof user>(["me"], (prev) =>
        prev ? { ...prev, theme: t.id } : prev
      );
      apiUpdateSettings({ theme: t.id }).catch(() => {});
    }
  }

  // ── No game — show lobby/dashboard ──────────────────────────────────────────
  if (!gameState) {
    return (
      <AnimatePresence mode="wait">
        <Lobby
          key="lobby"
          onCreateRoom={createRoom}
          onJoinRoom={joinRoom}
          error={error}
          onSignIn={user ? undefined : () => setShowAuthModal(true)}
          user={user}
          onViewProfile={() => navigate(`/profile/${user!.username}`)}
          onLogout={logout}
        />
        {showAuthModal && <AuthModal onClose={() => setShowAuthModal(false)} />}
        <AnimatePresence>
          {justRegistered && (
            <WelcomeModal
              key="welcome"
              username={justRegistered}
              onClose={() => setJustRegistered(null)}
            />
          )}
        </AnimatePresence>
      </AnimatePresence>
    );
  }

  if (gameState.status === "waiting") {
    return (
      <WaitingScreen
        roomId={gameState.roomId}
        timeControl={gameState.timeControl}
        onCancel={() => leaveRoom(gameState.roomId)}
      />
    );
  }

  // ── Shared game view vars ─────────────────────────────────────────────────
  const opponentColor = gameState.playerColor === "w" ? "b" : "w";
  const showClocks = gameState.timeControl !== null;
  const myTime = gameState.playerColor === "w" ? gameState.timeWhite : gameState.timeBlack;
  const opponentTime = opponentColor === "w" ? gameState.timeWhite : gameState.timeBlack;
  const myClockActive = gameState.turn === gameState.playerColor && gameState.status === "playing";
  const opponentClockActive = gameState.turn === opponentColor && gameState.status === "playing";

  const sharedErrorToast = error && (
    <div style={{
      position: "fixed", top: "16px", left: "50%", transform: "translateX(-50%)",
      zIndex: 50, fontSize: "0.75rem", fontWeight: 500, padding: "6px 16px",
      borderRadius: "12px", pointerEvents: "none", background: "rgba(239,68,68,0.92)",
      backdropFilter: "blur(8px)", color: "#fff", boxShadow: "0 4px 20px rgba(0,0,0,0.4)",
    }}>
      {error}
    </div>
  );

  // ── Mobile layout ──────────────────────────────────────────────────────────
  if (isMobile) {
    return (
      <div style={{ display: "flex", flexDirection: "column", height: "100svh", overflow: "hidden" }}>

        {/* Compact header */}
        <header style={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
          height: "40px", padding: "0 10px", flexShrink: 0,
          borderBottom: "1px solid var(--c-border-faint)",
          background: "var(--c-surface)",
        }}>
          <span style={{
            fontFamily: "monospace", fontSize: "0.75rem", fontWeight: 700,
            letterSpacing: "0.1em", color: "var(--c-accent)",
            background: "var(--c-accent-dim)", border: "1px solid var(--c-border)",
            borderRadius: "5px", padding: "2px 8px",
          }}>
            {gameState.roomId}
          </span>
          <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
            <ThemePicker current={theme} onChange={handleChangeTheme} />
            <VoiceButton status={voiceStatus} isMuted={isMuted} onStart={startVoiceChat} onToggleMute={toggleMute} onStop={stopVoiceChat} />
          </div>
        </header>

        {/* Opponent row */}
        <div style={{ padding: "4px 8px", flexShrink: 0 }}>
          <PlayerRow colorSide={opponentColor} label="Opponent" username={gameState.opponentUsername} timeMs={opponentTime} isActive={opponentClockActive} showClock={showClocks} />
        </div>

        {/* Board — fills maximum square space */}
        <div style={{ width: "min(100vw, calc(100svh - 200px))", flexShrink: 0, alignSelf: "center" }}>
          <Board gameState={gameState} onMove={(move) => makeMove(gameState.roomId, move)} theme={theme} />
        </div>

        {/* My row */}
        <div style={{ padding: "4px 8px", flexShrink: 0 }}>
          <PlayerRow colorSide={gameState.playerColor} label="You" username={gameState.myUsername} timeMs={myTime} isActive={myClockActive} showClock={showClocks} />
        </div>

        {/* Status */}
        <div style={{ padding: "2px 8px", flexShrink: 0 }}>
          <GameStatus gameState={gameState} />
        </div>

        {/* Moves / chat — fills remaining space */}
        <div style={{ flex: 1, minHeight: 0, padding: "0 8px 4px" }}>
          <SidePanel moves={gameState.moveHistory} chatMessages={chatMessages} playerColor={gameState.playerColor} onSendChat={(text) => sendChat(gameState.roomId, text)} disabled={gameState.status === "finished"} />
        </div>

        {/* Bottom controls */}
        <MobileControls gameState={gameState} onResign={() => resign(gameState.roomId)} onOfferDraw={() => offerDraw(gameState.roomId)} onRespondDraw={(accept) => respondDraw(gameState.roomId, accept)} />

        {sharedErrorToast}
        {gameState.status === "finished" && <GameOverModal gameState={gameState} onPlayAgain={resetGame} />}
        {showAuthModal && <AuthModal onClose={() => setShowAuthModal(false)} />}
        <AnimatePresence>
          {justRegistered && <WelcomeModal key="welcome" username={justRegistered} onClose={() => setJustRegistered(null)} />}
        </AnimatePresence>
      </div>
    );
  }

  // ── Desktop layout ─────────────────────────────────────────────────────────
  const boardSize = "min(680px, min(calc(100vw - 252px), calc(100vh - 60px)))";

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100svh", overflow: "hidden" }}>

      {/* ── Header ── */}
      <header style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        height: "44px", padding: "0 16px", flexShrink: 0,
        borderBottom: "1px solid var(--c-border-faint)",
        background: "var(--c-surface)",
      }}>
        {/* Logo */}
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <span style={{ fontSize: "1.1rem", lineHeight: 1 }}>♟</span>
          <span style={{ fontSize: "0.875rem", fontWeight: 700, letterSpacing: "-0.01em", color: "var(--c-text)" }}>
            Custom Chess
          </span>
        </div>

        {/* Room ID */}
        <span style={{
          fontFamily: "monospace", fontSize: "0.78rem", fontWeight: 600,
          letterSpacing: "0.1em", color: "var(--c-accent)",
          background: "var(--c-accent-dim)", border: "1px solid var(--c-border)",
          borderRadius: "6px", padding: "3px 12px",
        }}>
          {gameState.roomId}
        </span>

        {/* Actions */}
        <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
          <ThemePicker current={theme} onChange={handleChangeTheme} />
          <VoiceButton status={voiceStatus} isMuted={isMuted} onStart={startVoiceChat} onToggleMute={toggleMute} onStop={stopVoiceChat} />
          {user ? (
            <>
              <button
                onClick={() => navigate(`/profile/${user.username}`)}
                style={{ background: "var(--c-surface-2)", border: "1px solid var(--c-border)", borderRadius: "8px", color: "var(--c-text-muted)", fontSize: "0.72rem", fontWeight: 600, padding: "4px 10px", cursor: "pointer" }}
              >
                {user.username}{user.elo != null ? ` · ${user.elo}` : ""}
              </button>
              <button
                onClick={() => logout()}
                style={{ background: "none", border: "1px solid var(--c-border-faint)", borderRadius: "8px", color: "var(--c-text-faint)", fontSize: "0.72rem", padding: "4px 8px", cursor: "pointer" }}
              >
                Sign out
              </button>
            </>
          ) : (
            <button
              onClick={() => setShowAuthModal(true)}
              style={{ background: "var(--c-accent-dim)", border: "1px solid var(--c-border)", borderRadius: "8px", color: "var(--c-text)", fontSize: "0.72rem", fontWeight: 600, padding: "4px 10px", cursor: "pointer" }}
            >
              Sign in
            </button>
          )}
        </div>
      </header>

      {/* ── Body: board + right panel ── */}
      <div style={{ flex: 1, minHeight: 0, display: "flex", gap: "8px", padding: "8px" }}>

        {/* Board */}
        <div style={{ flex: 1, minWidth: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div style={{ width: boardSize }}>
            <Board
              gameState={gameState}
              onMove={(move) => makeMove(gameState.roomId, move)}
              theme={theme}
            />
          </div>
        </div>

        {/* Right panel */}
        <div style={{ width: "220px", flexShrink: 0, display: "flex", flexDirection: "column", gap: "6px", minHeight: 0 }}>
          <PlayerRow
            colorSide={opponentColor}
            label="Opponent"
            username={gameState.opponentUsername}
            timeMs={opponentTime}
            isActive={opponentClockActive}
            showClock={showClocks}
          />
          <SidePanel
            moves={gameState.moveHistory}
            chatMessages={chatMessages}
            playerColor={gameState.playerColor}
            onSendChat={(text) => sendChat(gameState.roomId, text)}
            disabled={gameState.status === "finished"}
          />
          <GameStatus gameState={gameState} />
          <GameControls
            gameState={gameState}
            onResign={() => resign(gameState.roomId)}
            onOfferDraw={() => offerDraw(gameState.roomId)}
            onRespondDraw={(accept) => respondDraw(gameState.roomId, accept)}
          />
          <PlayerRow
            colorSide={gameState.playerColor}
            label="You"
            username={gameState.myUsername}
            timeMs={myTime}
            isActive={myClockActive}
            showClock={showClocks}
          />
        </div>
      </div>

      {sharedErrorToast}

      {gameState.status === "finished" && (
        <GameOverModal gameState={gameState} onPlayAgain={resetGame} />
      )}

      {showAuthModal && <AuthModal onClose={() => setShowAuthModal(false)} />}

      <AnimatePresence>
        {justRegistered && (
          <WelcomeModal key="welcome" username={justRegistered} onClose={() => setJustRegistered(null)} />
        )}
      </AnimatePresence>
    </div>
  );
}

// ── App root with routing ──────────────────────────────────────────────────────
export default function App() {
  return (
    <Routes>
      {/* Public routes */}
      <Route path="/login" element={<LoginPage />} />
      <Route path="/profile/:username" element={<ProfilePage />} />

      {/* Protected routes — require auth or guest mode */}
      <Route element={<ProtectedLayout />}>
        <Route path="/settings" element={<SettingsPage />} />
        <Route path="/puzzles"  element={<PuzzlePage />} />
        <Route path="/*"        element={<MainContent />} />
      </Route>
    </Routes>
  );
}
