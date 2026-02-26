import { useState, useEffect } from "react";
import { Routes, Route, Navigate, Outlet, useNavigate } from "react-router-dom";
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
}: {
  roomId: string;
  timeControl: number | null;
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
        <p className="text-sm" style={{ color: "rgba(232,213,183,0.5)" }}>
          Share this code to invite someone
        </p>
      </div>

      <div
        className="flex items-center gap-3 px-5 py-3 rounded-2xl"
        style={{
          background: "rgba(240,217,181,0.06)",
          border: "1px solid rgba(200,162,96,0.25)",
        }}
      >
        <span className="font-mono text-2xl font-bold tracking-[0.15em]">{roomId}</span>
        <button
          onClick={copy}
          className="text-xs px-2.5 py-1 rounded-lg transition-all font-medium"
          style={{
            background: copied ? "rgba(74,222,128,0.15)" : "rgba(240,217,181,0.08)",
            color: copied ? "#86efac" : "rgba(232,213,183,0.6)",
            border: `1px solid ${copied ? "rgba(74,222,128,0.3)" : "rgba(200,162,96,0.2)"}`,
          }}
        >
          {copied ? "Copied!" : "Copy"}
        </button>
      </div>

      {tcLabel && (
        <div
          className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full"
          style={{
            background: "rgba(240,217,181,0.05)",
            border: "1px solid rgba(200,162,96,0.15)",
            color: "rgba(232,213,183,0.5)",
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
              background: "rgba(232,213,183,0.35)",
              animation: `pulse 1.4s ease-in-out ${i * 0.2}s infinite`,
            }}
          />
        ))}
      </div>

      <style>{`
        @keyframes pulse {
          0%, 80%, 100% { opacity: 0.25; transform: scale(0.85); }
          40% { opacity: 1; transform: scale(1); }
        }
      `}</style>
    </div>
  );
}

// ── Main game content ──────────────────────────────────────────────────────────
function MainContent() {
  const { user, logout } = useAuth();
  const { justRegistered, setJustRegistered } = useAuthStore();
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
    offerDraw,
    respondDraw,
  } = useSocket(currentUsername);
  const { theme, changeTheme } = useTheme();
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
    if (user) apiUpdateSettings({ theme: t.id }).catch(() => {});
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
    return <WaitingScreen roomId={gameState.roomId} timeControl={gameState.timeControl} />;
  }

  // ── Game view ────────────────────────────────────────────────────────────────
  const opponentColor = gameState.playerColor === "w" ? "b" : "w";
  const showClocks = gameState.timeControl !== null;
  const myTime = gameState.playerColor === "w" ? gameState.timeWhite : gameState.timeBlack;
  const opponentTime = opponentColor === "w" ? gameState.timeWhite : gameState.timeBlack;
  const myClockActive = gameState.turn === gameState.playerColor && gameState.status === "playing";
  const opponentClockActive = gameState.turn === opponentColor && gameState.status === "playing";
  const boardSize = "min(680px, min(calc(100vw - 252px), calc(100vh - 60px)))";

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100svh", overflow: "hidden" }}>

      {/* ── Header ── */}
      <header style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        height: "44px", padding: "0 16px", flexShrink: 0,
        borderBottom: "1px solid rgba(200,162,96,0.1)",
        background: "rgba(15,10,6,0.4)",
      }}>
        {/* Logo */}
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <span style={{ fontSize: "1.1rem", lineHeight: 1 }}>♟</span>
          <span style={{ fontSize: "0.875rem", fontWeight: 700, letterSpacing: "-0.01em", color: "#e8d5b7" }}>
            Custom Chess
          </span>
        </div>

        {/* Room ID */}
        <span style={{
          fontFamily: "monospace", fontSize: "0.78rem", fontWeight: 600,
          letterSpacing: "0.1em", color: "rgba(200,162,96,0.6)",
          background: "rgba(200,162,96,0.07)", border: "1px solid rgba(200,162,96,0.16)",
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
                style={{ background: "rgba(240,217,181,0.07)", border: "1px solid rgba(200,162,96,0.18)", borderRadius: "8px", color: "rgba(232,213,183,0.75)", fontSize: "0.72rem", fontWeight: 600, padding: "4px 10px", cursor: "pointer" }}
              >
                {user.username}{user.elo != null ? ` · ${user.elo}` : ""}
              </button>
              <button
                onClick={() => logout()}
                style={{ background: "none", border: "1px solid rgba(200,162,96,0.12)", borderRadius: "8px", color: "rgba(232,213,183,0.38)", fontSize: "0.72rem", padding: "4px 8px", cursor: "pointer" }}
              >
                Sign out
              </button>
            </>
          ) : (
            <button
              onClick={() => setShowAuthModal(true)}
              style={{ background: "rgba(200,162,96,0.1)", border: "1px solid rgba(200,162,96,0.25)", borderRadius: "8px", color: "#e8d5b7", fontSize: "0.72rem", fontWeight: 600, padding: "4px 10px", cursor: "pointer" }}
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

      {/* Error toast */}
      {error && (
        <div style={{
          position: "fixed", top: "16px", left: "50%", transform: "translateX(-50%)",
          zIndex: 50, fontSize: "0.75rem", fontWeight: 500, padding: "6px 16px",
          borderRadius: "12px", pointerEvents: "none", background: "rgba(239,68,68,0.92)",
          backdropFilter: "blur(8px)", color: "#fff", boxShadow: "0 4px 20px rgba(0,0,0,0.4)",
        }}>
          {error}
        </div>
      )}

      {gameState.status === "finished" && (
        <GameOverModal gameState={gameState} onPlayAgain={() => window.location.reload()} />
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
        <Route path="/*" element={<MainContent />} />
      </Route>
    </Routes>
  );
}
