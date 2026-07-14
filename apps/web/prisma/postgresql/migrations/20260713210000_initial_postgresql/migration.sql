-- CreateTable
CREATE TABLE "Player" (
    "id" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "experience" INTEGER NOT NULL DEFAULT 0,
    "credits" INTEGER NOT NULL DEFAULT 0,
    "nextItemSequence" INTEGER NOT NULL DEFAULT 1,
    "activeLoadoutId" TEXT,

    CONSTRAINT "Player_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CampaignProgress" (
    "playerId" TEXT NOT NULL,
    "opponentId" TEXT NOT NULL,
    "contentVersion" TEXT NOT NULL DEFAULT 'legacy-unversioned',
    "victoryCount" INTEGER NOT NULL DEFAULT 0,
    "firstClearedAt" TIMESTAMP(3),
    "lastVictoryAt" TIMESTAMP(3),

    CONSTRAINT "CampaignProgress_pkey" PRIMARY KEY ("playerId","opponentId")
);

-- CreateTable
CREATE TABLE "ContentRelease" (
    "version" TEXT NOT NULL,
    "checksum" TEXT NOT NULL,
    "manifestJson" TEXT NOT NULL,
    "importedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ContentRelease_pkey" PRIMARY KEY ("version")
);

-- CreateTable
CREATE TABLE "MarketTransaction" (
    "id" TEXT NOT NULL,
    "requestId" TEXT NOT NULL,
    "playerId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "resourceType" TEXT NOT NULL,
    "resourceId" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "unitPrice" INTEGER NOT NULL,
    "creditsDelta" INTEGER NOT NULL,
    "contentVersion" TEXT NOT NULL DEFAULT 'legacy-unversioned',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MarketTransaction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MaterialStock" (
    "playerId" TEXT NOT NULL,
    "materialId" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "contentVersion" TEXT NOT NULL DEFAULT 'legacy-unversioned',

    CONSTRAINT "MaterialStock_pkey" PRIMARY KEY ("playerId","materialId")
);

-- CreateTable
CREATE TABLE "InventoryItem" (
    "id" TEXT NOT NULL,
    "playerId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "definitionId" TEXT NOT NULL,
    "contentVersion" TEXT,
    "experience" INTEGER NOT NULL,
    "quality" INTEGER NOT NULL,
    "socketCount" INTEGER,
    "socketedGemInstanceIds" TEXT NOT NULL DEFAULT '[]',
    "enchantment" TEXT,
    "equipped" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "InventoryItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RingSocket" (
    "id" TEXT NOT NULL,
    "playerId" TEXT NOT NULL,
    "ringItemId" TEXT NOT NULL,
    "socketIndex" INTEGER NOT NULL,
    "gemItemId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RingSocket_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GemEnchantment" (
    "id" TEXT NOT NULL,
    "playerId" TEXT NOT NULL,
    "gemItemId" TEXT NOT NULL,
    "targetItemId" TEXT NOT NULL,
    "targetType" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GemEnchantment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EquippedRing" (
    "playerId" TEXT NOT NULL,
    "ringItemId" TEXT NOT NULL,
    "slotIndex" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EquippedRing_pkey" PRIMARY KEY ("playerId","ringItemId")
);

-- CreateTable
CREATE TABLE "Loadout" (
    "id" TEXT NOT NULL,
    "playerId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Loadout_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LoadoutRing" (
    "loadoutId" TEXT NOT NULL,
    "ringItemId" TEXT NOT NULL,
    "slotIndex" INTEGER NOT NULL,

    CONSTRAINT "LoadoutRing_pkey" PRIMARY KEY ("loadoutId","ringItemId")
);

-- CreateTable
CREATE TABLE "RewardGrant" (
    "id" TEXT NOT NULL,
    "playerId" TEXT NOT NULL,
    "sourceType" TEXT NOT NULL,
    "sourceId" TEXT,
    "battleRecordId" TEXT,
    "status" TEXT NOT NULL DEFAULT 'unclaimed',
    "credits" INTEGER NOT NULL DEFAULT 0,
    "heroExperience" INTEGER NOT NULL DEFAULT 0,
    "contentVersion" TEXT,
    "claimedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RewardGrant_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RewardGrantMaterial" (
    "rewardGrantId" TEXT NOT NULL,
    "materialId" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,

    CONSTRAINT "RewardGrantMaterial_pkey" PRIMARY KEY ("rewardGrantId","materialId")
);

-- CreateTable
CREATE TABLE "RewardGrantItem" (
    "rewardGrantId" TEXT NOT NULL,
    "inventoryItemId" TEXT NOT NULL,
    "experience" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "RewardGrantItem_pkey" PRIMARY KEY ("rewardGrantId","inventoryItemId")
);

-- CreateTable
CREATE TABLE "BattleRecord" (
    "id" TEXT NOT NULL,
    "mode" TEXT NOT NULL,
    "modeReferenceId" TEXT,
    "status" TEXT NOT NULL DEFAULT 'finished',
    "result" TEXT NOT NULL,
    "playerOneId" TEXT,
    "playerTwoId" TEXT,
    "winnerPlayerId" TEXT,
    "seed" TEXT NOT NULL,
    "rulesVersion" TEXT NOT NULL,
    "contentVersion" TEXT NOT NULL,
    "setupJson" TEXT NOT NULL,
    "actionLogJson" TEXT NOT NULL,
    "resultJson" TEXT,
    "finalStateChecksum" TEXT,
    "turnCount" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BattleRecord_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "CampaignProgress_opponentId_idx" ON "CampaignProgress"("opponentId");

-- CreateIndex
CREATE INDEX "CampaignProgress_contentVersion_idx" ON "CampaignProgress"("contentVersion");

-- CreateIndex
CREATE UNIQUE INDEX "MarketTransaction_requestId_key" ON "MarketTransaction"("requestId");

-- CreateIndex
CREATE INDEX "MarketTransaction_playerId_createdAt_idx" ON "MarketTransaction"("playerId", "createdAt");

-- CreateIndex
CREATE INDEX "MarketTransaction_resourceType_resourceId_idx" ON "MarketTransaction"("resourceType", "resourceId");

-- CreateIndex
CREATE INDEX "MarketTransaction_action_idx" ON "MarketTransaction"("action");

-- CreateIndex
CREATE INDEX "MarketTransaction_contentVersion_idx" ON "MarketTransaction"("contentVersion");

-- CreateIndex
CREATE INDEX "MaterialStock_materialId_idx" ON "MaterialStock"("materialId");

-- CreateIndex
CREATE INDEX "MaterialStock_contentVersion_idx" ON "MaterialStock"("contentVersion");

-- CreateIndex
CREATE INDEX "InventoryItem_playerId_idx" ON "InventoryItem"("playerId");

-- CreateIndex
CREATE INDEX "InventoryItem_type_idx" ON "InventoryItem"("type");

-- CreateIndex
CREATE INDEX "InventoryItem_definitionId_idx" ON "InventoryItem"("definitionId");

-- CreateIndex
CREATE INDEX "InventoryItem_contentVersion_idx" ON "InventoryItem"("contentVersion");

-- CreateIndex
CREATE INDEX "RingSocket_playerId_idx" ON "RingSocket"("playerId");

-- CreateIndex
CREATE INDEX "RingSocket_ringItemId_idx" ON "RingSocket"("ringItemId");

-- CreateIndex
CREATE UNIQUE INDEX "RingSocket_ringItemId_socketIndex_key" ON "RingSocket"("ringItemId", "socketIndex");

-- CreateIndex
CREATE UNIQUE INDEX "RingSocket_gemItemId_key" ON "RingSocket"("gemItemId");

-- CreateIndex
CREATE UNIQUE INDEX "GemEnchantment_gemItemId_key" ON "GemEnchantment"("gemItemId");

-- CreateIndex
CREATE UNIQUE INDEX "GemEnchantment_targetItemId_key" ON "GemEnchantment"("targetItemId");

-- CreateIndex
CREATE INDEX "GemEnchantment_playerId_idx" ON "GemEnchantment"("playerId");

-- CreateIndex
CREATE INDEX "GemEnchantment_targetType_idx" ON "GemEnchantment"("targetType");

-- CreateIndex
CREATE UNIQUE INDEX "EquippedRing_ringItemId_key" ON "EquippedRing"("ringItemId");

-- CreateIndex
CREATE INDEX "EquippedRing_playerId_idx" ON "EquippedRing"("playerId");

-- CreateIndex
CREATE UNIQUE INDEX "EquippedRing_playerId_slotIndex_key" ON "EquippedRing"("playerId", "slotIndex");

-- CreateIndex
CREATE INDEX "Loadout_playerId_idx" ON "Loadout"("playerId");

-- CreateIndex
CREATE UNIQUE INDEX "Loadout_playerId_name_key" ON "Loadout"("playerId", "name");

-- CreateIndex
CREATE INDEX "LoadoutRing_ringItemId_idx" ON "LoadoutRing"("ringItemId");

-- CreateIndex
CREATE UNIQUE INDEX "LoadoutRing_loadoutId_slotIndex_key" ON "LoadoutRing"("loadoutId", "slotIndex");

-- CreateIndex
CREATE INDEX "RewardGrant_playerId_idx" ON "RewardGrant"("playerId");

-- CreateIndex
CREATE INDEX "RewardGrant_sourceType_sourceId_idx" ON "RewardGrant"("sourceType", "sourceId");

-- CreateIndex
CREATE INDEX "RewardGrant_battleRecordId_idx" ON "RewardGrant"("battleRecordId");

-- CreateIndex
CREATE INDEX "RewardGrant_status_idx" ON "RewardGrant"("status");

-- CreateIndex
CREATE INDEX "RewardGrantMaterial_materialId_idx" ON "RewardGrantMaterial"("materialId");

-- CreateIndex
CREATE INDEX "RewardGrantItem_inventoryItemId_idx" ON "RewardGrantItem"("inventoryItemId");

-- CreateIndex
CREATE INDEX "BattleRecord_mode_idx" ON "BattleRecord"("mode");

-- CreateIndex
CREATE INDEX "BattleRecord_mode_modeReferenceId_idx" ON "BattleRecord"("mode", "modeReferenceId");

-- CreateIndex
CREATE INDEX "BattleRecord_status_idx" ON "BattleRecord"("status");

-- CreateIndex
CREATE INDEX "BattleRecord_playerOneId_idx" ON "BattleRecord"("playerOneId");

-- CreateIndex
CREATE INDEX "BattleRecord_playerTwoId_idx" ON "BattleRecord"("playerTwoId");

-- CreateIndex
CREATE INDEX "BattleRecord_winnerPlayerId_idx" ON "BattleRecord"("winnerPlayerId");

-- CreateIndex
CREATE INDEX "BattleRecord_contentVersion_idx" ON "BattleRecord"("contentVersion");

-- AddForeignKey
ALTER TABLE "Player" ADD CONSTRAINT "Player_activeLoadoutId_fkey" FOREIGN KEY ("activeLoadoutId") REFERENCES "Loadout"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CampaignProgress" ADD CONSTRAINT "CampaignProgress_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "Player"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MarketTransaction" ADD CONSTRAINT "MarketTransaction_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "Player"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MaterialStock" ADD CONSTRAINT "MaterialStock_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "Player"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InventoryItem" ADD CONSTRAINT "InventoryItem_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "Player"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RingSocket" ADD CONSTRAINT "RingSocket_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "Player"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RingSocket" ADD CONSTRAINT "RingSocket_ringItemId_fkey" FOREIGN KEY ("ringItemId") REFERENCES "InventoryItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RingSocket" ADD CONSTRAINT "RingSocket_gemItemId_fkey" FOREIGN KEY ("gemItemId") REFERENCES "InventoryItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GemEnchantment" ADD CONSTRAINT "GemEnchantment_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "Player"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GemEnchantment" ADD CONSTRAINT "GemEnchantment_gemItemId_fkey" FOREIGN KEY ("gemItemId") REFERENCES "InventoryItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GemEnchantment" ADD CONSTRAINT "GemEnchantment_targetItemId_fkey" FOREIGN KEY ("targetItemId") REFERENCES "InventoryItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EquippedRing" ADD CONSTRAINT "EquippedRing_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "Player"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EquippedRing" ADD CONSTRAINT "EquippedRing_ringItemId_fkey" FOREIGN KEY ("ringItemId") REFERENCES "InventoryItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Loadout" ADD CONSTRAINT "Loadout_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "Player"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LoadoutRing" ADD CONSTRAINT "LoadoutRing_loadoutId_fkey" FOREIGN KEY ("loadoutId") REFERENCES "Loadout"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LoadoutRing" ADD CONSTRAINT "LoadoutRing_ringItemId_fkey" FOREIGN KEY ("ringItemId") REFERENCES "InventoryItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RewardGrant" ADD CONSTRAINT "RewardGrant_battleRecordId_fkey" FOREIGN KEY ("battleRecordId") REFERENCES "BattleRecord"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RewardGrant" ADD CONSTRAINT "RewardGrant_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "Player"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RewardGrantMaterial" ADD CONSTRAINT "RewardGrantMaterial_rewardGrantId_fkey" FOREIGN KEY ("rewardGrantId") REFERENCES "RewardGrant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RewardGrantItem" ADD CONSTRAINT "RewardGrantItem_rewardGrantId_fkey" FOREIGN KEY ("rewardGrantId") REFERENCES "RewardGrant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RewardGrantItem" ADD CONSTRAINT "RewardGrantItem_inventoryItemId_fkey" FOREIGN KEY ("inventoryItemId") REFERENCES "InventoryItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BattleRecord" ADD CONSTRAINT "BattleRecord_playerOneId_fkey" FOREIGN KEY ("playerOneId") REFERENCES "Player"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BattleRecord" ADD CONSTRAINT "BattleRecord_playerTwoId_fkey" FOREIGN KEY ("playerTwoId") REFERENCES "Player"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BattleRecord" ADD CONSTRAINT "BattleRecord_winnerPlayerId_fkey" FOREIGN KEY ("winnerPlayerId") REFERENCES "Player"("id") ON DELETE SET NULL ON UPDATE CASCADE;
