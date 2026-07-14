-- AlterTable
ALTER TABLE "PrivateMatch" ADD COLUMN "turnPlayerId" TEXT;
ALTER TABLE "PrivateMatch" ADD COLUMN "turnDeadlineAt" DATETIME;

-- CreateIndex
CREATE INDEX "PrivateMatch_turnDeadlineAt_idx" ON "PrivateMatch"("turnDeadlineAt");
