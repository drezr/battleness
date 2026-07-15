-- CreateTable
CREATE TABLE "RankedSeason" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "status" TEXT NOT NULL DEFAULT 'scheduled',
    "startsAt" DATETIME NOT NULL,
    "endsAt" DATETIME NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "RankedSeasonRating" (
    "seasonId" TEXT NOT NULL,
    "playerId" TEXT NOT NULL,
    "rating" REAL NOT NULL DEFAULT 1500,
    "deviation" REAL NOT NULL DEFAULT 350,
    "volatility" REAL NOT NULL DEFAULT 0.06,
    "placementMatches" INTEGER NOT NULL DEFAULT 0,
    "wins" INTEGER NOT NULL DEFAULT 0,
    "losses" INTEGER NOT NULL DEFAULT 0,
    "draws" INTEGER NOT NULL DEFAULT 0,
    "lastMatchAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,

    PRIMARY KEY ("seasonId", "playerId"),
    CONSTRAINT "RankedSeasonRating_seasonId_fkey" FOREIGN KEY ("seasonId") REFERENCES "RankedSeason" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "RankedSeasonRating_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "Player" ("id") ON DELETE CASCADE ON UPDATE CASCADE
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
