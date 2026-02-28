import { useNavigate, useLocation } from "react-router-dom";

export function MobileNav() {
  const navigate = useNavigate();
  const { pathname } = useLocation();

  const isPuzzles  = pathname.startsWith("/puzzles");
  const isSettings = pathname.startsWith("/settings");

  return (
    <nav className="mobile-nav">
      {/* Puzzles */}
      <button
        className={`mobile-nav-item ${isPuzzles ? "active" : ""}`}
        onClick={() => navigate("/puzzles")}
      >
        <span className="mobile-nav-icon">♞</span>
        Problemas
      </button>

      {/* Play — FAB center */}
      <button className="mobile-nav-fab" onClick={() => navigate("/")}>
        <div className="mobile-nav-fab-circle">♟</div>
        <span className="mobile-nav-fab-label">Jugar</span>
      </button>

      {/* Settings */}
      <button
        className={`mobile-nav-item ${isSettings ? "active" : ""}`}
        onClick={() => navigate("/settings")}
      >
        <span className="mobile-nav-icon">⚙</span>
        Ajustes
      </button>
    </nav>
  );
}
