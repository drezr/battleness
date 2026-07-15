-- AlterTable
ALTER TABLE "PrivateMatch" ADD COLUMN "openingDuelDeadlineAt" DATETIME;

-- CreateIndex
CREATE INDEX "PrivateMatch_openingDuelDeadlineAt_idx" ON "PrivateMatch"("openingDuelDeadlineAt");
