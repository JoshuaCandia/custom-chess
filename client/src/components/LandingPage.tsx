import { useState } from "react";
import { motion } from "framer-motion";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useAuth } from "../hooks/useAuth";
import { useAuthStore } from "../store/authStore";
import { OtpBoxInput } from "./OtpBoxInput";
import {
  loginSchema, registerSchema, otpSchema,
  type LoginInput, type RegisterInput, type OtpInput,
} from "../lib/authSchemas";

type Tab = "login" | "register";
type FormStep = "fields" | "otp";

interface LandingPageProps {
  onGuest: () => void;
}

// ── Decorative mini-board ──────────────────────────────────────────────────────

const BOARD_PIECES: Record<string, string> = {
  "0-1": "♜", "0-3": "♛", "0-5": "♚",
  "1-0": "♟", "1-2": "♟", "1-4": "♟", "1-6": "♟",
  "6-1": "♙", "6-3": "♙", "6-5": "♙",
  "7-0": "♖", "7-4": "♔", "7-7": "♖",
};

function MiniBoard() {
  const size = 8;
  const sq = 28;

  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: `repeat(${size}, ${sq}px)`,
        borderRadius: "6px",
        overflow: "hidden",
        boxShadow: "0 0 0 1px rgba(200,162,96,0.15), 0 8px 32px rgba(0,0,0,0.5)",
        opacity: 0.85,
      }}
    >
      {Array.from({ length: size * size }, (_, i) => {
        const row = Math.floor(i / size);
        const col = i % size;
        const isLight = (row + col) % 2 === 0;
        const piece = BOARD_PIECES[`${row}-${col}`];
        const isGold = piece?.charCodeAt(0) < 9818;

        return (
          <div
            key={i}
            style={{
              width: sq,
              height: sq,
              background: isLight ? "rgba(240,217,181,0.09)" : "rgba(240,217,181,0.03)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "15px",
              color: isGold ? "rgba(200,162,96,0.9)" : "rgba(232,213,183,0.65)",
              userSelect: "none",
            }}
          >
            {piece}
          </div>
        );
      })}
    </div>
  );
}

// ── Auth form ─────────────────────────────────────────────────────────────────

