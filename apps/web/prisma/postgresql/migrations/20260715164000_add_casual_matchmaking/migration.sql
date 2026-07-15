-- AlterTable
ALTER TABLE "PrivateMatch" ADD COLUMN "matchType" TEXT NOT NULL DEFAULT 'private';

-- CreateTable
CREATE TABLE "CasualQueueEntry" (
    "id" TEXT NOT NULL,
    "playerId" TEXT NOT NULL,
    "loadoutId" TEXT,
    "ringItemIdsJson" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'waiting',
    "privateMatchId" TEXT,
    "battleRecordId" TEXT,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CasualQueueEntry_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PrivateMatch_matchType_status_idx" ON "PrivateMatch"("matchType", "status");

-- CreateIndex
CREATE INDEX "CasualQueueEntry_playerId_status_idx" ON "CasualQueueEntry"("playerId", "status");

-- CreateIndex
CREATE INDEX "CasualQueueEntry_status_createdAt_idx" ON "CasualQueueEntry"("status", "createdAt");

-- CreateIndex
CREATE INDEX "CasualQueueEntry_expiresAt_idx" ON "CasualQueueEntry"("expiresAt");

-- CreateIndex
CREATE INDEX "CasualQueueEntry_privateMatchId_idx" ON "CasualQueueEntry"("privateMatchId");

-- CreateIndex
CREATE INDEX "CasualQueueEntry_battleRecordId_idx" ON "CasualQueueEntry"("battleRecordId");

-- AddForeignKey
ALTER TABLE "CasualQueueEntry" ADD CONSTRAINT "CasualQueueEntry_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "Player"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CasualQueueEntry" ADD CONSTRAINT "CasualQueueEntry_loadoutId_fkey" FOREIGN KEY ("loadoutId") REFERENCES "Loadout"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CasualQueueEntry" ADD CONSTRAINT "CasualQueueEntry_privateMatchId_fkey" FOREIGN KEY ("privateMatchId") REFERENCES "PrivateMatch"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CasualQueueEntry" ADD CONSTRAINT "CasualQueueEntry_battleRecordId_fkey" FOREIGN KEY ("battleRecordId") REFERENCES "BattleRecord"("id") ON DELETE SET NULL ON UPDATE CASCADE;
