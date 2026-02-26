import { motion } from "framer-motion";

interface WelcomeModalProps {
  username: string;
  onClose: () => void;
}

export function WelcomeModal({ username, onClose }: WelcomeModalProps) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.72)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 300,
        backdropFilter: "blur(6px)",
      }}
    >
      <motion.div
        initial={{ scale: 0.88, opacity: 0, y: 28 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        transition={{ delay: 0.05, duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
        style={{
          background: "rgba(26,18,8,0.98)",
          border: "1px solid rgba(200,162,96,0.2)",
          borderRadius: "24px",
          padding: "44px 36px 36px",
          width: "min(380px, 90vw)",
          textAlign: "center",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: "20px",
          boxShadow: "0 32px 80px rgba(0,0,0,0.7)",
        }}
      >
        <motion.div
          initial={{ scale: 0, rotate: -20 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ delay: 0.2, duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
          style={{ fontSize: "3.5rem", lineHeight: 1 }}
        >
          ♔
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.35, duration: 0.5 }}
          style={{ display: "flex", flexDirection: "column", gap: "8px" }}
        >
          <h2 style={{ margin: 0, fontSize: "1.6rem", fontWeight: 800, color: "#e8d5b7", letterSpacing: "-0.025em" }}>
            Welcome, {username}!
          </h2>
          <p style={{ margin: 0, fontSize: "0.875rem", color: "rgba(232,213,183,0.45)", lineHeight: 1.6 }}>
            Your account is ready.<br />
            Time to claim the board.
          </p>
        </motion.div>

        <div style={{ display: "flex", alignItems: "center", gap: "12px", width: "100%", margin: "4px 0" }}>
          <div style={{ flex: 1, height: "1px", background: "rgba(200,162,96,0.12)" }} />
          <span style={{ fontSize: "0.85rem", color: "rgba(200,162,96,0.3)" }}>♛</span>
          <div style={{ flex: 1, height: "1px", background: "rgba(200,162,96,0.12)" }} />
        </div>

        <motion.button
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          onClick={onClose}
          style={{
            width: "100%",
            padding: "13px",
            borderRadius: "12px",
            border: "none",
            background: "#c8a56a",
            color: "#1c1512",
            fontWeight: 700,
            fontSize: "0.9375rem",
            cursor: "pointer",
            transition: "background 0.15s",
          }}
          onMouseEnter={(e) => (e.currentTarget.style.background = "#d4b47a")}
          onMouseLeave={(e) => (e.currentTarget.style.background = "#c8a56a")}
        >
          Let's play →
        </motion.button>
      </motion.div>
    </motion.div>
  );
}
