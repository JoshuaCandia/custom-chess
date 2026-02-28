import { Router, Request, Response } from "express";
import { Chess } from "chess.js";
import https from "https";
import { prisma } from "./db";
import { Prisma } from "./generated/prisma/client";
import { verifyJwt } from "./auth";

const router = Router();

// ── Auth helper ────────────────────────────────────────────────────────────────

function getUserIdFromRequest(req: Request): string | null {
  const token = req.cookies?.["chess_token"] as string | undefined;
  if (!token) return null;
  const payload = verifyJwt(token);
  return payload?.userId ?? null;
}

// ── Daily puzzle cache ─────────────────────────────────────────────────────────

interface CachedDaily {
  id: string;
  fen: string;
  moves: string[];
  rating: number;
  themes: string[];
  initialPly: number;
  pgn: string;
}

let dailyCache: { date: string; data: CachedDaily } | null = null;

function getTodayUtc(): string {
  return new Date().toISOString().slice(0, 10);
}

async function fetchLichessDaily(): Promise<CachedDaily> {
  return new Promise((resolve, reject) => {
    https.get(
      "https://lichess.org/api/puzzle/daily",
      { headers: { Accept: "application/json" } },
      (res) => {
        let body = "";
        res.on("data", (chunk: Buffer) => (body += chunk.toString()));
        res.on("end", () => {
          try {
            const json = JSON.parse(body) as {
              game: { pgn: string };
              puzzle: {
                id: string;
                solution: string[];
                themes: string[];
                rating: number;
                initialPly: number;
              };
            };
            const { puzzle, game } = json;
            const chess = new Chess();
            chess.loadPgn(game.pgn);
            const history = chess.history({ verbose: true });
            const chess2 = new Chess();
            for (let i = 0; i < puzzle.initialPly; i++) {
              if (history[i]) chess2.move(history[i]);
            }
            // Fix turn based on the piece that needs to move
            const fromSq = puzzle.solution[0].slice(0, 2);
            const movingPiece = chess2.get(fromSq as Parameters<typeof chess2.get>[0]);
            const color = movingPiece ? movingPiece.color : chess2.turn();
            const fenParts = chess2.fen().split(" ");
            fenParts[1] = color;
            const fen = fenParts.join(" ");

            resolve({
              id: puzzle.id,
              fen,
              moves: puzzle.solution,
              rating: puzzle.rating,
              themes: puzzle.themes,
              initialPly: puzzle.initialPly,
              pgn: game.pgn,
            });
          } catch (e) {
            reject(e);
          }
        });
        res.on("error", reject);
      }
    ).on("error", reject);
  });
}

// ── GET /api/puzzles/daily ─────────────────────────────────────────────────────

router.get("/api/puzzles/daily", async (req: Request, res: Response) => {
  const today = getTodayUtc();
  if (!dailyCache || dailyCache.date !== today) {
    try {
      const data = await fetchLichessDaily();
      dailyCache = { date: today, data };
      // Upsert into DB so stats can reference it
      await prisma.puzzle.upsert({
        where: { id: data.id },
        update: {},
        create: {
          id: data.id,
          fen: data.fen,
          moves: data.moves.join(" "),
          rating: data.rating,
          themes: JSON.stringify(data.themes),
        },
      });
    } catch {
      res.status(502).json({ error: "Failed to fetch daily puzzle from Lichess." });
      return;
    }
  }

  const puzzle = dailyCache.data;
  const userId = getUserIdFromRequest(req);
  let solvedByMe = false;
  if (userId) {
    const attempt = await prisma.puzzleAttempt.findUnique({
      where: { userId_puzzleId: { userId, puzzleId: puzzle.id } },
    });
    solvedByMe = attempt?.solved ?? false;
  }

  res.json({ puzzle, solvedByMe });
});

// ── GET /api/puzzles/me/stats ──────────────────────────────────────────────────
// IMPORTANT: this route must come before /:id

