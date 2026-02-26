import { useState } from "react";
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
type Step = "fields" | "otp";

interface AuthModalProps {
  onClose: () => void;
}

export function AuthModal({ onClose }: AuthModalProps) {
  const { loginMutation, registerMutation, verifyOtpMutation } = useAuth();
  const { setJustRegistered } = useAuthStore();
  const [tab, setTab] = useState<Tab>("login");
  const [step, setStep] = useState<Step>("fields");
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
      onClose();
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
      onClose();
    } catch (err) {
      otpForm.setError("root", { message: (err as Error).message });
    }
  }

  const panelStyle: React.CSSProperties = {
    background: "#1a1208",
    border: "1px solid rgba(200,162,96,0.25)",
    borderRadius: "1rem",
    padding: "1.75rem",
    width: "min(420px, 90vw)",
    color: "#e8d5b7",
  };

  const inputStyle: React.CSSProperties = {
    width: "100%",
    background: "rgba(240,217,181,0.06)",
    border: "1px solid rgba(200,162,96,0.2)",
    borderRadius: "0.5rem",
    padding: "0.5rem 0.75rem",
    color: "#e8d5b7",
    fontSize: "0.875rem",
    outline: "none",
    boxSizing: "border-box",
  };

  const btnPrimary: React.CSSProperties = {
    width: "100%",
    background: "#c8a56a",
    border: "none",
    borderRadius: "0.5rem",
    padding: "0.55rem",
    color: "#1c1512",
    fontWeight: 700,
    fontSize: "0.875rem",
    cursor: "pointer",
  };

  const fieldError = (msg?: string) =>
    msg ? (
      <p style={{ color: "#f87171", fontSize: "0.8rem", margin: 0 }}>{msg}</p>
    ) : null;

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.6)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 100,
      }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div style={panelStyle}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.25rem" }}>
          <span style={{ fontWeight: 700, fontSize: "1.05rem" }}>♟ Custom Chess</span>
          <button
            onClick={onClose}
            style={{ background: "none", border: "none", color: "rgba(232,213,183,0.4)", cursor: "pointer", fontSize: "1.1rem" }}
          >
            ✕
          </button>
        </div>

        {step === "otp" ? (
          <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
            <div>
              <button
                onClick={() => { setStep("fields"); otpForm.reset(); }}
                style={{ background: "none", border: "none", color: "rgba(232,213,183,0.4)", fontSize: "0.8rem", cursor: "pointer", padding: 0, marginBottom: "8px" }}
              >
                ← Back
              </button>
              <p style={{ margin: "0 0 4px", fontWeight: 600, color: "#e8d5b7" }}>Check your inbox</p>
              <p style={{ margin: 0, fontSize: "0.8rem", color: "rgba(232,213,183,0.4)" }}>
                Code sent to <span style={{ color: "rgba(200,162,96,0.8)" }}>{pendingEmail}</span>
              </p>
            </div>
            <form
              onSubmit={otpForm.handleSubmit(handleOtp)}
              style={{ display: "flex", flexDirection: "column", gap: "12px" }}
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
                style={{ ...btnPrimary, opacity: verifyOtpMutation.isPending ? 0.6 : 1, cursor: verifyOtpMutation.isPending ? "not-allowed" : "pointer" }}
                disabled={verifyOtpMutation.isPending}
              >
                {verifyOtpMutation.isPending ? "Verifying…" : "Confirm"}
              </button>
            </form>
          </div>
        ) : (
          <>
            <div style={{ display: "flex", gap: "0.5rem", marginBottom: "1.25rem" }}>
              {(["login", "register"] as Tab[]).map((t) => (
                <button
                  key={t}
                  onClick={() => switchTab(t)}
                  style={{
                    flex: 1, padding: "0.4rem", borderRadius: "0.5rem",
                    border: tab === t ? "1px solid rgba(200,162,96,0.4)" : "1px solid transparent",
                    background: tab === t ? "rgba(200,162,96,0.12)" : "transparent",
                    color: tab === t ? "#e8d5b7" : "rgba(232,213,183,0.4)",
                    fontWeight: 600, fontSize: "0.8125rem", cursor: "pointer",
                  }}
                >
                  {t === "login" ? "Sign In" : "Register"}
                </button>
              ))}
            </div>

            {tab === "login" ? (
              <form
                onSubmit={loginForm.handleSubmit(handleLogin)}
                style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}
              >
                <input
                  {...loginForm.register("username")}
                  style={inputStyle}
                  type="text"
                  placeholder="Username"
                  autoComplete="username"
                />
                {fieldError(loginForm.formState.errors.username?.message)}
                <input
                  {...loginForm.register("password")}
                  style={inputStyle}
                  type="password"
                  placeholder="Password"
                  autoComplete="current-password"
                />
                {fieldError(loginForm.formState.errors.password?.message)}
                {fieldError(loginForm.formState.errors.root?.message)}
                <button
                  type="submit"
                  style={{ ...btnPrimary, opacity: loginMutation.isPending ? 0.6 : 1, cursor: loginMutation.isPending ? "not-allowed" : "pointer" }}
                  disabled={loginMutation.isPending}
                >
                  {loginMutation.isPending ? "…" : "Sign In"}
                </button>
              </form>
            ) : (
              <form
                onSubmit={registerForm.handleSubmit(handleRegister)}
                style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}
              >
                <input
                  {...registerForm.register("username")}
                  style={inputStyle}
                  type="text"
                  placeholder="Username"
                  autoComplete="username"
                />
                {fieldError(registerForm.formState.errors.username?.message)}
                <input
                  {...registerForm.register("password")}
                  style={inputStyle}
                  type="password"
                  placeholder="Password"
                  autoComplete="new-password"
                />
                {fieldError(registerForm.formState.errors.password?.message)}
                <input
                  {...registerForm.register("email")}
                  style={inputStyle}
                  type="email"
                  placeholder="Email"
                  autoComplete="email"
                />
                {fieldError(registerForm.formState.errors.email?.message)}
                {fieldError(registerForm.formState.errors.root?.message)}
                <button
                  type="submit"
                  style={{ ...btnPrimary, opacity: registerMutation.isPending ? 0.6 : 1, cursor: registerMutation.isPending ? "not-allowed" : "pointer" }}
                  disabled={registerMutation.isPending}
                >
                  {registerMutation.isPending ? "…" : "Send verification code"}
                </button>
              </form>
            )}

            <div style={{ textAlign: "center", marginTop: "1rem" }}>
              <button
                onClick={onClose}
                style={{ background: "none", border: "none", color: "rgba(232,213,183,0.35)", fontSize: "0.8125rem", cursor: "pointer" }}
              >
                Continue as Guest
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
