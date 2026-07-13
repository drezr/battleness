-- CreateTable
CREATE TABLE "MarketTransaction" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "requestId" TEXT NOT NULL,
    "playerId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "resourceType" TEXT NOT NULL,
    "resourceId" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "unitPrice" INTEGER NOT NULL,
    "creditsDelta" INTEGER NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "MarketTransaction_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "Player" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "MarketTransaction_requestId_key" ON "MarketTransaction"("requestId");

-- CreateIndex
CREATE INDEX "MarketTransaction_playerId_createdAt_idx" ON "MarketTransaction"("playerId", "createdAt");

-- CreateIndex
CREATE INDEX "MarketTransaction_resourceType_resourceId_idx" ON "MarketTransaction"("resourceType", "resourceId");

-- CreateIndex
CREATE INDEX "MarketTransaction_action_idx" ON "MarketTransaction"("action");
