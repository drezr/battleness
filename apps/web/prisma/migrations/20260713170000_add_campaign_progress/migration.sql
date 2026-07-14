-- AlterTable
ALTER TABLE "BattleRecord" ADD COLUMN "modeReferenceId" TEXT;

-- CreateTable
CREATE TABLE "CampaignProgress" (
    "playerId" TEXT NOT NULL,
    "opponentId" TEXT NOT NULL,
    "victoryCount" INTEGER NOT NULL DEFAULT 0,
    "firstClearedAt" DATETIME,
    "lastVictoryAt" DATETIME,

    PRIMARY KEY ("playerId", "opponentId"),
    CONSTRAINT "CampaignProgress_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "Player" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "CampaignProgress_opponentId_idx" ON "CampaignProgress"("opponentId");

-- CreateIndex
CREATE INDEX "BattleRecord_mode_modeReferenceId_idx" ON "BattleRecord"("mode", "modeReferenceId");
