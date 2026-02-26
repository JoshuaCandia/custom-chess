import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import { LandingPage } from "../components/LandingPage";

function Spinner() {
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

export function LoginPage() {
  const { user, loading, setGuestMode } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && user) {
      navigate("/", { replace: true });
    }
  }, [loading, user, navigate]);

  if (loading) return <Spinner />;
  if (user) return null;

  function handleGuest() {
    setGuestMode(true);
    navigate("/");
  }

  return <LandingPage onGuest={handleGuest} />;
}
