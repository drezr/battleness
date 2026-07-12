-- AlterTable
ALTER TABLE "InventoryItem" ADD COLUMN "contentVersion" TEXT;

-- CreateTable
CREATE TABLE "RingSocket" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "playerId" TEXT NOT NULL,
    "ringItemId" TEXT NOT NULL,
    "socketIndex" INTEGER NOT NULL,
    "gemItemId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "RingSocket_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "Player" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "RingSocket_ringItemId_fkey" FOREIGN KEY ("ringItemId") REFERENCES "InventoryItem" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "RingSocket_gemItemId_fkey" FOREIGN KEY ("gemItemId") REFERENCES "InventoryItem" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "GemEnchantment" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "playerId" TEXT NOT NULL,
    "gemItemId" TEXT NOT NULL,
    "targetItemId" TEXT NOT NULL,
    "targetType" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "GemEnchantment_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "Player" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "GemEnchantment_gemItemId_fkey" FOREIGN KEY ("gemItemId") REFERENCES "InventoryItem" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "GemEnchantment_targetItemId_fkey" FOREIGN KEY ("targetItemId") REFERENCES "InventoryItem" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "EquippedRing" (
    "playerId" TEXT NOT NULL,
    "ringItemId" TEXT NOT NULL,
    "slotIndex" INTEGER NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

    PRIMARY KEY ("playerId", "ringItemId"),
    CONSTRAINT "EquippedRing_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "Player" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "EquippedRing_ringItemId_fkey" FOREIGN KEY ("ringItemId") REFERENCES "InventoryItem" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Loadout" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "playerId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Loadout_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "Player" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "LoadoutRing" (
    "loadoutId" TEXT NOT NULL,
    "ringItemId" TEXT NOT NULL,
    "slotIndex" INTEGER NOT NULL,

    PRIMARY KEY ("loadoutId", "ringItemId"),
    CONSTRAINT "LoadoutRing_loadoutId_fkey" FOREIGN KEY ("loadoutId") REFERENCES "Loadout" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "LoadoutRing_ringItemId_fkey" FOREIGN KEY ("ringItemId") REFERENCES "InventoryItem" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "RewardGrant" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "playerId" TEXT NOT NULL,
    "sourceType" TEXT NOT NULL,
    "sourceId" TEXT,
    "battleRecordId" TEXT,
    "status" TEXT NOT NULL DEFAULT 'unclaimed',
    "credits" INTEGER NOT NULL DEFAULT 0,
    "heroExperience" INTEGER NOT NULL DEFAULT 0,
    "contentVersion" TEXT,
    "claimedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "RewardGrant_battleRecordId_fkey" FOREIGN KEY ("battleRecordId") REFERENCES "BattleRecord" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "RewardGrant_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "Player" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "RewardGrantMaterial" (
    "rewardGrantId" TEXT NOT NULL,
    "materialId" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,

    PRIMARY KEY ("rewardGrantId", "materialId"),
    CONSTRAINT "RewardGrantMaterial_rewardGrantId_fkey" FOREIGN KEY ("rewardGrantId") REFERENCES "RewardGrant" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "RewardGrantItem" (
    "rewardGrantId" TEXT NOT NULL,
    "inventoryItemId" TEXT NOT NULL,
    "experience" INTEGER NOT NULL DEFAULT 0,

    PRIMARY KEY ("rewardGrantId", "inventoryItemId"),
    CONSTRAINT "RewardGrantItem_rewardGrantId_fkey" FOREIGN KEY ("rewardGrantId") REFERENCES "RewardGrant" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "RewardGrantItem_inventoryItemId_fkey" FOREIGN KEY ("inventoryItemId") REFERENCES "InventoryItem" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "BattleRecord" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "mode" TEXT NOT NULL,
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
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "BattleRecord_playerOneId_fkey" FOREIGN KEY ("playerOneId") REFERENCES "Player" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "BattleRecord_playerTwoId_fkey" FOREIGN KEY ("playerTwoId") REFERENCES "Player" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "BattleRecord_winnerPlayerId_fkey" FOREIGN KEY ("winnerPlayerId") REFERENCES "Player" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Player" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "username" TEXT NOT NULL,
    "experience" INTEGER NOT NULL DEFAULT 0,
    "credits" INTEGER NOT NULL DEFAULT 0,
    "nextItemSequence" INTEGER NOT NULL DEFAULT 1,
    "activeLoadoutId" TEXT,
    CONSTRAINT "Player_activeLoadoutId_fkey" FOREIGN KEY ("activeLoadoutId") REFERENCES "Loadout" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Player" ("credits", "experience", "id", "nextItemSequence", "username") SELECT "credits", "experience", "id", "nextItemSequence", "username" FROM "Player";
DROP TABLE "Player";
ALTER TABLE "new_Player" RENAME TO "Player";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

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
CREATE INDEX "BattleRecord_status_idx" ON "BattleRecord"("status");

-- CreateIndex
CREATE INDEX "BattleRecord_playerOneId_idx" ON "BattleRecord"("playerOneId");

-- CreateIndex
CREATE INDEX "BattleRecord_playerTwoId_idx" ON "BattleRecord"("playerTwoId");

-- CreateIndex
CREATE INDEX "BattleRecord_winnerPlayerId_idx" ON "BattleRecord"("winnerPlayerId");

-- CreateIndex
CREATE INDEX "BattleRecord_contentVersion_idx" ON "BattleRecord"("contentVersion");

-- CreateIndex
CREATE INDEX "InventoryItem_contentVersion_idx" ON "InventoryItem"("contentVersion");
