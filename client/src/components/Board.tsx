import { useEffect, useRef, useState } from "react";
import { Chess } from "chess.js";
import type { Square } from "chess.js";
import { Chessboard } from "react-chessboard";
import type {
  PieceDropHandlerArgs,
  PieceHandlerArgs,
  SquareHandlerArgs,
} from "react-chessboard/dist/types";
import type { GameState, MoveInput } from "../types/chess";
import type { BoardTheme } from "../types/theme";

interface BoardProps {
  gameState: GameState;
  onMove: (move: MoveInput) => void;
  theme: BoardTheme;
}

// a1=(0+0)%2=0 → dark, h1=(7+0)%2=1 → light (matches standard chess board)
function isDarkSquare(sq: string): boolean {
  const col = sq.charCodeAt(0) - 97;
  const row = parseInt(sq[1]) - 1;
  return (col + row) % 2 === 0;
}

function getValidDestinations(fen: string, square: string): string[] {
  try {
    const chess = new Chess(fen);
    return chess
      .moves({ square: square as Square, verbose: true })
      .map((m) => m.to);
  } catch {
    return [];
  }
}

// Returns geometrically valid squares for a pre-move.
// Sliding pieces (B/R/Q) pass through all pieces since the board may change.
// Pawns respect direction and can target both diagonals (potential captures).
function getPreMoveDestinations(fen: string, square: string, playerColor: "w" | "b"): string[] {
  try {
    const chess = new Chess(fen);
    const piece = chess.get(square as Square);
    if (!piece || piece.color !== playerColor) return [];

    const col = square.charCodeAt(0) - 97; // a=0 … h=7
    const row = parseInt(square[1]) - 1;   // rank1=0 … rank8=7
    const result: string[] = [];

    function add(c: number, r: number) {
      if (c >= 0 && c <= 7 && r >= 0 && r <= 7) {
        result.push(String.fromCharCode(97 + c) + (r + 1));
      }
    }

    switch (piece.type) {
      case "p": {
        const dir = playerColor === "w" ? 1 : -1;
        add(col, row + dir);
        if ((playerColor === "w" && row === 1) || (playerColor === "b" && row === 6))
          add(col, row + 2 * dir);
        add(col - 1, row + dir);
        add(col + 1, row + dir);
        break;
      }
      case "n": {
        for (const [dc, dr] of [[-2,-1],[-2,1],[-1,-2],[-1,2],[1,-2],[1,2],[2,-1],[2,1]])
          add(col + dc, row + dr);
        break;
      }
      case "b": {
        for (const [dc, dr] of [[-1,-1],[-1,1],[1,-1],[1,1]])
          for (let i = 1; i <= 7; i++) add(col + dc * i, row + dr * i);
        break;
      }
      case "r": {
        for (let i = 0; i <= 7; i++) {
          if (i !== col) add(i, row);
          if (i !== row) add(col, i);
        }
        break;
      }
      case "q": {
        for (const [dc, dr] of [[-1,-1],[-1,1],[1,-1],[1,1],[-1,0],[1,0],[0,-1],[0,1]])
          for (let i = 1; i <= 7; i++) add(col + dc * i, row + dr * i);
        break;
      }
      case "k": {
        for (const [dc, dr] of [[-1,-1],[-1,0],[-1,1],[0,-1],[0,1],[1,-1],[1,0],[1,1]])
          add(col + dc, row + dr);
        // Castling squares
        add(col + 2, row);
        add(col - 2, row);
        break;
      }
    }

    return result;
  } catch {
    return [];
  }
}

function isPawnPromotion(
  fen: string,
  from: string,
  to: string,
  playerColor: "w" | "b"
): boolean {
  try {
    const chess = new Chess(fen);
    const piece = chess.get(from as Square);
    return (
      piece?.type === "p" &&
      piece?.color === playerColor &&
      ((playerColor === "w" && to[1] === "8") ||
        (playerColor === "b" && to[1] === "1"))
    );
  } catch {
    return false;
  }
}

