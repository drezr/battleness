-- CreateTable
CREATE TABLE "ContentRelease" (
    "version" TEXT NOT NULL PRIMARY KEY,
    "checksum" TEXT NOT NULL,
    "manifestJson" TEXT NOT NULL,
    "importedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Preserve explicit provenance for rows created before content tracking.
INSERT INTO "ContentRelease" ("version", "checksum", "manifestJson")
VALUES ('legacy-unversioned', 'unknown', '{"legacy":true}');

-- AlterTable
ALTER TABLE "CampaignProgress" ADD COLUMN "contentVersion" TEXT NOT NULL DEFAULT 'legacy-unversioned';
ALTER TABLE "MarketTransaction" ADD COLUMN "contentVersion" TEXT NOT NULL DEFAULT 'legacy-unversioned';
ALTER TABLE "MaterialStock" ADD COLUMN "contentVersion" TEXT NOT NULL DEFAULT 'legacy-unversioned';

-- Existing nullable provenance columns predate the release registry.
UPDATE "InventoryItem" SET "contentVersion" = 'legacy-unversioned' WHERE "contentVersion" IS NULL;
UPDATE "RewardGrant" SET "contentVersion" = 'legacy-unversioned' WHERE "contentVersion" IS NULL;

-- CreateIndex
CREATE INDEX "CampaignProgress_contentVersion_idx" ON "CampaignProgress"("contentVersion");
CREATE INDEX "MarketTransaction_contentVersion_idx" ON "MarketTransaction"("contentVersion");
CREATE INDEX "MaterialStock_contentVersion_idx" ON "MaterialStock"("contentVersion");
