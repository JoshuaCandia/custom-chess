import { useState, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { Chess } from "chess.js";
import type { Square } from "chess.js";
import { Chessboard } from "react-chessboard";
import type {
  PieceDropHandlerArgs,
  PieceHandlerArgs,
  SquareHandlerArgs,
} from "react-chessboard";
import { AppLayout } from "../components/AppLayout";
import { useTheme } from "../hooks/useTheme";
import { useGameSounds } from "../hooks/useGameSounds";
import { useAuth } from "../hooks/useAuth";
import {
  apiFetchDailyPuzzle,
  apiFetchPuzzles,
  apiFetchMyPuzzleStats,
  apiRecordAttempt,
} from "../lib/puzzleApi";
import type { PuzzleFilter } from "../lib/puzzleApi";
import type { PuzzleData, PuzzleWithStatus } from "../types/puzzle";

// ── Constants ─────────────────────────────────────────────────────────────────

const DIFFICULTIES = [
  { id: "beginner",     label: "Principiante", min: 600,  max: 1199, icon: "★☆☆☆" },
  { id: "intermediate", label: "Intermedio",   min: 1200, max: 1699, icon: "★★☆☆" },
  { id: "advanced",     label: "Avanzado",     min: 1700, max: 2199, icon: "★★★☆" },
  { id: "expert",       label: "Experto",      min: 2200, max: 3500, icon: "★★★★" },
] as const;

const THEMES = [
  { id: "mateIn1",    label: "Jaque Mate",  icon: "♚", queryTheme: "mate" },
  { id: "fork",       label: "Tenedores",   icon: "⚔", queryTheme: "fork" },
  { id: "pin",        label: "Clavadas",    icon: "📌", queryTheme: "pin" },
  { id: "sacrifice",  label: "Sacrificios", icon: "🎯", queryTheme: "sacrifice" },
  { id: "endgame",    label: "Finales",     icon: "🏁", queryTheme: "endgame" },
  { id: "middlegame", label: "Mediojuego",  icon: "⚡", queryTheme: "middlegame" },
] as const;

// ── Navigation state ──────────────────────────────────────────────────────────

type ActiveView =
  | { kind: "hub" }
  | { kind: "puzzle"; puzzle: PuzzleWithStatus; filter?: PuzzleFilter; label: string };

// ── Puzzle logic helpers ───────────────────────────────────────────────────────

function uciToFromTo(uci: string): { from: string; to: string; promotion?: string } {
  return {
    from: uci.slice(0, 2),
    to: uci.slice(2, 4),
    promotion: uci.length === 5 ? uci[4] : undefined,
  };
}

function isDarkSquare(sq: string): boolean {
  const col = sq.charCodeAt(0) - 97;
  const row = parseInt(sq[1]) - 1;
  return (col + row) % 2 === 0;
}

function getValidDestinations(fen: string, square: string): string[] {
  try {
    const chess = new Chess(fen);
    return chess.moves({ square: square as Square, verbose: true }).map((m) => m.to);
  } catch {
    return [];
  }
}

type PuzzleStatus = "waiting" | "correct" | "wrong" | "solved";

// ── StatusMessage ─────────────────────────────────────────────────────────────

function StatusMessage({ status, hintLevel }: { status: PuzzleStatus; hintLevel: number }) {
  if (status !== "waiting") return null;
  if (hintLevel === 1) return <p className="m-0 text-sm text-c-muted">Mové la pieza marcada en verde.</p>;
  if (hintLevel === 2) return <p className="m-0 text-sm text-c-muted">Verde → casillero dorado.</p>;
  return <p className="m-0 text-sm text-c-muted">Encontrá el mejor movimiento.</p>;
}

// ── PuzzleBoard ───────────────────────────────────────────────────────────────

interface PuzzleBoardProps {
  puzzle: PuzzleData;
  label: string;
  onSolved: () => void;
  onNext?: () => void;
  isAuthenticated: boolean;
}

function PuzzleBoard({ puzzle, label, onSolved, onNext, isAuthenticated }: PuzzleBoardProps) {
  const { theme } = useTheme();
  const { play } = useGameSounds();

  const startFen = puzzle.fen;
  const playerColor = puzzle.fen.split(" ")[1] as "w" | "b";
  const solution = puzzle.moves;

  const [fen, setFen] = useState(startFen);
  const [solutionIdx, setSolutionIdx] = useState(0);
  const [status, setStatus] = useState<PuzzleStatus>("waiting");
  const [selectedSquare, setSelectedSquare] = useState<string | null>(null);
  const [validSquares, setValidSquares] = useState<string[]>([]);
  const [lastMove, setLastMove] = useState<{ from: string; to: string } | null>(null);
  const [hintLevel, setHintLevel] = useState(0);
  const [attemptRecorded, setAttemptRecorded] = useState(false);

  const resetPuzzle = useCallback(() => {
    setFen(startFen);
    setSolutionIdx(0);
    setStatus("waiting");
    setSelectedSquare(null);
    setValidSquares([]);
    setLastMove(null);
    setHintLevel(0);
    setAttemptRecorded(false);
  }, [startFen]);

  function recordAttemptOnce(solved: boolean) {
    if (!isAuthenticated || attemptRecorded) return;
    setAttemptRecorded(true);
    apiRecordAttempt(puzzle.id, solved);
  }

  function applyOpponentMove(
    chess: Chess,
    idx: number,
  ): { fen: string; wasCapture: boolean; from: string; to: string } {
    const uci = solution[idx];
    if (!uci) return { fen: chess.fen(), wasCapture: false, from: "", to: "" };
    const { from, to, promotion } = uciToFromTo(uci);
    const target = chess.get(to as Square);
    const wasCapture = target !== null;
    chess.move({ from, to, promotion: promotion ?? "q" });
    return { fen: chess.fen(), wasCapture, from, to };
  }

  function handleMove(from: string, to: string): void {
    if (status !== "waiting" || solutionIdx >= solution.length) return;

    const expectedUci = solution[solutionIdx];
    const { from: expFrom, to: expTo, promotion } = uciToFromTo(expectedUci);

    if (from !== expFrom || to !== expTo) {
      recordAttemptOnce(false);
      setStatus("wrong");
      setSelectedSquare(null);
      setValidSquares([]);
      setTimeout(() => setStatus("waiting"), 1200);
      return;
    }

    const chess = new Chess(fen);
    const target = chess.get(expTo as Square);
    const wasCapture = target !== null;
    chess.move({ from, to, promotion: promotion ?? "q" });
    const afterPlayer = chess.fen();
    const nextIdx = solutionIdx + 1;

    play(wasCapture ? "capture" : "move");
    setLastMove({ from, to });
    setSelectedSquare(null);
    setValidSquares([]);
    setHintLevel(0);

    if (nextIdx >= solution.length) {
      setFen(afterPlayer);
      setSolutionIdx(nextIdx);
      setStatus("solved");
      play("notify");
      recordAttemptOnce(true);
      onSolved();
      return;
    }

    setStatus("correct");
    setFen(afterPlayer);

    setTimeout(() => {
      const chess2 = new Chess(afterPlayer);
      const {
        fen: afterOpponent,
        wasCapture: oppCapture,
        from: oppFrom,
        to: oppTo,
      } = applyOpponentMove(chess2, nextIdx);
      play(oppCapture ? "capture" : "move");
      setFen(afterOpponent);
      setLastMove({ from: oppFrom, to: oppTo });
      const nextNextIdx = nextIdx + 1;
      setSolutionIdx(nextNextIdx);
      const isDone = nextNextIdx >= solution.length;
      setStatus(isDone ? "solved" : "waiting");
      if (isDone) {
        play("notify");
        recordAttemptOnce(true);
        onSolved();
      }
    }, 600);
  }

  function onPieceDrop({ sourceSquare, targetSquare }: PieceDropHandlerArgs): boolean {
    handleMove(sourceSquare, targetSquare ?? "");
    return false;
  }

  function handleSquareSelect(square: Square): void {
    if (status !== "waiting") return;
    const chess = new Chess(fen);
    const piece = chess.get(square);
    const isOwnPiece = piece && piece.color === playerColor;

    if (selectedSquare) {
      if (square === selectedSquare) {
        setSelectedSquare(null);
        setValidSquares([]);
        return;
      }
      if (isOwnPiece) {
        setSelectedSquare(square);
        setValidSquares(getValidDestinations(fen, square));
        return;
      }
      handleMove(selectedSquare, square);
      setSelectedSquare(null);
      setValidSquares([]);
      return;
    }
    if (isOwnPiece) {
      setSelectedSquare(square);
      setValidSquares(getValidDestinations(fen, square));
    }
  }

  function onSquareClick({ square }: SquareHandlerArgs): void {
    handleSquareSelect(square as Square);
  }

  function onPieceClick({ square }: PieceHandlerArgs): void {
    if (square) handleSquareSelect(square as Square);
  }

  const squareStyles: Record<string, React.CSSProperties> = {};

  if (lastMove) {
    const highlight = { backgroundColor: "rgba(205,210,106,0.45)" };
    squareStyles[lastMove.from] = highlight;
    squareStyles[lastMove.to] = highlight;
  }
  if (selectedSquare) {
    squareStyles[selectedSquare] = { backgroundColor: "rgba(20,85,30,0.55)" };
  }
  for (const sq of validSquares) {
    const dark = isDarkSquare(sq);
    const dotColor = dark ? theme.dotOnDark : theme.dotOnLight;
    const ringColor = dark ? theme.ringOnDark : theme.ringOnLight;
    const chess = new Chess(fen);
    const p = chess.get(sq as Square);
    const hasOpponent = p && p.color !== playerColor;
    squareStyles[sq] = hasOpponent
      ? { background: `radial-gradient(circle, transparent 58%, ${ringColor} 58%)` }
      : { background: `radial-gradient(circle, ${dotColor} 28%, transparent 28%)` };
  }

  const expectedMove = solutionIdx < solution.length ? uciToFromTo(solution[solutionIdx]) : null;
  if (hintLevel >= 1 && expectedMove) {
    squareStyles[expectedMove.from] = { backgroundColor: "rgba(20,85,30,0.65)" };
    const hintDests = getValidDestinations(fen, expectedMove.from);
    for (const sq of hintDests) {
      if (squareStyles[sq]) continue;
      const dark = isDarkSquare(sq);
      const dotColor = dark ? theme.dotOnDark : theme.dotOnLight;
      const ringColor = dark ? theme.ringOnDark : theme.ringOnLight;
      const tempChess = new Chess(fen);
      const p = tempChess.get(sq as Square);
      const hasOpponent = p && p.color !== playerColor;
      squareStyles[sq] = hasOpponent
        ? { background: `radial-gradient(circle, transparent 58%, ${ringColor} 58%)` }
        : { background: `radial-gradient(circle, ${dotColor} 28%, transparent 28%)` };
    }
  }
  if (hintLevel >= 2 && expectedMove) {
    squareStyles[expectedMove.to] = { backgroundColor: "rgba(255,180,0,0.70)" };
  }

  const orientation = playerColor === "w" ? "white" : "black";
  const firstTheme = puzzle.themes[0] ?? "";

  return (
    <div className="flex-1 min-h-0 flex flex-col pt-2">
      {/* Board */}
      <div className="flex-1 min-h-0 flex items-center justify-center">
        <div className="relative w-full max-w-[min(100%,calc(100svh-210px))] md:max-w-[480px] mx-auto">
          <Chessboard
            options={{
              position: fen,
              boardOrientation: orientation,
              allowDragging: status === "waiting",
              canDragPiece: ({ piece }) => piece.pieceType[0] === playerColor,
              onPieceDrop,
              onPieceClick,
              onSquareClick,
              squareStyles,
              animationDurationInMs: 100,
              allowDrawingArrows: true,
              clearArrowsOnClick: true,
              lightSquareStyle: { backgroundColor: theme.light },
              darkSquareStyle: { backgroundColor: theme.dark },
              boardStyle: {
                borderRadius: "4px",
                boxShadow: "0 8px 40px rgba(0,0,0,0.6)",
                border: `2px solid ${theme.border}`,
              },
            }}
          />

          {status !== "waiting" && (
            <div className="puzzle-overlay">
              <div
                className={`puzzle-overlay-badge ${
                  status === "wrong"
                    ? "puzzle-overlay-wrong"
                    : status === "solved"
                      ? "puzzle-overlay-solved"
                      : "puzzle-overlay-correct"
                }`}
              >
                <span className="puzzle-overlay-icon">{status === "wrong" ? "✗" : "✓"}</span>
                {status === "solved" && (
                  <span className="puzzle-overlay-text">¡Resuelto!</span>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Info strip */}
      <div className="shrink-0 px-4 md:px-0 md:max-w-[480px] md:mx-auto md:w-full py-2">
        <div className="card flex flex-col gap-1.5 py-2.5 px-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="label-xs text-c-faint">{label}</span>
              <span className="text-c-faint text-[0.65rem]">·</span>
              <span className="text-sm leading-none">{playerColor === "w" ? "♔" : "♚"}</span>
              <span className="label-xs">{playerColor === "w" ? "Blancas" : "Negras"}</span>
              <span className="text-c-faint text-[0.65rem]">·</span>
              <span className="text-c-faint text-[0.65rem]">Rating {puzzle.rating}</span>
              {firstTheme && (
                <>
                  <span className="text-c-faint text-[0.65rem]">·</span>
                  <span className="text-c-faint text-[0.65rem] capitalize">{firstTheme}</span>
                </>
              )}
            </div>
            <button
              className="btn btn-ghost text-xs py-1 px-2"
              disabled={status !== "waiting" || hintLevel >= 2}
              onClick={() => setHintLevel((h) => Math.min(h + 1, 2))}
            >
              {hintLevel === 0 ? "Pista" : hintLevel === 1 ? "Más pista" : "···"}
            </button>
          </div>

          <div className="flex items-center justify-between gap-2">
            <div className="min-w-0">
              <StatusMessage status={status} hintLevel={hintLevel} />
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button
                className={`btn btn-ghost text-xs py-1 px-2 ${status !== "wrong" ? "invisible" : ""}`}
                onClick={resetPuzzle}
                tabIndex={status !== "wrong" ? -1 : 0}
              >
                Reintentar
              </button>
              {status === "solved" && onNext && (
                <button className="btn btn-accent-outline text-xs py-1 px-2" onClick={onNext}>
                  Siguiente →
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="sm:hidden mobile-nav-spacer" />
    </div>
  );
}

// ── Loading dots ──────────────────────────────────────────────────────────────

function LoadingDots() {
  return (
    <div className="flex-1 flex items-center justify-center">
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
  );
}

// ── Hub view ──────────────────────────────────────────────────────────────────

interface HubProps {
  onSelectDifficulty: (diff: typeof DIFFICULTIES[number]) => void;
  onSelectTheme: (t: typeof THEMES[number]) => void;
  onPlayDaily: () => void;
  isAuthenticated: boolean;
}

function HubView({ onSelectDifficulty, onSelectTheme, onPlayDaily, isAuthenticated }: HubProps) {
  const { data: dailyRes, isLoading: dailyLoading, isError: dailyError } = useQuery({
    queryKey: ["puzzle", "daily"],
    queryFn: apiFetchDailyPuzzle,
    staleTime: Infinity,
    retry: 1,
  });

  const { data: stats } = useQuery({
    queryKey: ["puzzle-stats"],
    queryFn: apiFetchMyPuzzleStats,
    enabled: isAuthenticated,
    staleTime: 60_000,
  });

  const { data: puzzlesCheck } = useQuery({
    queryKey: ["puzzles-check"],
    queryFn: () => apiFetchPuzzles({ limit: 1 }),
    staleTime: Infinity,
  });

  const dbEmpty = puzzlesCheck?.emptyDb === true;

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="px-4 pt-4 pb-2 flex flex-col gap-5 md:max-w-2xl md:mx-auto">

        {/* Daily puzzle card */}
        <section className="flex flex-col gap-2">
          <span className="label-xs">Puzzle diario</span>
          <div className="card flex gap-4 p-4">
            {dailyLoading && <LoadingDots />}
            {dailyError && (
              <p className="text-sm text-c-muted">No se pudo cargar el puzzle diario.</p>
            )}
            {dailyRes && (
              <>
                {/* Mini static board */}
                <div className="relative shrink-0" style={{ width: 120, height: 120 }}>
                  <Chessboard
                    options={{
                      position: dailyRes.puzzle.fen,
                      boardOrientation: dailyRes.puzzle.fen.split(" ")[1] === "w" ? "white" : "black",
                      allowDragging: false,
                    }}
                  />
                  {dailyRes.solvedByMe && (
                    <div className="puzzle-solved-overlay">
                      <span className="puzzle-solved-icon">✓</span>
                    </div>
                  )}
                </div>
                {/* Info */}
                <div className="flex flex-col justify-between flex-1 min-w-0">
                  <div className="flex flex-col gap-1">
                    <span className="text-sm font-semibold text-c-base leading-tight">
                      {dailyRes.puzzle.themes[0] ?? "Táctica"}
                    </span>
                    <span className="text-xs text-c-muted">Rating {dailyRes.puzzle.rating}</span>
                    {dailyRes.solvedByMe && (
                      <span className="text-xs text-c-win font-medium">¡Ya lo resolviste!</span>
                    )}
                  </div>
                  <button className="btn btn-accent-outline text-xs py-1.5" onClick={onPlayDaily}>
                    {dailyRes.solvedByMe ? "Volver a jugar" : "Jugar"}
                  </button>
                </div>
              </>
            )}
          </div>
        </section>

        {/* Difficulty selector */}
        <section className="flex flex-col gap-2">
          <span className="label-xs">Entrenamiento por dificultad</span>
          {dbEmpty && (
            <div className="error-banner text-xs">
              Ejecutá <code className="font-mono">npm run seed:puzzles</code> para cargar los puzzles de entrenamiento.
            </div>
          )}
          <div className="grid grid-cols-2 gap-2">
            {DIFFICULTIES.map((diff) => (
              <button
                key={diff.id}
                className="puzzle-filter-card"
                disabled={dbEmpty}
                onClick={() => onSelectDifficulty(diff)}
              >
                <span className="text-sm text-c-accent">{diff.icon}</span>
                <span className="text-sm font-semibold text-c-base">{diff.label}</span>
                <span className="text-xs text-c-muted">{diff.min}–{diff.max} rating</span>
              </button>
            ))}
          </div>
        </section>

        {/* Theme selector */}
        <section className="flex flex-col gap-2">
          <span className="label-xs">Por tema</span>
          <div className="grid grid-cols-3 gap-2">
            {THEMES.map((t) => (
              <button
                key={t.id}
                className="puzzle-filter-card"
                disabled={dbEmpty}
                onClick={() => onSelectTheme(t)}
              >
                <span className="text-xl">{t.icon}</span>
                <span className="text-xs font-semibold text-c-base leading-tight">{t.label}</span>
              </button>
            ))}
          </div>
        </section>

        {/* Stats widget */}
        {isAuthenticated && stats && stats.attempted > 0 && (
          <section className="card flex items-center justify-around gap-4 py-3">
            <div className="flex flex-col items-center gap-0.5">
              <span className="text-xl font-bold text-c-accent">{stats.solved}</span>
              <span className="label-xs">Resueltos</span>
            </div>
            <div className="divider" style={{ width: 1, height: 32, background: "var(--c-border-faint)" }} />
            <div className="flex flex-col items-center gap-0.5">
              <span className="text-xl font-bold text-c-base">{stats.attempted}</span>
              <span className="label-xs">Intentados</span>
            </div>
            <div className="divider" style={{ width: 1, height: 32, background: "var(--c-border-faint)" }} />
            <div className="flex flex-col items-center gap-0.5">
              <span className="text-xl font-bold text-c-win">{stats.accuracy}%</span>
              <span className="label-xs">Precisión</span>
            </div>
          </section>
        )}

        <div className="sm:hidden mobile-nav-spacer" />
      </div>
    </div>
  );
}

// ── PuzzlePage ────────────────────────────────────────────────────────────────

export function PuzzlePage() {
  const { user } = useAuth();
  const isAuthenticated = user !== null;
  const [view, setView] = useState<ActiveView>({ kind: "hub" });
  const [solvedIds, setSolvedIds] = useState<Set<string>>(new Set());

  const { data: dailyRes } = useQuery({
    queryKey: ["puzzle", "daily"],
    queryFn: apiFetchDailyPuzzle,
    staleTime: Infinity,
    retry: 1,
  });

  function handleSolved(puzzleId: string) {
    setSolvedIds((prev) => new Set([...prev, puzzleId]));
  }

  async function loadNextPuzzle(filter: PuzzleFilter, currentId: string) {
    const res = await apiFetchPuzzles({ ...filter, limit: 5, exclude: [currentId, ...solvedIds] });
    const next = res.puzzles[0];
    if (next) {
      setView((prev) => ({
        kind: "puzzle",
        puzzle: next,
        filter,
        label: prev.kind === "puzzle" ? prev.label : "Entrenamiento",
      }));
    }
  }

  function handleSelectDifficulty(diff: typeof DIFFICULTIES[number]) {
    const filter: PuzzleFilter = { minRating: diff.min, maxRating: diff.max, limit: 1 };
    apiFetchPuzzles(filter).then((res) => {
      if (res.puzzles[0]) {
        setView({ kind: "puzzle", puzzle: res.puzzles[0], filter, label: diff.label });
      }
    });
  }

  function handleSelectTheme(t: typeof THEMES[number]) {
    const filter: PuzzleFilter = { theme: t.queryTheme, limit: 1 };
    apiFetchPuzzles(filter).then((res) => {
      if (res.puzzles[0]) {
        setView({ kind: "puzzle", puzzle: res.puzzles[0], filter, label: t.label });
      }
    });
  }

  function handlePlayDaily() {
    if (dailyRes) {
      setView({
        kind: "puzzle",
        puzzle: { ...dailyRes.puzzle, solvedByMe: dailyRes.solvedByMe },
        label: "Puzzle diario",
      });
    }
  }

  return (
    <AppLayout>
      <div className="h-svh overflow-hidden flex flex-col bg-c-bg">
        {/* Header */}
        {view.kind === "hub" ? (
          <header className="page-nav sm:hidden shrink-0">
            <div className="flex items-center gap-2">
              <span className="text-xl leading-none">♟</span>
              <span className="text-sm font-bold tracking-tight text-c-base">Problemas</span>
            </div>
          </header>
        ) : (
          <header className="page-nav shrink-0">
            <button
              className="btn btn-ghost text-xs py-1 px-2"
              onClick={() => setView({ kind: "hub" })}
            >
              ← Problemas
            </button>
            <div className="flex items-center gap-2">
              <span className="label-xs">{view.label}</span>
              <span className="text-c-faint text-[0.65rem]">·</span>
              <span className="text-c-faint text-[0.65rem]">Rating {view.puzzle.rating}</span>
            </div>
          </header>
        )}

        {/* Body */}
        <div className="flex-1 min-h-0 flex flex-col">
          {view.kind === "hub" ? (
            <HubView
              onSelectDifficulty={handleSelectDifficulty}
              onSelectTheme={handleSelectTheme}
              onPlayDaily={handlePlayDaily}
              isAuthenticated={isAuthenticated}
            />
          ) : (
            <PuzzleBoard
              key={view.puzzle.id}
              puzzle={view.puzzle}
              label={view.label}
              isAuthenticated={isAuthenticated}
              onSolved={() => handleSolved(view.puzzle.id)}
              onNext={
                view.filter
                  ? () => loadNextPuzzle(view.filter!, view.puzzle.id)
                  : undefined
              }
            />
          )}
        </div>
      </div>
    </AppLayout>
  );
}
