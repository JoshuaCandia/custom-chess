-- AlterTable
ALTER TABLE "User" ADD COLUMN     "theme" TEXT NOT NULL DEFAULT 'classic';

-- CreateTable
CREATE TABLE "Game" (
    "id" TEXT NOT NULL,
    "roomId" TEXT NOT NULL,
    "whiteId" TEXT,
    "blackId" TEXT,
    "result" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "timeControl" INTEGER,
    "moveCount" INTEGER NOT NULL DEFAULT 0,
    "playedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Game_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "Game" ADD CONSTRAINT "Game_whiteId_fkey" FOREIGN KEY ("whiteId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Game" ADD CONSTRAINT "Game_blackId_fkey" FOREIGN KEY ("blackId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