router.get("/api/puzzles/me/stats", async (req: Request, res: Response) => {
  const userId = getUserIdFromRequest(req);
  if (!userId) {
    res.status(401).json({ error: "Not authenticated." });
    return;
  }

  const attempts = await prisma.puzzleAttempt.findMany({
    where: { userId },
    include: { puzzle: true },
  });

  const solved = attempts.filter((a) => a.solved).length;
  const attempted = attempts.length;
  const accuracy = attempted > 0 ? Math.round((solved / attempted) * 100) : 0;

  // Group by theme
  const themeMap = new Map<string, { solved: number; attempted: number }>();
  for (const attempt of attempts) {
    let themes: string[] = [];
    try {
      themes = JSON.parse(attempt.puzzle.themes) as string[];
    } catch {
      themes = [];
    }
    for (const theme of themes) {
      const entry = themeMap.get(theme) ?? { solved: 0, attempted: 0 };
      entry.attempted += 1;
      if (attempt.solved) entry.solved += 1;
      themeMap.set(theme, entry);
    }
  }

  const byTheme = Array.from(themeMap.entries()).map(([theme, stats]) => ({
    theme,
    ...stats,
  }));

  res.json({ solved, attempted, accuracy, byTheme });
});

// ── GET /api/puzzles ───────────────────────────────────────────────────────────

router.get("/api/puzzles", async (req: Request, res: Response) => {
  const { theme, minRating, maxRating, limit, exclude } = req.query as Record<string, string | undefined>;

  const where: Prisma.PuzzleWhereInput = {};
  if (theme) where.themes = { contains: `"${theme}"` };
  if (minRating || maxRating) {
    where.rating = {
      ...(minRating ? { gte: parseInt(minRating, 10) } : {}),
      ...(maxRating ? { lte: parseInt(maxRating, 10) } : {}),
    };
  }
  if (exclude) {
    where.id = { notIn: exclude.split(",").map((s) => s.trim()).filter(Boolean) };
  }

  const count = await prisma.puzzle.count({ where });
  if (count === 0) {
    res.json({ puzzles: [], emptyDb: true });
    return;
  }

  const puzzles = await prisma.puzzle.findMany({
    where,
    take: Math.min(parseInt(limit ?? "10", 10), 50),
    orderBy: { rating: "asc" },
  });

  const userId = getUserIdFromRequest(req);
  if (!userId) {
    res.json({ puzzles: puzzles.map((p) => ({ ...p, moves: p.moves.split(" "), themes: JSON.parse(p.themes) as string[], solvedByMe: false })) });
    return;
  }

  const ids = puzzles.map((p) => p.id);
  const attempts = await prisma.puzzleAttempt.findMany({
    where: { userId, puzzleId: { in: ids } },
  });
  const solvedSet = new Set(attempts.filter((a) => a.solved).map((a) => a.puzzleId));

  res.json({
    puzzles: puzzles.map((p) => ({
      id: p.id,
      fen: p.fen,
      moves: p.moves.split(" "),
      rating: p.rating,
      themes: JSON.parse(p.themes) as string[],
      solvedByMe: solvedSet.has(p.id),
    })),
  });
});

// ── GET /api/puzzles/:id ───────────────────────────────────────────────────────

router.get("/api/puzzles/:id", async (req: Request, res: Response) => {
  const id = req.params["id"] as string;
  const puzzle = await prisma.puzzle.findUnique({ where: { id } });
  if (!puzzle) {
    res.status(404).json({ error: "Puzzle not found." });
    return;
  }

  const userId = getUserIdFromRequest(req);
  let solvedByMe = false;
  if (userId) {
    const attempt = await prisma.puzzleAttempt.findUnique({
      where: { userId_puzzleId: { userId, puzzleId: id } },
    });
    solvedByMe = attempt?.solved ?? false;
  }

  res.json({
    puzzle: {
      id: puzzle.id,
      fen: puzzle.fen,
      moves: puzzle.moves.split(" "),
      rating: puzzle.rating,
      themes: JSON.parse(puzzle.themes) as string[],
      solvedByMe,
    },
  });
});

// ── POST /api/puzzles/:id/attempt ─────────────────────────────────────────────

router.post("/api/puzzles/:id/attempt", async (req: Request, res: Response) => {
  const userId = getUserIdFromRequest(req);
  if (!userId) {
    res.status(401).json({ error: "Not authenticated." });
    return;
  }

  const id = req.params["id"] as string;
  const { solved } = req.body as { solved?: boolean };
  if (typeof solved !== "boolean") {
    res.status(400).json({ error: "solved (boolean) is required." });
    return;
  }

  await prisma.puzzleAttempt.upsert({
    where: { userId_puzzleId: { userId, puzzleId: id } },
    update: { solved, createdAt: new Date() },
    create: { userId, puzzleId: id, solved },
  });

  res.json({ ok: true });
});

export { router as puzzleRouter };
