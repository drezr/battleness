-- CreateTable
CREATE TABLE "PlayerMarketListing" (
    "id" TEXT NOT NULL,
    "sellerId" TEXT NOT NULL,
    "buyerId" TEXT,
    "status" TEXT NOT NULL DEFAULT 'active',
    "resourceType" TEXT NOT NULL,
    "definitionId" TEXT NOT NULL,
    "rarity" TEXT NOT NULL,
    "element" TEXT,
    "level" INTEGER,
    "quality" INTEGER,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "price" INTEGER NOT NULL,
    "rootItemId" TEXT,
    "itemSnapshotJson" TEXT,
    "contentVersion" TEXT NOT NULL DEFAULT 'legacy-unversioned',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "soldAt" TIMESTAMP(3),
    "cancelledAt" TIMESTAMP(3),

    CONSTRAINT "PlayerMarketListing_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PlayerMarketEscrowItem" (
    "listingId" TEXT NOT NULL,
    "inventoryItemId" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PlayerMarketEscrowItem_pkey" PRIMARY KEY ("listingId","inventoryItemId")
);

-- CreateTable
CREATE TABLE "PlayerMarketMutation" (
    "requestId" TEXT NOT NULL,
    "playerId" TEXT NOT NULL,
    "listingId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "payloadHash" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PlayerMarketMutation_pkey" PRIMARY KEY ("requestId")
);

-- CreateIndex
CREATE INDEX "PlayerMarketListing_sellerId_status_idx" ON "PlayerMarketListing"("sellerId", "status");

-- CreateIndex
CREATE INDEX "PlayerMarketListing_buyerId_soldAt_idx" ON "PlayerMarketListing"("buyerId", "soldAt");

-- CreateIndex
CREATE INDEX "PlayerMarketListing_status_createdAt_idx" ON "PlayerMarketListing"("status", "createdAt");

-- CreateIndex
CREATE INDEX "PlayerMarketListing_status_resourceType_price_idx" ON "PlayerMarketListing"("status", "resourceType", "price");

-- CreateIndex
CREATE INDEX "PlayerMarketListing_status_definitionId_price_idx" ON "PlayerMarketListing"("status", "definitionId", "price");

-- CreateIndex
CREATE INDEX "PlayerMarketListing_status_rarity_price_idx" ON "PlayerMarketListing"("status", "rarity", "price");

-- CreateIndex
CREATE INDEX "PlayerMarketListing_status_element_price_idx" ON "PlayerMarketListing"("status", "element", "price");

-- CreateIndex
CREATE INDEX "PlayerMarketListing_status_level_price_idx" ON "PlayerMarketListing"("status", "level", "price");

-- CreateIndex
CREATE INDEX "PlayerMarketListing_status_quality_price_idx" ON "PlayerMarketListing"("status", "quality", "price");

-- CreateIndex
CREATE INDEX "PlayerMarketListing_rootItemId_idx" ON "PlayerMarketListing"("rootItemId");

-- CreateIndex
CREATE INDEX "PlayerMarketListing_contentVersion_idx" ON "PlayerMarketListing"("contentVersion");

-- CreateIndex
CREATE UNIQUE INDEX "PlayerMarketEscrowItem_inventoryItemId_key" ON "PlayerMarketEscrowItem"("inventoryItemId");

-- CreateIndex
CREATE INDEX "PlayerMarketEscrowItem_listingId_role_idx" ON "PlayerMarketEscrowItem"("listingId", "role");

-- CreateIndex
CREATE INDEX "PlayerMarketMutation_playerId_createdAt_idx" ON "PlayerMarketMutation"("playerId", "createdAt");

-- CreateIndex
CREATE INDEX "PlayerMarketMutation_listingId_action_idx" ON "PlayerMarketMutation"("listingId", "action");

-- AddForeignKey
ALTER TABLE "PlayerMarketListing" ADD CONSTRAINT "PlayerMarketListing_sellerId_fkey" FOREIGN KEY ("sellerId") REFERENCES "Player"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlayerMarketListing" ADD CONSTRAINT "PlayerMarketListing_buyerId_fkey" FOREIGN KEY ("buyerId") REFERENCES "Player"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlayerMarketListing" ADD CONSTRAINT "PlayerMarketListing_rootItemId_fkey" FOREIGN KEY ("rootItemId") REFERENCES "InventoryItem"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlayerMarketEscrowItem" ADD CONSTRAINT "PlayerMarketEscrowItem_listingId_fkey" FOREIGN KEY ("listingId") REFERENCES "PlayerMarketListing"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlayerMarketEscrowItem" ADD CONSTRAINT "PlayerMarketEscrowItem_inventoryItemId_fkey" FOREIGN KEY ("inventoryItemId") REFERENCES "InventoryItem"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlayerMarketMutation" ADD CONSTRAINT "PlayerMarketMutation_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "Player"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlayerMarketMutation" ADD CONSTRAINT "PlayerMarketMutation_listingId_fkey" FOREIGN KEY ("listingId") REFERENCES "PlayerMarketListing"("id") ON DELETE CASCADE ON UPDATE CASCADE;
