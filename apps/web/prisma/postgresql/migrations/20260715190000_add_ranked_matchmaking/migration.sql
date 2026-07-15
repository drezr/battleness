-- CreateTable
CREATE TABLE "RankedQueueEntry" (
    "id" TEXT NOT NULL,
    "playerId" TEXT NOT NULL,
    "seasonId" TEXT NOT NULL,
    "loadoutId" TEXT,
    "ringItemIdsJson" TEXT NOT NULL,
    "ratingSnapshot" DOUBLE PRECISION NOT NULL,
    "heroLevelSnapshot" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'waiting',
    "pairingKey" TEXT,
    "opponentPlayerId" TEXT,
    "acceptanceDeadlineAt" TIMESTAMP(3),
    "acceptedAt" TIMESTAMP(3),
    "privateMatchId" TEXT,
    "battleRecordId" TEXT,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RankedQueueEntry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RankedQueueDiscipline" (
    "playerId" TEXT NOT NULL,
    "missedAcceptances" INTEGER NOT NULL DEFAULT 0,
    "lastMissedAt" TIMESTAMP(3),
    "lockedUntil" TIMESTAMP(3),
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RankedQueueDiscipline_pkey" PRIMARY KEY ("playerId")
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

-- AddForeignKey
ALTER TABLE "RankedQueueEntry" ADD CONSTRAINT "RankedQueueEntry_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "Player"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RankedQueueEntry" ADD CONSTRAINT "RankedQueueEntry_seasonId_fkey" FOREIGN KEY ("seasonId") REFERENCES "RankedSeason"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RankedQueueEntry" ADD CONSTRAINT "RankedQueueEntry_loadoutId_fkey" FOREIGN KEY ("loadoutId") REFERENCES "Loadout"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RankedQueueEntry" ADD CONSTRAINT "RankedQueueEntry_privateMatchId_fkey" FOREIGN KEY ("privateMatchId") REFERENCES "PrivateMatch"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RankedQueueEntry" ADD CONSTRAINT "RankedQueueEntry_battleRecordId_fkey" FOREIGN KEY ("battleRecordId") REFERENCES "BattleRecord"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RankedQueueDiscipline" ADD CONSTRAINT "RankedQueueDiscipline_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "Player"("id") ON DELETE CASCADE ON UPDATE CASCADE;
