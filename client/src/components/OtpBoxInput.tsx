import { OTPInput } from "input-otp";
import { motion } from "framer-motion";

interface OtpBoxInputProps {
  value: string;
  onChange: (v: string) => void;
  onBlur?: () => void;
  autoFocus?: boolean;
}

export function OtpBoxInput({ value, onChange, onBlur, autoFocus }: OtpBoxInputProps) {
  return (
    <OTPInput
      maxLength={6}
      value={value}
      onChange={onChange}
      onBlur={onBlur}
      autoFocus={autoFocus}
      render={({ slots }) => (
        <div style={{ display: "flex", gap: "8px", justifyContent: "center" }}>
          {slots.map((slot, i) => (
            <div
              key={i}
              style={{
                width: "44px",
                height: "52px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                position: "relative",
                fontSize: "1.6rem",
                fontFamily: "monospace",
                fontWeight: 700,
                background: slot.char ? "rgba(200,162,96,0.1)" : "rgba(240,217,181,0.05)",
                border: `1px solid ${
                  slot.isActive
                    ? "rgba(200,162,96,0.6)"
                    : slot.char
                    ? "rgba(200,162,96,0.35)"
                    : "rgba(200,162,96,0.18)"
                }`,
                borderRadius: "10px",
                color: "#c8a56a",
                transition: "border-color 0.15s, background 0.15s, box-shadow 0.15s",
                boxShadow: slot.isActive ? "0 0 0 3px rgba(200,162,96,0.1)" : "none",
              }}
            >
              {slot.char}
              {slot.hasFakeCaret && (
                <motion.div
                  animate={{ opacity: [1, 0] }}
                  transition={{ duration: 0.9, repeat: Infinity, repeatType: "reverse", ease: "linear" }}
                  style={{
                    position: "absolute",
                    width: "2px",
                    height: "1.5rem",
                    background: "#c8a56a",
                    borderRadius: "1px",
                  }}
                />
              )}
            </div>
          ))}
        </div>
      )}
    />
  );
}
