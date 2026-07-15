-- AlterTable
ALTER TABLE "RankedSeasonRating" ADD COLUMN "version" INTEGER NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE "RankedRatingAdjustment" (
    "id" TEXT NOT NULL,
    "settlementKey" TEXT NOT NULL,
    "seasonId" TEXT NOT NULL,
    "playerId" TEXT NOT NULL,
    "opponentPlayerId" TEXT,
    "battleRecordId" TEXT,
    "reason" TEXT NOT NULL,
    "score" DOUBLE PRECISION,
    "ratingBefore" DOUBLE PRECISION NOT NULL,
    "ratingAfter" DOUBLE PRECISION NOT NULL,
    "deviationBefore" DOUBLE PRECISION NOT NULL,
    "deviationAfter" DOUBLE PRECISION NOT NULL,
    "volatilityBefore" DOUBLE PRECISION NOT NULL,
    "volatilityAfter" DOUBLE PRECISION NOT NULL,
    "placementMatchesBefore" INTEGER NOT NULL,
    "placementMatchesAfter" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RankedRatingAdjustment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "RankedRatingAdjustment_settlementKey_key" ON "RankedRatingAdjustment"("settlementKey");

-- CreateIndex
CREATE UNIQUE INDEX "RankedRatingAdjustment_battleRecordId_playerId_key" ON "RankedRatingAdjustment"("battleRecordId", "playerId");

-- CreateIndex
CREATE INDEX "RankedRatingAdjustment_seasonId_createdAt_idx" ON "RankedRatingAdjustment"("seasonId", "createdAt");

-- CreateIndex
CREATE INDEX "RankedRatingAdjustment_playerId_createdAt_idx" ON "RankedRatingAdjustment"("playerId", "createdAt");

-- CreateIndex
CREATE INDEX "RankedRatingAdjustment_opponentPlayerId_createdAt_idx" ON "RankedRatingAdjustment"("opponentPlayerId", "createdAt");

-- CreateIndex
CREATE INDEX "RankedRatingAdjustment_battleRecordId_idx" ON "RankedRatingAdjustment"("battleRecordId");

-- CreateIndex
CREATE INDEX "RankedRatingAdjustment_reason_idx" ON "RankedRatingAdjustment"("reason");

-- AddForeignKey
ALTER TABLE "RankedRatingAdjustment" ADD CONSTRAINT "RankedRatingAdjustment_seasonId_playerId_fkey" FOREIGN KEY ("seasonId", "playerId") REFERENCES "RankedSeasonRating"("seasonId", "playerId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RankedRatingAdjustment" ADD CONSTRAINT "RankedRatingAdjustment_opponentPlayerId_fkey" FOREIGN KEY ("opponentPlayerId") REFERENCES "Player"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RankedRatingAdjustment" ADD CONSTRAINT "RankedRatingAdjustment_battleRecordId_fkey" FOREIGN KEY ("battleRecordId") REFERENCES "BattleRecord"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
