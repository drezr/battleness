-- CreateTable
CREATE TABLE "RankedSeason" (
    "id" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'scheduled',
    "startsAt" TIMESTAMP(3) NOT NULL,
    "endsAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RankedSeason_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RankedSeasonRating" (
    "seasonId" TEXT NOT NULL,
    "playerId" TEXT NOT NULL,
    "rating" DOUBLE PRECISION NOT NULL DEFAULT 1500,
    "deviation" DOUBLE PRECISION NOT NULL DEFAULT 350,
    "volatility" DOUBLE PRECISION NOT NULL DEFAULT 0.06,
    "placementMatches" INTEGER NOT NULL DEFAULT 0,
    "wins" INTEGER NOT NULL DEFAULT 0,
    "losses" INTEGER NOT NULL DEFAULT 0,
    "draws" INTEGER NOT NULL DEFAULT 0,
    "lastMatchAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RankedSeasonRating_pkey" PRIMARY KEY ("seasonId","playerId")
);

-- CreateIndex
CREATE INDEX "RankedSeason_status_startsAt_endsAt_idx" ON "RankedSeason"("status", "startsAt", "endsAt");

-- CreateIndex
CREATE INDEX "RankedSeason_endsAt_idx" ON "RankedSeason"("endsAt");

-- CreateIndex
CREATE INDEX "RankedSeasonRating_seasonId_rating_idx" ON "RankedSeasonRating"("seasonId", "rating");

-- CreateIndex
CREATE INDEX "RankedSeasonRating_playerId_idx" ON "RankedSeasonRating"("playerId");

-- CreateIndex
CREATE INDEX "RankedSeasonRating_lastMatchAt_idx" ON "RankedSeasonRating"("lastMatchAt");

-- AddForeignKey
ALTER TABLE "RankedSeasonRating" ADD CONSTRAINT "RankedSeasonRating_seasonId_fkey" FOREIGN KEY ("seasonId") REFERENCES "RankedSeason"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RankedSeasonRating" ADD CONSTRAINT "RankedSeasonRating_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "Player"("id") ON DELETE CASCADE ON UPDATE CASCADE;