function AuthForm({ onGuest }: { onGuest: () => void }) {
  const { loginMutation, registerMutation, verifyOtpMutation } = useAuth();
  const { setJustRegistered } = useAuthStore();
  const [tab, setTab] = useState<Tab>("login");
  const [step, setStep] = useState<FormStep>("fields");
  const [pendingEmail, setPendingEmail] = useState("");

  const loginForm = useForm<LoginInput>({ resolver: zodResolver(loginSchema) });
  const registerForm = useForm<RegisterInput>({ resolver: zodResolver(registerSchema) });
  const otpForm = useForm<OtpInput>({ resolver: zodResolver(otpSchema) });

  function switchTab(t: Tab) {
    setTab(t);
    setStep("fields");
    loginForm.clearErrors();
    registerForm.clearErrors();
  }

  async function handleLogin(data: LoginInput) {
    try {
      await loginMutation.mutateAsync(data);
    } catch (err) {
      loginForm.setError("root", { message: (err as Error).message });
    }
  }

  async function handleRegister(data: RegisterInput) {
    try {
      await registerMutation.mutateAsync(data);
      setPendingEmail(data.email);
      setStep("otp");
    } catch (err) {
      registerForm.setError("root", { message: (err as Error).message });
    }
  }

  async function handleOtp(data: OtpInput) {
    try {
      const newUser = await verifyOtpMutation.mutateAsync({ email: pendingEmail, otp: data.otp });
      setJustRegistered(newUser.username);
    } catch (err) {
      otpForm.setError("root", { message: (err as Error).message });
    }
  }

  const inputStyle: React.CSSProperties = {
    width: "100%",
    background: "rgba(240,217,181,0.05)",
    border: "1px solid rgba(200,162,96,0.18)",
    borderRadius: "10px",
    padding: "10px 14px",
    color: "#e8d5b7",
    fontSize: "0.875rem",
    outline: "none",
    boxSizing: "border-box",
    transition: "border-color 0.15s",
  };

  const focusInput = (e: React.FocusEvent<HTMLInputElement>) =>
    (e.currentTarget.style.borderColor = "rgba(200,162,96,0.45)");
  const blurInput = (e: React.FocusEvent<HTMLInputElement>) =>
    (e.currentTarget.style.borderColor = "rgba(200,162,96,0.18)");

  const fieldError = (msg?: string) =>
    msg ? (
      <p style={{ margin: 0, color: "#f87171", fontSize: "0.75rem" }}>{msg}</p>
    ) : null;

  // ── OTP step ─────────────────────────────────────────────────────────────────
  if (step === "otp") {
    const { isPending } = verifyOtpMutation;
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
        <div>
          <button
            onClick={() => { setStep("fields"); otpForm.reset(); }}
            style={{
              background: "none",
              border: "none",
              color: "rgba(232,213,183,0.4)",
              fontSize: "0.8rem",
              cursor: "pointer",
              padding: 0,
              marginBottom: "12px",
              display: "flex",
              alignItems: "center",
              gap: "4px",
            }}
          >
            ← Back
          </button>
          <p style={{ margin: "0 0 4px", fontWeight: 600, fontSize: "0.95rem", color: "#e8d5b7" }}>
            Check your inbox
          </p>
          <p style={{ margin: 0, fontSize: "0.8rem", color: "rgba(232,213,183,0.4)", lineHeight: 1.5 }}>
            We sent a 6-digit code to{" "}
            <span style={{ color: "rgba(200,162,96,0.8)" }}>{pendingEmail}</span>
          </p>
        </div>

        <form
          onSubmit={otpForm.handleSubmit(handleOtp)}
          style={{ display: "flex", flexDirection: "column", gap: "16px" }}
        >
          <Controller
            control={otpForm.control}
            name="otp"
            render={({ field }) => (
              <OtpBoxInput
                value={field.value ?? ""}
                onChange={field.onChange}
                onBlur={field.onBlur}
                autoFocus
              />
            )}
          />

          {fieldError(
            otpForm.formState.errors.otp?.message ??
            otpForm.formState.errors.root?.message
          )}

          <button
            type="submit"
            disabled={isPending}
            style={{
              width: "100%",
              padding: "11px",
              borderRadius: "10px",
              border: "none",
              background: isPending ? "rgba(200,162,96,0.3)" : "#c8a56a",
              color: "#1c1512",
              fontWeight: 700,
              fontSize: "0.875rem",
              cursor: isPending ? "not-allowed" : "pointer",
              transition: "background 0.15s",
            }}
            onMouseEnter={(e) => { if (!isPending) e.currentTarget.style.background = "#d4b47a"; }}
            onMouseLeave={(e) => { if (!isPending) e.currentTarget.style.background = "#c8a56a"; }}
          >
            {isPending ? "Verifying…" : "Confirm"}
          </button>
        </form>

        <p style={{ margin: 0, fontSize: "0.75rem", color: "rgba(232,213,183,0.28)", textAlign: "center" }}>
          Code expires in 10 minutes
        </p>
      </div>
    );
  }

  // ── Fields step ──────────────────────────────────────────────────────────────
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
      {/* Tabs */}
      <div
        style={{
          display: "flex",
          background: "rgba(240,217,181,0.04)",
          border: "1px solid rgba(200,162,96,0.12)",
          borderRadius: "12px",
          padding: "3px",
          gap: "3px",
        }}
      >
        {(["login", "register"] as Tab[]).map((t) => (
          <button
            key={t}
            onClick={() => switchTab(t)}
            style={{
              flex: 1,
              padding: "7px",
              borderRadius: "9px",
              border: "none",
              background: tab === t ? "rgba(200,162,96,0.18)" : "transparent",
              color: tab === t ? "#e8d5b7" : "rgba(232,213,183,0.38)",
              fontWeight: 600,
              fontSize: "0.8125rem",
              cursor: "pointer",
              transition: "all 0.15s",
            }}
          >
            {t === "login" ? "Sign In" : "Register"}
          </button>
        ))}
      </div>

      {tab === "login" ? (
        <form
          onSubmit={loginForm.handleSubmit(handleLogin)}
          style={{ display: "flex", flexDirection: "column", gap: "10px" }}
        >
          <input
            {...loginForm.register("username")}
            style={inputStyle}
            type="text"
            placeholder="Username"
            autoComplete="username"
            onFocus={focusInput}
            onBlur={blurInput}
          />
          {fieldError(loginForm.formState.errors.username?.message)}

          <input
            {...loginForm.register("password")}
            style={inputStyle}
            type="password"
            placeholder="Password"
            autoComplete="current-password"
            onFocus={focusInput}
            onBlur={blurInput}
          />
          {fieldError(loginForm.formState.errors.password?.message)}

          {fieldError(loginForm.formState.errors.root?.message)}

          <button
            type="submit"
            disabled={loginMutation.isPending}
            style={{
              width: "100%",
              padding: "11px",
              borderRadius: "10px",
              border: "none",
              background: loginMutation.isPending ? "rgba(200,162,96,0.4)" : "#c8a56a",
              color: "#1c1512",
              fontWeight: 700,
              fontSize: "0.875rem",
              cursor: loginMutation.isPending ? "not-allowed" : "pointer",
              transition: "background 0.15s",
            }}
            onMouseEnter={(e) => { if (!loginMutation.isPending) e.currentTarget.style.background = "#d4b47a"; }}
            onMouseLeave={(e) => { if (!loginMutation.isPending) e.currentTarget.style.background = "#c8a56a"; }}
          >
            {loginMutation.isPending ? "…" : "Sign In"}
          </button>
        </form>
      ) : (
        <form
          onSubmit={registerForm.handleSubmit(handleRegister)}
          style={{ display: "flex", flexDirection: "column", gap: "10px" }}
        >
          <input
            {...registerForm.register("username")}
            style={inputStyle}
            type="text"
            placeholder="Username"
            autoComplete="username"
            onFocus={focusInput}
            onBlur={blurInput}
          />
          {fieldError(registerForm.formState.errors.username?.message)}

          <input
            {...registerForm.register("password")}
            style={inputStyle}
            type="password"
            placeholder="Password"
            autoComplete="new-password"
            onFocus={focusInput}
            onBlur={blurInput}
          />
          {fieldError(registerForm.formState.errors.password?.message)}

          <input
            {...registerForm.register("email")}
            style={inputStyle}
            type="email"
            placeholder="Email"
            autoComplete="email"
            onFocus={focusInput}
            onBlur={blurInput}
          />
          {fieldError(registerForm.formState.errors.email?.message)}

          {fieldError(registerForm.formState.errors.root?.message)}

          <button
            type="submit"
            disabled={registerMutation.isPending}
            style={{
              width: "100%",
              padding: "11px",
              borderRadius: "10px",
              border: "none",
              background: registerMutation.isPending ? "rgba(200,162,96,0.4)" : "#c8a56a",
              color: "#1c1512",
              fontWeight: 700,
              fontSize: "0.875rem",
              cursor: registerMutation.isPending ? "not-allowed" : "pointer",
              transition: "background 0.15s",
            }}
            onMouseEnter={(e) => { if (!registerMutation.isPending) e.currentTarget.style.background = "#d4b47a"; }}
            onMouseLeave={(e) => { if (!registerMutation.isPending) e.currentTarget.style.background = "#c8a56a"; }}
          >
            {registerMutation.isPending ? "…" : "Send verification code"}
          </button>
        </form>
      )}

      {/* Divider */}
      <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
        <div style={{ flex: 1, height: "1px", background: "rgba(200,162,96,0.12)" }} />
        <span style={{ fontSize: "0.75rem", color: "rgba(232,213,183,0.28)" }}>or</span>
        <div style={{ flex: 1, height: "1px", background: "rgba(200,162,96,0.12)" }} />
      </div>

      {/* Guest */}
      <button
        onClick={onGuest}
        style={{
          width: "100%",
          padding: "10px",
          borderRadius: "10px",
          border: "1px solid rgba(200,162,96,0.15)",
          background: "rgba(240,217,181,0.04)",
          color: "rgba(232,213,183,0.55)",
          fontWeight: 500,
          fontSize: "0.8125rem",
          cursor: "pointer",
          transition: "all 0.15s",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: "6px",
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.background = "rgba(240,217,181,0.08)";
          e.currentTarget.style.color = "rgba(232,213,183,0.75)";
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.background = "rgba(240,217,181,0.04)";
          e.currentTarget.style.color = "rgba(232,213,183,0.55)";
        }}
      >
        Continue as Guest
        <span style={{ fontSize: "0.7rem", opacity: 0.6 }}>→</span>
      </button>
    </div>
  );
}

