-- CreateTable
CREATE TABLE "PrivateMatch" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "code" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'waiting',
    "battleRecordId" TEXT,
    "expiresAt" DATETIME NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "PrivateMatch_battleRecordId_fkey" FOREIGN KEY ("battleRecordId") REFERENCES "BattleRecord" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "PrivateMatchParticipant" (
    "matchId" TEXT NOT NULL,
    "playerId" TEXT NOT NULL,
    "slot" TEXT NOT NULL,
    "loadoutId" TEXT,
    "ready" BOOLEAN NOT NULL DEFAULT false,
    "joinedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,

    PRIMARY KEY ("matchId", "playerId"),
    CONSTRAINT "PrivateMatchParticipant_matchId_fkey" FOREIGN KEY ("matchId") REFERENCES "PrivateMatch" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "PrivateMatchParticipant_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "Player" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "PrivateMatchParticipant_loadoutId_fkey" FOREIGN KEY ("loadoutId") REFERENCES "Loadout" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "PrivateMatch_code_key" ON "PrivateMatch"("code");

-- CreateIndex
CREATE UNIQUE INDEX "PrivateMatch_battleRecordId_key" ON "PrivateMatch"("battleRecordId");

-- CreateIndex
CREATE INDEX "PrivateMatch_status_idx" ON "PrivateMatch"("status");

-- CreateIndex
CREATE INDEX "PrivateMatch_expiresAt_idx" ON "PrivateMatch"("expiresAt");

-- CreateIndex
CREATE INDEX "PrivateMatchParticipant_playerId_idx" ON "PrivateMatchParticipant"("playerId");

-- CreateIndex
CREATE INDEX "PrivateMatchParticipant_loadoutId_idx" ON "PrivateMatchParticipant"("loadoutId");

-- CreateIndex
CREATE UNIQUE INDEX "PrivateMatchParticipant_matchId_slot_key" ON "PrivateMatchParticipant"("matchId", "slot");