export function Board({ gameState, onMove, theme }: BoardProps) {
  const { fen, playerColor, turn, status, lastMove } = gameState;
  const isMyTurn = turn === playerColor && status === "playing";

  const [selectedSquare, setSelectedSquare] = useState<string | null>(null);
  const [validSquares, setValidSquares] = useState<string[]>([]);
  const [preMove, setPreMove] = useState<MoveInput | null>(null);

  const prevTurnRef = useRef(turn);

  // Execute pre-move when it becomes my turn
  useEffect(() => {
    if (
      preMove &&
      turn === playerColor &&
      prevTurnRef.current !== playerColor &&
      status === "playing"
    ) {
      onMove(preMove);
      setPreMove(null);
      setSelectedSquare(null);
      setValidSquares([]);
    }
    prevTurnRef.current = turn;
  }, [turn]); // eslint-disable-line react-hooks/exhaustive-deps

  // Clear selection when game ends or FEN changes (move was made)
  useEffect(() => {
    setSelectedSquare(null);
    setValidSquares([]);
  }, [fen]);

  useEffect(() => {
    if (status === "finished") {
      setPreMove(null);
      setSelectedSquare(null);
      setValidSquares([]);
    }
  }, [status]);

  // ── Piece drop (drag & drop) ────────────────────────────────────────────────
  function onPieceDrop({
    sourceSquare,
    targetSquare,
  }: PieceDropHandlerArgs): boolean {
    if (!targetSquare) return false;
    const promo = isPawnPromotion(fen, sourceSquare, targetSquare, playerColor);
    const move: MoveInput = {
      from: sourceSquare,
      to: targetSquare,
      promotion: promo ? "q" : undefined,
    };
    if (isMyTurn) {
      onMove(move);
    } else if (status === "playing") {
      // Drag when not my turn → register as pre-move only if geometrically valid
      const geom = getPreMoveDestinations(fen, sourceSquare, playerColor);
      if (geom.includes(targetSquare)) {
        setPreMove(move);
      }
    }
    setSelectedSquare(null);
    setValidSquares([]);
    return false; // board driven by server FEN
  }

  // ── Square click (click-to-move + pre-move) ─────────────────────────────────
  function handleSquareClick({ square, piece }: SquareHandlerArgs) {
    if (status === "finished") return;

    const isOwnPiece = piece !== null && piece.pieceType[0] === playerColor;

    // ── Already have a square selected ────────────────────────────────────────
    if (selectedSquare) {
      // Clicked same square → deselect + cancel pre-move
      if (square === selectedSquare) {
        setSelectedSquare(null);
        setValidSquares([]);
        setPreMove(null);
        return;
      }

      // Clicked another own piece → switch selection, cancel pre-move
      if (isOwnPiece) {
        setPreMove(null);
        const dests = isMyTurn
          ? getValidDestinations(fen, square)
          : getPreMoveDestinations(fen, square, playerColor);
        setSelectedSquare(square);
        setValidSquares(dests);
        return;
      }

      // Clicked a destination square
      if (isMyTurn) {
        if (validSquares.includes(square)) {
          const promo = isPawnPromotion(fen, selectedSquare, square, playerColor);
          onMove({ from: selectedSquare, to: square, promotion: promo ? "q" : undefined });
        }
        setSelectedSquare(null);
        setValidSquares([]);
      } else {
        // Pre-move: only queue if geometrically valid
        if (validSquares.includes(square)) {
          setPreMove({ from: selectedSquare, to: square });
        }
        setSelectedSquare(null);
        setValidSquares([]);
      }
      return;
    }

    // ── No square selected — any click cancels pre-move ────────────────────────
    setPreMove(null);

    if (isOwnPiece) {
      const dests = isMyTurn
        ? getValidDestinations(fen, square)
        : getPreMoveDestinations(fen, square, playerColor);
      setSelectedSquare(square);
      setValidSquares(dests);
    }
  }

  // ── Square styles ──────────────────────────────────────────────────────────
  const squareStyles: Record<string, React.CSSProperties> = {};

  // Last move highlight
  if (lastMove) {
    const highlight = { backgroundColor: "rgba(205,210,106,0.45)" };
    squareStyles[lastMove.from] = highlight;
    squareStyles[lastMove.to] = highlight;
  }

  // Selected square
  if (selectedSquare) {
    squareStyles[selectedSquare] = { backgroundColor: "rgba(20,85,30,0.55)" };
  }

  // Valid move dots — colors driven by the active theme
  for (const sq of validSquares) {
    const dark = isDarkSquare(sq);
    const dotColor = dark ? theme.dotOnDark : theme.dotOnLight;
    const ringColor = dark ? theme.ringOnDark : theme.ringOnLight;
    const hasOpponentPiece = (() => {
      try {
        const chess = new Chess(fen);
        const p = chess.get(sq as Square);
        return p && p.color !== playerColor;
      } catch {
        return false;
      }
    })();

    squareStyles[sq] = hasOpponentPiece
      ? { background: `radial-gradient(circle, transparent 58%, ${ringColor} 58%)` }
      : { background: `radial-gradient(circle, ${dotColor} 28%, transparent 28%)` };
  }

  // Pre-move highlight
  if (preMove) {
    squareStyles[preMove.from] = { backgroundColor: "rgba(80, 130, 255, 0.45)" };
    squareStyles[preMove.to] = { backgroundColor: "rgba(80, 130, 255, 0.45)" };
  }

  return (
    <div className="w-full">
        <Chessboard
          options={{
            position: fen,
            boardOrientation: playerColor === "w" ? "white" : "black",
            allowDragging: status === "playing",
            canDragPiece: ({ piece }) => piece.pieceType[0] === playerColor,
            onPieceDrop,
            // onPieceClick ensures selection works even if onSquareClick
            // doesn't fire when clicking directly on a piece
            onPieceClick: ({ piece, square }: PieceHandlerArgs) => {
              if (square !== null) handleSquareClick({ square, piece });
            },
            onSquareClick: handleSquareClick,
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
    </div>
  );
}
