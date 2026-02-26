import "dotenv/config";
import express from "express";
import { createServer } from "http";
import { Server } from "socket.io";
import { Chess } from "chess.js";
import { randomBytes } from "crypto";
import cors from "cors";
import cookieParser from "cookie-parser";
import type {
  Room,
  CreateRoomPayload,
  JoinRoomPayload,
  MakeMovePayload,
  ChatMessagePayload,
} from "./types/chess";
import { authRouter, verifyJwt, getUserFromToken } from "./auth";

const CLIENT_URL = process.env.CLIENT_URL ?? "http://localhost:5173";

const app = express();
app.use(cors({ origin: CLIENT_URL, credentials: true }));
app.use(express.json());
app.use(cookieParser());
app.use(authRouter);

const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: { origin: CLIENT_URL, credentials: true, methods: ["GET", "POST"] },
});

const rooms = new Map<string, Room>();

function generateRoomId(): string {
  let id: string;
  do {
    id = `SALA-${randomBytes(2).toString("hex").toUpperCase().slice(0, 3)}`;
  } while (rooms.has(id));
  return id;
}

// ── Timer helpers ─────────────────────────────────────────────────────────────

function deductElapsedTime(room: Room, color: "w" | "b") {
  if (!room.timeControl || room.lastMoveTimestamp === 0) return;
  const elapsed = Date.now() - room.lastMoveTimestamp;
  if (color === "w") {
    room.timeWhite = Math.max(0, room.timeWhite - elapsed);
  } else {
    room.timeBlack = Math.max(0, room.timeBlack - elapsed);
  }
}

function startClock(room: Room) {
  if (room.timerRef) clearTimeout(room.timerRef);
  if (!room.timeControl || room.status !== "playing") return;

  const currentTurn = room.game.turn();
  const remaining = currentTurn === "w" ? room.timeWhite : room.timeBlack;

  room.lastMoveTimestamp = Date.now();
  room.timerRef = setTimeout(() => {
    if (room.status !== "playing") return;
    room.status = "finished";
    if (currentTurn === "w") room.timeWhite = 0;
    else room.timeBlack = 0;
    io.to(room.id).emit("timeout", {
      loser: currentTurn,
      winner: currentTurn === "w" ? "b" : "w",
    });
  }, remaining);
}

function clearClock(room: Room) {
  if (room.timerRef) {
    clearTimeout(room.timerRef);
    room.timerRef = null;
  }
}

// ── Cookie helper ─────────────────────────────────────────────────────────────

function parseCookieValue(cookieHeader: string | undefined, name: string): string | null {
  if (!cookieHeader) return null;
  const match = cookieHeader.split(";").map((c) => c.trim()).find((c) => c.startsWith(`${name}=`));
  return match ? match.slice(name.length + 1) : null;
}

// ── Health check ──────────────────────────────────────────────────────────────

app.get("/health", (_req, res) => {
  res.json({ ok: true, rooms: rooms.size });
});

// ── Socket.io auth middleware ─────────────────────────────────────────────────

io.use(async (socket, next) => {
  const token = parseCookieValue(socket.handshake.headers.cookie, "chess_token");
  if (token) {
    const payload = verifyJwt(token);
    if (payload) {
      const user = await getUserFromToken(token);
      socket.data.user = user ?? null;
    } else {
      socket.data.user = null;
    }
  } else {
    socket.data.user = null;
  }
  next();
});

// ── Socket.io ─────────────────────────────────────────────────────────────────

