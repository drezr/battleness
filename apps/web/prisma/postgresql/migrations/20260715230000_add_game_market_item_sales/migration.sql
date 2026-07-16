-- AlterTable
ALTER TABLE "MarketTransaction" ADD COLUMN "resourceDefinitionId" TEXT;

-- Backfill existing material transactions.
UPDATE "MarketTransaction"
SET "resourceDefinitionId" = "resourceId"
WHERE "resourceType" = 'material';

-- CreateIndex
CREATE INDEX "MarketTransaction_resourceType_resourceDefinitionId_idx"
ON "MarketTransaction"("resourceType", "resourceDefinitionId");