// ── Animation variants ────────────────────────────────────────────────────────

const pageVariants = {
  initial: { opacity: 0 },
  animate: { opacity: 1, transition: { duration: 0.4, ease: "easeOut" } },
  exit: {
    opacity: 0,
    scale: 0.93,
    filter: "blur(18px)",
    transition: { duration: 0.45, ease: [0.4, 0, 1, 1] },
  },
};

const leftVariants = {
  initial: { opacity: 0 },
  animate: {
    opacity: 1,
    transition: { staggerChildren: 0.09, delayChildren: 0.05 },
  },
};

const itemVariants = {
  initial: { opacity: 0, y: 28 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.55, ease: [0.22, 1, 0.36, 1] } },
};

const cardVariants = {
  initial: { opacity: 0, y: 32, scale: 0.97 },
  animate: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { duration: 0.55, delay: 0.2, ease: [0.22, 1, 0.36, 1] },
  },
};

// ── Main landing page ─────────────────────────────────────────────────────────

export function LandingPage({ onGuest }: LandingPageProps) {
  return (
    <motion.div
      variants={pageVariants}
      initial="initial"
      animate="animate"
      exit="exit"
      style={{
        minHeight: "100svh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "24px 16px",
        position: "relative",
        overflow: "hidden",
        backgroundImage:
          "repeating-conic-gradient(rgba(200,162,96,0.025) 0% 25%, transparent 0% 50%)",
        backgroundSize: "48px 48px",
      }}
    >
      {/* Gradient vignette */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          background:
            "radial-gradient(ellipse 70% 70% at 50% 50%, transparent 20%, #1c1512 100%)",
          pointerEvents: "none",
        }}
      />

      {/* Decorative large piece */}
      <span
        aria-hidden
        style={{
          position: "absolute",
          top: "-24px",
          left: "-16px",
          fontSize: "clamp(140px, 22vw, 220px)",
          color: "rgba(200,162,96,0.04)",
          lineHeight: 1,
          userSelect: "none",
          pointerEvents: "none",
        }}
      >
        ♛
      </span>

      {/* Content grid */}
      <div
        style={{
          position: "relative",
          zIndex: 1,
          width: "100%",
          maxWidth: "840px",
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: "48px",
          alignItems: "center",
        }}
        className="landing-grid"
      >
        {/* ── Left: branding + board ── */}
        <motion.div
          variants={leftVariants}
          initial="initial"
          animate="animate"
          style={{ display: "flex", flexDirection: "column", gap: "32px" }}
        >
          <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
            <motion.div variants={itemVariants} style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              <span style={{ fontSize: "1.5rem", lineHeight: 1 }}>♟</span>
              <span
                style={{
                  fontSize: "0.7rem",
                  fontWeight: 700,
                  letterSpacing: "0.2em",
                  textTransform: "uppercase",
                  color: "rgba(200,162,96,0.6)",
                }}
              >
                Custom Chess
              </span>
            </motion.div>

            <motion.h1
              variants={itemVariants}
              style={{
                margin: 0,
                fontSize: "clamp(2rem, 4vw, 2.75rem)",
                fontWeight: 800,
                lineHeight: 1.1,
                letterSpacing: "-0.03em",
                color: "#e8d5b7",
              }}
            >
              Play chess
              <br />
              <span style={{ color: "#c8a56a" }}>your way.</span>
            </motion.h1>

            <motion.p
              variants={itemVariants}
              style={{
                margin: 0,
                fontSize: "0.9rem",
                color: "rgba(232,213,183,0.45)",
                lineHeight: 1.6,
              }}
            >
              Private rooms, custom time controls,
              <br />
              voice chat with your opponent.
            </motion.p>
          </div>

          <motion.div variants={itemVariants}>
            <MiniBoard />
          </motion.div>

          <motion.div variants={itemVariants} style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
            {["Private rooms", "Voice chat", "Custom timers"].map((f) => (
              <span
                key={f}
                style={{
                  fontSize: "0.7rem",
                  padding: "4px 10px",
                  borderRadius: "100px",
                  border: "1px solid rgba(200,162,96,0.18)",
                  color: "rgba(232,213,183,0.4)",
                  background: "rgba(200,162,96,0.05)",
                }}
              >
                {f}
              </span>
            ))}
          </motion.div>
        </motion.div>

        {/* ── Right: auth card ── */}
        <motion.div
          variants={cardVariants}
          initial="initial"
          animate="animate"
          style={{
            background: "rgba(26,18,8,0.85)",
            border: "1px solid rgba(200,162,96,0.14)",
            borderRadius: "20px",
            padding: "28px",
            backdropFilter: "blur(12px)",
            boxShadow: "0 24px 64px rgba(0,0,0,0.5)",
          }}
        >
          <div style={{ marginBottom: "24px" }}>
            <h2 style={{ margin: "0 0 4px", fontSize: "1.1rem", fontWeight: 700, color: "#e8d5b7" }}>
              Get started
            </h2>
            <p style={{ margin: 0, fontSize: "0.8rem", color: "rgba(232,213,183,0.38)" }}>
              Sign in to track your games and identity.
            </p>
          </div>
          <AuthForm onGuest={onGuest} />
        </motion.div>
      </div>

      <style>{`
        @media (max-width: 640px) {
          .landing-grid { grid-template-columns: 1fr !important; gap: 32px !important; }
        }
      `}</style>
    </motion.div>
  );
}