io.on("connection", (socket) => {
  console.log(`[connect] ${socket.id}`);

  const socketUser = socket.data.user as { id: string; username: string } | null;

  // ── create-room ────────────────────────────────────────────────────────────
  socket.on("create-room", ({ timeControl }: CreateRoomPayload) => {
    const roomId = generateRoomId();
    const initialMs = timeControl ? timeControl * 1000 : 0;
    const username = socketUser?.username ?? "Guest";
    const room: Room = {
      id: roomId,
      players: [
        {
          socketId: socket.id,
          color: "w",
          connected: true,
          userId: socketUser?.id,
          username,
        },
      ],
      game: new Chess(),
      status: "waiting",
      createdAt: Date.now(),
      timeControl,
      timeWhite: initialMs,
      timeBlack: initialMs,
      lastMoveTimestamp: 0,
      timerRef: null,
    };
    rooms.set(roomId, room);
    socket.join(roomId);
    socket.emit("room-created", { roomId, timeControl, myUsername: username });
    console.log(`[create-room] ${roomId} (timer: ${timeControl ?? "none"}) — ${username}`);
  });

  // ── join-room ──────────────────────────────────────────────────────────────
  socket.on("join-room", ({ roomId }: JoinRoomPayload) => {
    const room = rooms.get(roomId);
    if (!room) {
      socket.emit("join-error", { reason: "Room not found." });
      return;
    }
    if (room.status !== "waiting") {
      socket.emit("join-error", { reason: "Room is full or game already started." });
      return;
    }

    const username = socketUser?.username ?? "Guest";
    room.players.push({
      socketId: socket.id,
      color: "b",
      connected: true,
      userId: socketUser?.id,
      username,
    });
    room.status = "playing";
    socket.join(roomId);

    const fen = room.game.fen();

    for (const player of room.players) {
      const opponent = room.players.find((p) => p.socketId !== player.socketId);
      io.to(player.socketId).emit("game-start", {
        roomId,
        color: player.color,
        fen,
        timeControl: room.timeControl,
        timeWhite: room.timeWhite,
        timeBlack: room.timeBlack,
        myUsername: player.username,
        opponentUsername: opponent?.username ?? "Guest",
      });
    }

    startClock(room);
    console.log(`[join-room] ${roomId} — game started`);
  });

  // ── make-move ──────────────────────────────────────────────────────────────
  socket.on("make-move", ({ roomId, move }: MakeMovePayload) => {
    const room = rooms.get(roomId);
    if (!room || room.status !== "playing") {
      socket.emit("invalid-move", { reason: "Game is not active." });
      return;
    }

    const player = room.players.find((p) => p.socketId === socket.id);
    if (!player) {
      socket.emit("invalid-move", { reason: "You are not in this room." });
      return;
    }
    if (room.game.turn() !== player.color) {
      socket.emit("invalid-move", { reason: "Not your turn." });
      return;
    }

    deductElapsedTime(room, player.color);
    clearClock(room);

    let result;
    try {
      result = room.game.move({ ...move, promotion: move.promotion ?? "q" });
    } catch {
      socket.emit("invalid-move", { reason: "Illegal move." });
      startClock(room);
      return;
    }

    if (!result) {
      socket.emit("invalid-move", { reason: "Illegal move." });
      startClock(room);
      return;
    }

    const isCheckmate = room.game.isCheckmate();
    const isStalemate = room.game.isStalemate();
    const isDraw = room.game.isDraw();
    const isGameOver = isCheckmate || isStalemate || isDraw;

    if (isGameOver) {
      room.status = "finished";
    } else {
      startClock(room);
    }

    io.to(roomId).emit("move-made", {
      fen: room.game.fen(),
      move: { from: result.from, to: result.to, san: result.san },
      turn: room.game.turn(),
      isCheck: room.game.inCheck(),
      isCheckmate,
      isStalemate,
      isDraw,
      timeWhite: room.timeWhite,
      timeBlack: room.timeBlack,
    });

    console.log(`[make-move] ${roomId} — ${result.san}`);
  });

  // ── WebRTC signaling relay ─────────────────────────────────────────────────
  function relayToOther(eventName: string, roomId: string, payload: object) {
    const room = rooms.get(roomId);
    if (!room) return;
    const other = room.players.find((p) => p.socketId !== socket.id);
    if (other) io.to(other.socketId).emit(eventName, payload);
  }

  socket.on("webrtc-offer",         ({ roomId, sdp       }) => relayToOther("webrtc-offer",         roomId, { sdp }));
  socket.on("webrtc-answer",        ({ roomId, sdp       }) => relayToOther("webrtc-answer",        roomId, { sdp }));
  socket.on("webrtc-ice-candidate", ({ roomId, candidate }) => relayToOther("webrtc-ice-candidate", roomId, { candidate }));

  // ── chat-message ───────────────────────────────────────────────────────────
  socket.on("chat-message", ({ roomId, text }: ChatMessagePayload) => {
    const room = rooms.get(roomId);
    if (!room || room.status !== "playing") return;

    const player = room.players.find((p) => p.socketId === socket.id);
    if (!player) return;

    const safe = text.trim().slice(0, 200);
    if (!safe) return;

    io.to(roomId).emit("chat-message", { text: safe, from: player.color });
  });

  // ── disconnect ─────────────────────────────────────────────────────────────
  socket.on("disconnect", () => {
    console.log(`[disconnect] ${socket.id}`);

    for (const [roomId, room] of rooms.entries()) {
      const idx = room.players.findIndex((p) => p.socketId === socket.id);
      if (idx === -1) continue;

      clearClock(room);
      const disconnected = room.players[idx];
      disconnected.connected = false;

      const remaining = room.players.filter((p) => p.socketId !== socket.id);

      if (remaining.length === 0) {
        rooms.delete(roomId);
      } else {
        io.to(roomId).emit("player-disconnected", {
          color: disconnected.color,
          message: `${disconnected.color === "w" ? "White" : "Black"} disconnected.`,
        });
        if (room.status !== "playing") rooms.delete(roomId);
      }
      break;
    }
  });
});

const PORT = process.env.PORT ?? 3001;
httpServer.listen(PORT, () => {
  console.log(`Server listening on http://localhost:${PORT}`);
});
