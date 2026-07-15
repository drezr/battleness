-- CreateTable
CREATE TABLE "RankedQueueEntry" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "playerId" TEXT NOT NULL,
    "seasonId" TEXT NOT NULL,
    "loadoutId" TEXT,
    "ringItemIdsJson" TEXT NOT NULL,
    "ratingSnapshot" REAL NOT NULL,
    "heroLevelSnapshot" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'waiting',
    "pairingKey" TEXT,
    "opponentPlayerId" TEXT,
    "acceptanceDeadlineAt" DATETIME,
    "acceptedAt" DATETIME,
    "privateMatchId" TEXT,
    "battleRecordId" TEXT,
    "expiresAt" DATETIME NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "RankedQueueEntry_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "Player" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "RankedQueueEntry_seasonId_fkey" FOREIGN KEY ("seasonId") REFERENCES "RankedSeason" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "RankedQueueEntry_loadoutId_fkey" FOREIGN KEY ("loadoutId") REFERENCES "Loadout" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "RankedQueueEntry_privateMatchId_fkey" FOREIGN KEY ("privateMatchId") REFERENCES "PrivateMatch" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "RankedQueueEntry_battleRecordId_fkey" FOREIGN KEY ("battleRecordId") REFERENCES "BattleRecord" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "RankedQueueDiscipline" (
    "playerId" TEXT NOT NULL PRIMARY KEY,
    "missedAcceptances" INTEGER NOT NULL DEFAULT 0,
    "lastMissedAt" DATETIME,
    "lockedUntil" DATETIME,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "RankedQueueDiscipline_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "Player" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "RankedQueueEntry_playerId_status_idx" ON "RankedQueueEntry"("playerId", "status");

-- CreateIndex
CREATE INDEX "RankedQueueEntry_seasonId_status_createdAt_idx" ON "RankedQueueEntry"("seasonId", "status", "createdAt");

-- CreateIndex
CREATE INDEX "RankedQueueEntry_pairingKey_idx" ON "RankedQueueEntry"("pairingKey");

-- CreateIndex
CREATE INDEX "RankedQueueEntry_expiresAt_idx" ON "RankedQueueEntry"("expiresAt");

-- CreateIndex
CREATE INDEX "RankedQueueEntry_acceptanceDeadlineAt_idx" ON "RankedQueueEntry"("acceptanceDeadlineAt");

-- CreateIndex
CREATE INDEX "RankedQueueEntry_privateMatchId_idx" ON "RankedQueueEntry"("privateMatchId");

-- CreateIndex
CREATE INDEX "RankedQueueEntry_battleRecordId_idx" ON "RankedQueueEntry"("battleRecordId");

-- CreateIndex
CREATE INDEX "RankedQueueDiscipline_lockedUntil_idx" ON "RankedQueueDiscipline"("lockedUntil");
