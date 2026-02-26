import { useEffect, useRef } from "react";

interface MoveListProps {
  moves: string[];
  height: string;
}

// Unicode piece icons per color.
// "w" = outlined glyphs (white pieces), "b" = filled glyphs (black pieces).
const ICONS: Record<string, { w: string; b: string }> = {
  k: { w: "♔", b: "♚" },
  q: { w: "♕", b: "♛" },
  r: { w: "♖", b: "♜" },
  b: { w: "♗", b: "♝" },
  n: { w: "♘", b: "♞" },
  p: { w: "♙", b: "♟" },
};

// Returns { icon, text } where text is SAN without the leading piece letter
// so we can render   ♘f3   instead of   ♘Nf3.
function parseSan(san: string, color: "w" | "b"): { icon: string; text: string } {
  if (san.startsWith("O")) {
    // Castling — show king icon + keep "O-O" / "O-O-O"
    return { icon: ICONS.k[color], text: san };
  }
  const first = san[0];
  if (first >= "A" && first <= "Z") {
    // Named piece move — strip the leading letter, add icon
    return { icon: ICONS[first.toLowerCase()][color], text: san.slice(1) };
  }
  // Pawn move (starts with file letter a-h)
  return { icon: ICONS.p[color], text: san };
}

export function MoveList({ moves, height }: MoveListProps) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [moves.length]);

  // Group into pairs: ["e4","e5","Nf3"] → [[1,"e4","e5"],[2,"Nf3",undefined]]
  const pairs: [number, string, string | undefined][] = [];
  for (let i = 0; i < moves.length; i += 2) {
    pairs.push([i / 2 + 1, moves[i], moves[i + 1]]);
  }

  const lastIdx = moves.length - 1;

  return (
    <div
      className="flex flex-col"
      style={{ width: "100%", height, overflow: "hidden" }}
    >
      {/* Scrollable list */}
      <div className="flex-1 overflow-y-auto py-1">
        {pairs.length === 0 ? (
          <p
            className="text-center py-6 text-xs"
            style={{ color: "rgba(232,213,183,0.2)" }}
          >
            —
          </p>
        ) : (
          pairs.map(([n, white, black]) => {
            const wi = (n - 1) * 2;
            const bi = wi + 1;
            const w = parseSan(white, "w");
            const b = black !== undefined ? parseSan(black, "b") : null;
            const wActive = wi === lastIdx;
            const bActive = b !== null && bi === lastIdx;

            return (
              <div
                key={n}
                className="flex items-baseline font-mono text-xs"
                style={{ padding: "2px 8px", gap: "4px" }}
              >
                {/* Move number */}
                <span
                  style={{
                    color: "rgba(232,213,183,0.28)",
                    minWidth: "20px",
                    flexShrink: 0,
                  }}
                >
                  {n}.
                </span>

                {/* White move */}
                <span
                  style={{
                    flex: 1,
                    color: wActive ? "#e8d5b7" : "rgba(232,213,183,0.6)",
                    fontWeight: wActive ? 600 : 400,
                  }}
                >
                  <span style={{ marginRight: "2px", fontSize: "0.8em" }}>
                    {w.icon}
                  </span>
                  {w.text}
                </span>

                {/* Black move */}
                <span
                  style={{
                    flex: 1,
                    color: bActive ? "#e8d5b7" : "rgba(232,213,183,0.6)",
                    fontWeight: bActive ? 600 : 400,
                  }}
                >
                  {b && (
                    <>
                      <span style={{ marginRight: "2px", fontSize: "0.8em" }}>
                        {b.icon}
                      </span>
                      {b.text}
                    </>
                  )}
                </span>
              </div>
            );
          })
        )}
        <div ref={bottomRef} />
      </div>
    </div>
  );
}
