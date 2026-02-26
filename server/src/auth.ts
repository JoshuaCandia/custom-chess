import { Router, Request, Response } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "./generated/prisma/client";
import { sendOtpEmail } from "./email";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL ?? "" });
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const prisma = new (PrismaClient as any)({ adapter }) as InstanceType<typeof PrismaClient>;
const router = Router();

const JWT_SECRET = process.env.JWT_SECRET ?? "dev-secret";
const CLIENT_URL = process.env.CLIENT_URL ?? "http://localhost:5173";
const COOKIE_NAME = "chess_token";
const COOKIE_MAX_AGE = 7 * 24 * 60 * 60 * 1000; // 7 days
const OTP_TTL_MS = 10 * 60 * 1000; // 10 minutes

// ── OTP store (in-memory, single-server) ──────────────────────────────────────

interface PendingReg {
  username: string;
  email: string;
  passwordHash: string;
  otp: string;
  expiresAt: number;
}

const pendingRegs = new Map<string, PendingReg>(); // key: email (lowercase)

// Clean up expired entries every 15 minutes
setInterval(() => {
  const now = Date.now();
  for (const [key, val] of pendingRegs) {
    if (val.expiresAt < now) pendingRegs.delete(key);
  }
}, 15 * 60 * 1000);

function generateOtp(): string {
  return Math.floor(100_000 + Math.random() * 900_000).toString();
}

// ── JWT helpers ───────────────────────────────────────────────────────────────

export function signJwt(userId: string): string {
  return jwt.sign({ userId }, JWT_SECRET, { expiresIn: "7d" });
}

export function verifyJwt(token: string): { userId: string } | null {
  try {
    return jwt.verify(token, JWT_SECRET) as { userId: string };
  } catch {
    return null;
  }
}

export async function getUserFromToken(token: string) {
  const payload = verifyJwt(token);
  if (!payload) return null;
  return prisma.user.findUnique({ where: { id: payload.userId } });
}

function setAuthCookie(res: Response, token: string) {
  res.cookie(COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: "lax",
    maxAge: COOKIE_MAX_AGE,
  });
}

// ── POST /auth/register — initiate: validate + send OTP ───────────────────────

router.post("/auth/register", async (req: Request, res: Response) => {
  const { username, password, email } = req.body as {
    username?: string;
    password?: string;
    email?: string;
  };

  if (!username || typeof username !== "string" || username.trim().length < 3) {
    res.status(400).json({ error: "Username must be at least 3 characters." });
    return;
  }
  if (!password || typeof password !== "string" || password.length < 6) {
    res.status(400).json({ error: "Password must be at least 6 characters." });
    return;
  }
  if (!email || typeof email !== "string" || !email.includes("@")) {
    res.status(400).json({ error: "A valid email is required." });
    return;
  }

  const normalEmail = email.trim().toLowerCase();

  const [existingUsername, existingEmail] = await Promise.all([
    prisma.user.findUnique({ where: { username: username.trim() } }),
    prisma.user.findUnique({ where: { email: normalEmail } }),
  ]);

  if (existingUsername) {
    res.status(409).json({ error: "Username already taken." });
    return;
  }
  if (existingEmail) {
    res.status(409).json({ error: "Email already registered." });
    return;
  }

  const passwordHash = await bcrypt.hash(password, 10);
  const otp = generateOtp();

  pendingRegs.set(normalEmail, {
    username: username.trim(),
    email: normalEmail,
    passwordHash,
    otp,
    expiresAt: Date.now() + OTP_TTL_MS,
  });

  try {
    await sendOtpEmail(normalEmail, otp);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[auth] Failed to send OTP email:", msg);
    pendingRegs.delete(normalEmail);
    res.status(500).json({ error: `Email error: ${msg}` });
    return;
  }

  res.json({ pending: true, message: "Verification code sent to your email." });
});

// ── POST /auth/register/verify — confirm OTP + create user ───────────────────

