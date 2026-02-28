import { useState, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { Chess } from "chess.js";
import type { Square } from "chess.js";
import { Chessboard } from "react-chessboard";
import type { PieceDropHandlerArgs, SquareHandlerArgs } from "react-chessboard/dist/types";
import { AppLayout } from "../components/AppLayout";
import { useTheme } from "../hooks/useTheme";

// ── Types ──────────────────────────────────────────────────────────────────────

interface LichessPuzzle {
  game: { pgn: string };
  puzzle: {
    initialPly: number;
    solution: string[];
    rating: number;
  };
}

type PuzzleStatus = "waiting" | "correct" | "wrong" | "solved";

// ── Helpers ────────────────────────────────────────────────────────────────────

async function fetchDailyPuzzle(): Promise<LichessPuzzle> {
  const res = await fetch("https://lichess.org/api/puzzle/daily", {
    headers: { Accept: "application/json" },
  });
  if (!res.ok) throw new Error("Failed to fetch puzzle");
  return res.json() as Promise<LichessPuzzle>;
}

function getPuzzleStart(pgn: string, initialPly: number): { fen: string; color: "w" | "b" } {
  const chess = new Chess();
  chess.loadPgn(pgn);
  const history = chess.history({ verbose: true });

  const chess2 = new Chess();
  for (let i = 0; i < initialPly; i++) {
    if (history[i]) chess2.move(history[i]);
  }
  return { fen: chess2.fen(), color: chess2.turn() };
}

function uciToFromTo(uci: string): { from: string; to: string; promotion?: string } {
  return {
    from: uci.slice(0, 2),
    to: uci.slice(2, 4),
    promotion: uci.length === 5 ? uci[4] : undefined,
  };
}

// ── Status message ─────────────────────────────────────────────────────────────

function StatusMessage({ status }: { status: PuzzleStatus }) {
  if (status === "waiting") {
    return <p className="m-0 text-sm text-c-muted">Encontrá el mejor movimiento.</p>;
  }
  if (status === "correct") {
    return <p className="m-0 text-sm text-c-win font-semibold">✓ ¡Correcto! Seguí.</p>;
  }
  if (status === "wrong") {
    return <p className="m-0 text-sm text-c-loss font-semibold">✗ Incorrecto. Intentá de nuevo.</p>;
  }
  return <p className="m-0 text-sm text-c-accent font-bold">¡Resuelto!</p>;
}

// ── Puzzle board ───────────────────────────────────────────────────────────────

interface PuzzleBoardProps {
  puzzle: LichessPuzzle;
  onSolved: () => void;
}

function PuzzleBoard({ puzzle, onSolved }: PuzzleBoardProps) {
  const { theme } = useTheme();
  const { fen: startFen, color: playerColor } = getPuzzleStart(
    puzzle.game.pgn,
    puzzle.puzzle.initialPly
  );
  const { solution } = puzzle.puzzle;

  const [fen, setFen] = useState(startFen);
  const [solutionIdx, setSolutionIdx] = useState(0);
  const [status, setStatus] = useState<PuzzleStatus>("waiting");
  const [selectedSquare, setSelectedSquare] = useState<string | null>(null);

  const resetPuzzle = useCallback(() => {
    setFen(startFen);
    setSolutionIdx(0);
    setStatus("waiting");
    setSelectedSquare(null);
  }, [startFen]);

  function applyOpponentMove(chess: Chess, idx: number): string {
    const uci = solution[idx];
    if (!uci) return chess.fen();
    const { from, to, promotion } = uciToFromTo(uci);
    chess.move({ from, to, promotion: promotion ?? "q" });
    return chess.fen();
  }

  function handleMove(from: string, to: string): boolean {
    if (status === "solved" || solutionIdx >= solution.length) return false;

    const expectedUci = solution[solutionIdx];
    const { from: expFrom, to: expTo, promotion } = uciToFromTo(expectedUci);

    if (from !== expFrom || to !== expTo) {
      setStatus("wrong");
      setTimeout(() => setStatus("waiting"), 1200);
      return false;
    }

    const chess = new Chess(fen);
    chess.move({ from, to, promotion: promotion ?? "q" });
    const afterPlayer = chess.fen();
    const nextIdx = solutionIdx + 1;

    if (nextIdx >= solution.length) {
      setFen(afterPlayer);
      setSolutionIdx(nextIdx);
      setStatus("solved");
      onSolved();
      return false;
    }

    setStatus("correct");
    setFen(afterPlayer);

    setTimeout(() => {
      const afterOpponent = applyOpponentMove(new Chess(afterPlayer), nextIdx);
      setFen(afterOpponent);
      const nextNextIdx = nextIdx + 1;
      setSolutionIdx(nextNextIdx);
      const isDone = nextNextIdx >= solution.length;
      setStatus(isDone ? "solved" : "waiting");
      if (isDone) onSolved();
    }, 600);

    return false;
  }

  function onPieceDrop({ sourceSquare, targetSquare }: PieceDropHandlerArgs): boolean {
    setSelectedSquare(null);
    return handleMove(sourceSquare, targetSquare);
  }

  function onSquareClick({ square }: SquareHandlerArgs) {
    if (status === "solved") return;
    const chess = new Chess(fen);
    const piece = chess.get(square as Square);
    const isOwnPiece = piece && piece.color === playerColor;

    if (selectedSquare) {
      if (square === selectedSquare) { setSelectedSquare(null); return; }
      if (isOwnPiece) { setSelectedSquare(square); return; }
      handleMove(selectedSquare, square);
      setSelectedSquare(null);
      return;
    }
    if (isOwnPiece) setSelectedSquare(square);
  }

  const squareStyles: Record<string, React.CSSProperties> = {};
  if (selectedSquare) {
    squareStyles[selectedSquare] = { backgroundColor: "rgba(20,85,30,0.55)" };
  }

  const orientation = playerColor === "w" ? "white" : "black";

  return (
    <div className="flex flex-col gap-4">
      {/* Board — full width on mobile, max 480px centered on desktop */}
      <div className="w-full md:max-w-[480px] md:mx-auto">
        <Chessboard
          options={{
            position: fen,
            boardOrientation: orientation,
            onPieceDrop,
            onSquareClick,
            squareStyles,
            allowDrawingArrows: false,
            animationDurationInMs: 150,
            lightSquareStyle: { backgroundColor: theme.light },
            darkSquareStyle: { backgroundColor: theme.dark },
            boardStyle: {
              borderRadius: "4px",
              boxShadow: "0 4px 24px rgba(0,0,0,0.5)",
              border: `2px solid ${theme.border}`,
            },
          }}
        />
      </div>

      {/* Info card — horizontal padding on mobile since board is full-bleed */}
      <div className="px-4 md:px-0 md:max-w-[480px] md:mx-auto md:w-full">
        <div className="card flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <div>
              <p className="m-0 label-xs mb-1">Puzzle del día</p>
              <p className="m-0 text-xs text-c-faint">Rating: {puzzle.puzzle.rating}</p>
            </div>
            <span className="text-2xl opacity-20 text-c-base">♛</span>
          </div>

          <StatusMessage status={status} />

          {status === "wrong" && (
            <button className="btn btn-ghost text-xs" onClick={resetPuzzle}>
              Reintentar
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Page ───────────────────────────────────────────────────────────────────────

export function PuzzlePage() {
  const [puzzleKey, setPuzzleKey] = useState(0);

  const { data: puzzle, isLoading, isError, refetch } = useQuery({
    queryKey: ["puzzle", "daily", puzzleKey],
    queryFn: fetchDailyPuzzle,
    staleTime: Infinity,
    retry: 1,
  });

  function handleSolved() {
    // no-op; status shown inside PuzzleBoard
  }

  return (
    <AppLayout>
    <div className="min-h-svh flex flex-col bg-c-bg">
      {/* Header (mobile only — desktop uses sidebar) */}
      <header className="page-nav sm:hidden">
        <div className="flex items-center gap-2">
          <span className="text-xl leading-none">♟</span>
          <span className="text-sm font-bold tracking-tight text-c-base">Custom Chess</span>
        </div>
      </header>

      {/* Body */}
      <div className="flex-1 flex flex-col pt-6 pb-24 md:pb-8">
        {/* Title — with padding */}
        <div className="px-4 mb-5 w-full max-w-[520px] md:mx-auto">
          <h2 className="m-0 mb-0.5 text-xl font-extrabold tracking-tight text-c-base">
            Problemas
          </h2>
          <p className="m-0 text-[0.82rem] text-c-faint">
            Puzzle diario de Lichess
          </p>
        </div>

        {isLoading && (
          <div className="mx-4 card flex items-center justify-center min-h-[200px]">
            <div className="flex gap-1.5">
              {[0, 1, 2].map((i) => (
                <div
                  key={i}
                  className="w-1.5 h-1.5 rounded-full bg-c-accent"
                  style={{ animation: `dot 1.4s ease-in-out ${i * 0.2}s infinite` }}
                />
              ))}
            </div>
          </div>
        )}

        {isError && (
          <div className="mx-4 flex flex-col gap-3">
            <div className="error-banner">No se pudo cargar el puzzle. Verificá tu conexión.</div>
            <button className="btn btn-secondary" onClick={() => refetch()}>
              Reintentar
            </button>
          </div>
        )}

        {/* Board — full bleed on mobile */}
        {puzzle && (
          <PuzzleBoard
            key={puzzleKey}
            puzzle={puzzle}
            onSolved={handleSolved}
          />
        )}
      </div>
    </div>
    </AppLayout>
  );
}
