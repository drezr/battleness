-- AlterTable
ALTER TABLE "RankedSeasonRating" ADD COLUMN "peakRating" DOUBLE PRECISION;

-- CreateTable
CREATE TABLE "RankedSeasonReward" (
    "seasonId" TEXT NOT NULL,
    "playerId" TEXT NOT NULL,
    "rewardGrantId" TEXT NOT NULL,
    "tier" TEXT NOT NULL,
    "peakRating" DOUBLE PRECISION NOT NULL,
    "badgeCosmeticId" TEXT NOT NULL,
    "titleCosmeticId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RankedSeasonReward_pkey" PRIMARY KEY ("seasonId", "playerId")
);

-- CreateTable
CREATE TABLE "PlayerCosmeticUnlock" (
    "playerId" TEXT NOT NULL,
    "cosmeticId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "sourceType" TEXT NOT NULL,
    "sourceId" TEXT NOT NULL,
    "unlockedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PlayerCosmeticUnlock_pkey" PRIMARY KEY ("playerId", "cosmeticId")
);

-- CreateIndex
CREATE UNIQUE INDEX "RankedSeasonReward_rewardGrantId_key" ON "RankedSeasonReward"("rewardGrantId");

-- CreateIndex
CREATE INDEX "RankedSeasonReward_playerId_createdAt_idx" ON "RankedSeasonReward"("playerId", "createdAt");

-- CreateIndex
CREATE INDEX "RankedSeasonReward_tier_idx" ON "RankedSeasonReward"("tier");

-- CreateIndex
CREATE INDEX "PlayerCosmeticUnlock_playerId_type_idx" ON "PlayerCosmeticUnlock"("playerId", "type");

-- CreateIndex
CREATE INDEX "PlayerCosmeticUnlock_sourceType_sourceId_idx" ON "PlayerCosmeticUnlock"("sourceType", "sourceId");

-- AddForeignKey
ALTER TABLE "RankedSeasonReward" ADD CONSTRAINT "RankedSeasonReward_seasonId_fkey" FOREIGN KEY ("seasonId") REFERENCES "RankedSeason"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RankedSeasonReward" ADD CONSTRAINT "RankedSeasonReward_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "Player"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RankedSeasonReward" ADD CONSTRAINT "RankedSeasonReward_rewardGrantId_fkey" FOREIGN KEY ("rewardGrantId") REFERENCES "RewardGrant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlayerCosmeticUnlock" ADD CONSTRAINT "PlayerCosmeticUnlock_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "Player"("id") ON DELETE CASCADE ON UPDATE CASCADE;