router.post("/auth/register/verify", async (req: Request, res: Response) => {
  const { email, otp } = req.body as { email?: string; otp?: string };

  if (!email || !otp) {
    res.status(400).json({ error: "Email and OTP are required." });
    return;
  }

  const normalEmail = email.trim().toLowerCase();
  const pending = pendingRegs.get(normalEmail);

  if (!pending) {
    res.status(400).json({ error: "No pending registration for this email." });
    return;
  }
  if (Date.now() > pending.expiresAt) {
    pendingRegs.delete(normalEmail);
    res.status(400).json({ error: "Verification code expired. Please register again." });
    return;
  }
  if (pending.otp !== otp.trim()) {
    res.status(400).json({ error: "Incorrect verification code." });
    return;
  }

  pendingRegs.delete(normalEmail);

  const user = await prisma.user.create({
    data: {
      username: pending.username,
      email: pending.email,
      passwordHash: pending.passwordHash,
    },
  });

  const token = signJwt(user.id);
  setAuthCookie(res, token);
  res.json({ id: user.id, username: user.username });
});

// ── POST /auth/login ──────────────────────────────────────────────────────────

router.post("/auth/login", async (req: Request, res: Response) => {
  const { username, password } = req.body as { username?: string; password?: string };

  if (!username || !password) {
    res.status(400).json({ error: "Username and password required." });
    return;
  }

  const user = await prisma.user.findUnique({ where: { username: username.trim() } });
  if (!user || !user.passwordHash) {
    res.status(401).json({ error: "Invalid credentials." });
    return;
  }

  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) {
    res.status(401).json({ error: "Invalid credentials." });
    return;
  }

  const token = signJwt(user.id);
  setAuthCookie(res, token);
  res.json({ id: user.id, username: user.username });
});

// ── POST /auth/logout ─────────────────────────────────────────────────────────

router.post("/auth/logout", (_req: Request, res: Response) => {
  res.clearCookie(COOKIE_NAME);
  res.json({ ok: true });
});

// ── GET /auth/me ──────────────────────────────────────────────────────────────

router.get("/auth/me", async (req: Request, res: Response) => {
  const token = req.cookies?.[COOKIE_NAME] as string | undefined;
  if (!token) {
    res.status(401).json({ error: "Not authenticated." });
    return;
  }

  const payload = verifyJwt(token);
  if (!payload) {
    res.status(401).json({ error: "Invalid or expired token." });
    return;
  }

  const user = await prisma.user.findUnique({ where: { id: payload.userId } });
  if (!user) {
    res.status(401).json({ error: "User not found." });
    return;
  }

  res.json({ id: user.id, username: user.username, email: user.email });
});

// ── Google OAuth ──────────────────────────────────────────────────────────────

if (process.env.GOOGLE_CLIENT_ID) {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const GoogleStrategy = require("passport-google-oauth20").Strategy;
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const passport = require("passport");

  passport.use(
    new GoogleStrategy(
      {
        clientID: process.env.GOOGLE_CLIENT_ID,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET,
        callbackURL: "/auth/google/callback",
      },
      async (
        _accessToken: string,
        _refreshToken: string,
        profile: { id: string; displayName: string; emails?: { value: string }[] },
        done: (err: unknown, user?: unknown) => void
      ) => {
        const email = profile.emails?.[0]?.value ?? null;
        let user = await prisma.user.findUnique({ where: { googleId: profile.id } });
        if (!user) {
          const base = profile.displayName.replace(/\s+/g, "").slice(0, 20) || "user";
          let username = base;
          let attempt = 0;
          while (await prisma.user.findUnique({ where: { username } })) {
            attempt += 1;
            username = `${base}${attempt}`;
          }
          user = await prisma.user.create({
            data: { googleId: profile.id, username, email },
          });
        }
        done(null, user);
      }
    )
  );

  router.get("/auth/google", passport.authenticate("google", { scope: ["profile", "email"], session: false }));

  router.get(
    "/auth/google/callback",
    passport.authenticate("google", { session: false, failureRedirect: `${CLIENT_URL}?auth=failed` }),
    (req: Request, res: Response) => {
      const user = req.user as { id: string };
      const token = signJwt(user.id);
      setAuthCookie(res, token);
      res.redirect(CLIENT_URL);
    }
  );
}

export { router as authRouter };
