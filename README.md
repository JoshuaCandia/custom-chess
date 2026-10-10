# Custom Chess

Ajedrez online en tiempo real para jugar contra otra persona, con reloj, chat de voz, rating ELO y puzzles de Lichess.

## Qué tiene

- Una persona crea una sala y la otra se une. Los movimientos viajan por Socket.io y el servidor los valida con chess.js antes de reenviarlos, así que no se pueden mandar jugadas ilegales.
- Cada jugador tiene su reloj según el control de tiempo de la partida, y se pierde por tiempo si llega a cero.
- Si alguien se desconecta, el rival recibe el aviso y la partida se puede retomar cuando vuelve.
- Se puede abandonar, ofrecer tablas y aceptarlas o rechazarlas.
- Hay chat de texto y chat de voz. El de voz usa WebRTC, y la señalización (offer, answer y candidatos ICE) pasa por el mismo socket de la partida.
- Al terminar cada partida se recalcula el ELO de los dos jugadores (K = 32, con un piso de 100) y la partida queda guardada con su resultado y el motivo.
- Un script importa puzzles de la base pública de Lichess, los agrupa por dificultad según su rating y guarda los intentos de cada usuario.
- Para entrar hay registro con email y contraseña, con un código de verificación que llega por mail, o login con Google. La sesión se guarda en un JWT dentro de una cookie.
- También tiene perfil, temas para el tablero, sonidos y una versión pensada para mobile.

## Stack

**Cliente:** React, TypeScript, Vite, Tailwind CSS, react-chessboard, chess.js, TanStack Query, Zustand, React Hook Form con Zod, Framer Motion y Socket.io client.

**Servidor:** Node.js, Express, TypeScript, Socket.io, chess.js, Prisma con PostgreSQL, Passport (local y Google OAuth), JWT, bcrypt y Nodemailer.

## Estructura

```
client/          React + Vite
server/
  src/           API REST, sockets, auth, puzzles y usuarios
  prisma/        schema y migraciones
  scripts/       importación de puzzles de Lichess
```

## Cómo correrlo

Necesitás Node.js y una base de PostgreSQL.

1. Instalá las dependencias:

```bash
npm install
npm install --prefix server
npm install --prefix client
```

2. Creá `server/.env` con estas variables:

```
DATABASE_URL=postgresql://usuario:password@localhost:5432/chess
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

3. Corré las migraciones y cargá los puzzles:

```bash
cd server
npx prisma migrate deploy
cd ..
npm run seed:puzzles
```

4. Levantá cliente y servidor juntos:

```bash
npm run dev
```
