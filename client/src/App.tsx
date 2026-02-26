import { useState } from "react";
import { AnimatePresence } from "framer-motion";
import { useAuthStore } from "./store/authStore";
import { useSocket } from "./hooks/useSocket";
import { useAuth } from "./hooks/useAuth";
import { useTheme } from "./hooks/useTheme";
import { useVoiceChat } from "./hooks/useVoiceChat";
import { LandingPage } from "./components/LandingPage";
import { Lobby } from "./components/Lobby";
import { Board } from "./components/Board";
import { GameStatus } from "./components/GameStatus";
import { PlayerRow } from "./components/PlayerRow";
import { SidePanel } from "./components/SidePanel";
import { ThemePicker } from "./components/ThemePicker";
import { VoiceButton } from "./components/VoiceButton";
import { GameOverModal } from "./components/GameOverModal";
import { AuthModal } from "./components/AuthModal";
import { WelcomeModal } from "./components/WelcomeModal";

// ── Waiting screen ────────────────────────────────────────────────────────────
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

      {/* Room code */}
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

      {/* Animated dots */}
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

// ── Main App ──────────────────────────────────────────────────────────────────
export default function App() {
  const { user, loading, logout } = useAuth();
  const { guestMode, setGuestMode, justRegistered, setJustRegistered } = useAuthStore();
  const currentUsername = user?.username ?? "Guest";
  const { gameState, chatMessages, error, socketRef, createRoom, joinRoom, makeMove, sendChat } = useSocket(currentUsername);
  const { theme, changeTheme } = useTheme();
  const [showAuthModal, setShowAuthModal] = useState(false);
  const { voiceStatus, isMuted, startVoiceChat, toggleMute, stopVoiceChat } = useVoiceChat(
    socketRef,
    gameState?.roomId ?? null,
    gameState?.playerColor ?? null,
    gameState?.status ?? "idle"
  );

  const isIdentified = loading ? false : (user !== null || guestMode);

  if (!isIdentified) {
    return (
      <AnimatePresence mode="wait">
        <LandingPage key="landing" onGuest={() => setGuestMode(true)} />
      </AnimatePresence>
    );
  }

  if (!gameState) {
    return (
      <AnimatePresence mode="wait">
        <Lobby
          key="lobby"
          onCreateRoom={createRoom}
          onJoinRoom={joinRoom}
          error={error}
          onSignIn={user ? undefined : () => setShowAuthModal(true)}
        />
        {showAuthModal && <AuthModal onClose={() => setShowAuthModal(false)} />}
      </AnimatePresence>
    );
  }

  if (gameState.status === "waiting") {
    return (
      <WaitingScreen roomId={gameState.roomId} timeControl={gameState.timeControl} />
    );
  }

  // ── Game view ───────────────────────────────────────────────────────────────
  const opponentColor = gameState.playerColor === "w" ? "b" : "w";
  const showClocks = gameState.timeControl !== null;

  const myTime =
    gameState.playerColor === "w" ? gameState.timeWhite : gameState.timeBlack;
  const opponentTime =
    opponentColor === "w" ? gameState.timeWhite : gameState.timeBlack;

  const myClockActive =
    gameState.turn === gameState.playerColor && gameState.status === "playing";
  const opponentClockActive =
    gameState.turn === opponentColor && gameState.status === "playing";

  // Board fills remaining height after fixed UI rows.
  // SidePanel is 160px wide + 8px gap + 16px padding = 184px horizontal.
  // header(32) + playerRow×2(42×2) + status(28) + gaps(30) + padding(16) ≈ 190px vertical
  const boardSize = "min(680px, min(calc(100vw - 184px), calc(100vh - 196px)))";

  return (
    <div
      className="flex flex-col h-screen overflow-hidden"
      style={{ padding: "8px", gap: "6px" }}
    >
      {/* Header */}
      <header
        className="flex items-center justify-between shrink-0 px-1"
        style={{ height: "32px" }}
      >
        <div className="flex items-center gap-2">
          <span style={{ fontSize: "1.1rem", lineHeight: 1 }}>♟</span>
          <span className="text-sm font-semibold tracking-tight">Custom Chess</span>
        </div>
        <div className="flex items-center gap-2">
          <ThemePicker current={theme} onChange={changeTheme} />
          <VoiceButton
            status={voiceStatus}
            isMuted={isMuted}
            onStart={startVoiceChat}
            onToggleMute={toggleMute}
            onStop={stopVoiceChat}
          />
          {user ? (
            <button
              onClick={() => logout()}
              className="text-xs px-2.5 py-1 rounded-lg transition-all font-medium"
              style={{
                background: "rgba(240,217,181,0.08)",
                border: "1px solid rgba(200,162,96,0.2)",
                color: "rgba(232,213,183,0.7)",
              }}
            >
              {user.username} · Sign out
            </button>
          ) : (
            <button
              onClick={() => setShowAuthModal(true)}
              className="text-xs px-2.5 py-1 rounded-lg transition-all font-medium"
              style={{
                background: "rgba(200,162,96,0.12)",
                border: "1px solid rgba(200,162,96,0.3)",
                color: "#e8d5b7",
              }}
            >
              Sign in
            </button>
          )}
        </div>
        <span
          className="text-xs font-mono"
          style={{ color: "rgba(232,213,183,0.3)" }}
        >
          {gameState.roomId}
        </span>
      </header>

      {/* Opponent */}
      <PlayerRow
        colorSide={opponentColor}
        label="Opponent"
        username={gameState.opponentUsername}
        timeMs={opponentTime}
        isActive={opponentClockActive}
        showClock={showClocks}
      />

      {/* Board + Move list */}
      <div className="flex-1 min-h-0 flex items-center justify-center gap-2">
        <div style={{ width: boardSize }}>
          <Board
            gameState={gameState}
            onMove={(move) => makeMove(gameState.roomId, move)}
            theme={theme}
          />
        </div>
        <SidePanel
          moves={gameState.moveHistory}
          chatMessages={chatMessages}
          playerColor={gameState.playerColor}
          onSendChat={(text) => sendChat(gameState.roomId, text)}
          height={boardSize}
          disabled={gameState.status === "finished"}
        />
      </div>

      {/* Error toast — fixed, never shifts the layout */}
      {error && (
        <div
          className="fixed top-4 left-1/2 -translate-x-1/2 z-50 text-xs font-medium px-4 py-2 rounded-xl pointer-events-none"
          style={{
            background: "rgba(239,68,68,0.92)",
            backdropFilter: "blur(8px)",
            color: "#fff",
            boxShadow: "0 4px 20px rgba(0,0,0,0.4)",
          }}
        >
          {error}
        </div>
      )}

      {/* Me */}
      <PlayerRow
        colorSide={gameState.playerColor}
        label="You"
        username={gameState.myUsername}
        timeMs={myTime}
        isActive={myClockActive}
        showClock={showClocks}
      />

      {/* Status */}
      <GameStatus gameState={gameState} />

      {/* Game-over modal */}
      {gameState.status === "finished" && (
        <GameOverModal
          gameState={gameState}
          onPlayAgain={() => window.location.reload()}
        />
      )}

      {/* Auth modal */}
      {showAuthModal && <AuthModal onClose={() => setShowAuthModal(false)} />}

      {/* Welcome modal — shown after successful registration */}
      <AnimatePresence>
        {justRegistered && (
          <WelcomeModal
            key="welcome"
            username={justRegistered}
            onClose={() => setJustRegistered(null)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
