-- AlterTable
ALTER TABLE "PrivateMatch" ADD COLUMN "turnPlayerId" TEXT;
ALTER TABLE "PrivateMatch" ADD COLUMN "turnDeadlineAt" TIMESTAMP(3);

-- CreateIndex
CREATE INDEX "PrivateMatch_turnDeadlineAt_idx" ON "PrivateMatch"("turnDeadlineAt");
