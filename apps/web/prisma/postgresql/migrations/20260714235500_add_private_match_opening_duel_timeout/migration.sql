-- AlterTable
ALTER TABLE "PrivateMatch" ADD COLUMN "openingDuelDeadlineAt" TIMESTAMP(3);

-- CreateIndex
CREATE INDEX "PrivateMatch_openingDuelDeadlineAt_idx" ON "PrivateMatch"("openingDuelDeadlineAt");
