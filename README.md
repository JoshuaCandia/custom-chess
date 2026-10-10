# Custom Chess

[Leer en español](README.es.md)

Real-time online chess against another person, with clocks, voice chat, ELO rating and Lichess puzzles.

## Features

- One player creates a room and the other joins. Moves go through Socket.io, and the server validates them with chess.js before broadcasting, so illegal moves can't get through.
- Each player has a clock based on the game's time control, and you lose on time if it runs out.
- If someone disconnects, the opponent gets notified and the game can resume when they come back.
- Players can resign, offer a draw, and accept or decline one.
- There's text chat and voice chat. Voice uses WebRTC, and the signaling (offer, answer and ICE candidates) goes through the same game socket.
- When a game ends, both players' ELO is recalculated (K = 32, with a floor of 100) and the game is saved with its result and reason.
- A script imports puzzles from the public Lichess database, groups them by difficulty based on their rating, and tracks each user's attempts.
- You can sign up with email and password, verified with a code sent by email, or sign in with Google. The session is stored as a JWT in a cookie.
- It also has user profiles, board themes, sound effects and a mobile-friendly layout.

## Stack

**Client:** React, TypeScript, Vite, Tailwind CSS, react-chessboard, chess.js, TanStack Query, Zustand, React Hook Form with Zod, Framer Motion and the Socket.io client.

**Server:** Node.js, Express, TypeScript, Socket.io, chess.js, Prisma with PostgreSQL, Passport (local and Google OAuth), JWT, bcrypt and Nodemailer.

## Structure

```
client/          React + Vite
server/
  src/           REST API, sockets, auth, puzzles and users
  prisma/        schema and migrations
  scripts/       Lichess puzzle import
```

## Running it locally

You need Node.js and a PostgreSQL database.

1. Install the dependencies:

```bash
npm install
npm install --prefix server
npm install --prefix client
```

2. Create `server/.env` with these variables:

```
DATABASE_URL=postgresql://user:password@localhost:5432/chess
JWT_SECRET=
CLIENT_URL=http://localhost:5173
PORT=
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
EMAIL_HOST=
EMAIL_PORT=
EMAIL_USER=
EMAIL_PASS=
EMAIL_FROM=
```

3. Run the migrations and load the puzzles:

```bash
cd server
npx prisma migrate deploy
cd ..
npm run seed:puzzles
```

4. Start the client and the server together:

```bash
npm run dev
```
