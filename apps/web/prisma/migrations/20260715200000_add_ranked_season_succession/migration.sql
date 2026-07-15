-- AlterTable
ALTER TABLE "RankedSeason" ADD COLUMN "previousSeasonId" TEXT REFERENCES "RankedSeason"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- CreateIndex
CREATE UNIQUE INDEX "RankedSeason_previousSeasonId_key" ON "RankedSeason"("previousSeasonId");
