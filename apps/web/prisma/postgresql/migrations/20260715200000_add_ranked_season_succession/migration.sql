-- AlterTable
ALTER TABLE "RankedSeason" ADD COLUMN "previousSeasonId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "RankedSeason_previousSeasonId_key" ON "RankedSeason"("previousSeasonId");

-- AddForeignKey
ALTER TABLE "RankedSeason" ADD CONSTRAINT "RankedSeason_previousSeasonId_fkey" FOREIGN KEY ("previousSeasonId") REFERENCES "RankedSeason"("id") ON DELETE SET NULL ON UPDATE CASCADE;
