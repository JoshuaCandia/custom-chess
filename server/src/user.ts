import { Router, Request, Response } from "express";
import { prisma } from "./db";
import { verifyJwt } from "./auth";

const router = Router();

// ── GET /user/:username — public profile + stats ──────────────────────────────

router.get("/user/:username", async (req: Request, res: Response) => {
  const { username } = req.params;

  const user = await prisma.user.findUnique({ where: { username } });
  if (!user) {
    res.status(404).json({ error: "User not found." });
    return;
  }

  const [
    winsAsWhite, lossesAsWhite, drawsAsWhite,
    winsAsBlack, lossesAsBlack, drawsAsBlack,
    recentGames,
  ] = await Promise.all([
    prisma.game.count({ where: { whiteId: user.id, result: "white" } }),
    prisma.game.count({ where: { whiteId: user.id, result: "black" } }),
    prisma.game.count({ where: { whiteId: user.id, result: "draw" } }),
    prisma.game.count({ where: { blackId: user.id, result: "black" } }),
    prisma.game.count({ where: { blackId: user.id, result: "white" } }),
    prisma.game.count({ where: { blackId: user.id, result: "draw" } }),
    prisma.game.findMany({
      where: { OR: [{ whiteId: user.id }, { blackId: user.id }] },
      orderBy: { playedAt: "desc" },
      take: 10,
      include: {
        white: { select: { username: true } },
        black: { select: { username: true } },
      },
    }),
  ]);

  const wins = winsAsWhite + winsAsBlack;
  const losses = lossesAsWhite + lossesAsBlack;
  const draws = drawsAsWhite + drawsAsBlack;
  const total = wins + losses + draws;

  res.json({
    id: user.id,
    username: user.username,
    createdAt: user.createdAt,
    elo: user.elo,
    stats: {
      total,
      wins,
      losses,
      draws,
      winRate: total > 0 ? Math.round((wins / total) * 100) : 0,
      asWhite: {
        played: winsAsWhite + lossesAsWhite + drawsAsWhite,
        wins: winsAsWhite,
        losses: lossesAsWhite,
        draws: drawsAsWhite,
      },
      asBlack: {
        played: winsAsBlack + lossesAsBlack + drawsAsBlack,
        wins: winsAsBlack,
        losses: lossesAsBlack,
        draws: drawsAsBlack,
      },
      recentGames: recentGames.map((g) => ({
        id: g.id,
        result: g.result,
        reason: g.reason,
        color: g.whiteId === user.id ? "white" : "black",
        opponent: g.whiteId === user.id ? (g.black?.username ?? "Guest") : (g.white?.username ?? "Guest"),
        moveCount: g.moveCount,
        timeControl: g.timeControl,
        playedAt: g.playedAt,
      })),
    },
  });
});

// ── PUT /user/me/settings — update theme (requires auth) ─────────────────────

router.put("/user/me/settings", async (req: Request, res: Response) => {
  const token = req.cookies?.["chess_token"] as string | undefined;
  if (!token) {
    res.status(401).json({ error: "Not authenticated." });
    return;
  }

  const payload = verifyJwt(token);
  if (!payload) {
    res.status(401).json({ error: "Invalid token." });
    return;
  }

  const { theme } = req.body as { theme?: string };
  if (!theme || typeof theme !== "string") {
    res.status(400).json({ error: "Theme is required." });
    return;
  }

  await prisma.user.update({ where: { id: payload.userId }, data: { theme } });
  res.json({ theme });
});

export { router as userRouter };
