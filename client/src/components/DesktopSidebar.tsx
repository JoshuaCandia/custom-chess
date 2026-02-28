import { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";

export function DesktopSidebar() {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const { user, logout } = useAuth();
  const [confirmLogout, setConfirmLogout] = useState(false);

  const isPlay     = !pathname.startsWith("/puzzles") && !pathname.startsWith("/settings");
  const isPuzzles  = pathname.startsWith("/puzzles");
  const isSettings = pathname.startsWith("/settings");

  return (
    <aside className="desktop-sidebar">
      <div className="sidebar-logo">
        <span className="text-xl leading-none">♟</span>
        <span className="text-sm font-bold tracking-tight text-c-base">Custom Chess</span>
      </div>

      <nav className="sidebar-nav">
        <button className={`sidebar-item ${isPlay ? "active" : ""}`} onClick={() => navigate("/")}>
          <span className="sidebar-icon">♟</span>
          Jugar
        </button>
        <button className={`sidebar-item ${isPuzzles ? "active" : ""}`} onClick={() => navigate("/puzzles")}>
          <span className="sidebar-icon">♞</span>
          Problemas
        </button>
        <button className={`sidebar-item ${isSettings ? "active" : ""}`} onClick={() => navigate("/settings")}>
          <span className="sidebar-icon">⚙</span>
          Ajustes
        </button>
      </nav>

      <div className="sidebar-footer">
        {user ? (
          <>
            <button
              className="btn btn-accent-outline text-xs truncate w-full"
              onClick={() => navigate(`/profile/${user.username}`)}
            >
              {user.username}{user.elo != null ? ` · ${user.elo}` : ""}
            </button>
            {confirmLogout ? (
              <div className="flex gap-1.5">
                <button
                  className="btn btn-danger text-xs flex-1"
                  onClick={() => { logout(); navigate("/login"); }}
                >
                  ✓ Salir
                </button>
                <button
                  className="btn btn-ghost text-xs"
                  onClick={() => setConfirmLogout(false)}
                >
                  ✕
                </button>
              </div>
            ) : (
              <button
                className="btn btn-ghost text-xs w-full"
                onClick={() => setConfirmLogout(true)}
              >
                Cerrar sesión
              </button>
            )}
          </>
        ) : null}
      </div>
    </aside>
  );
}
