-- CreateTable
CREATE TABLE "PrivateMatch" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'waiting',
    "battleRecordId" TEXT,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PrivateMatch_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PrivateMatchParticipant" (
    "matchId" TEXT NOT NULL,
    "playerId" TEXT NOT NULL,
    "slot" TEXT NOT NULL,
    "loadoutId" TEXT,
    "ready" BOOLEAN NOT NULL DEFAULT false,
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PrivateMatchParticipant_pkey" PRIMARY KEY ("matchId","playerId")
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
CREATE UNIQUE INDEX "PrivateMatchParticipant_matchId_slot_key" ON "PrivateMatchParticipant"("matchId", "slot");

-- CreateIndex
CREATE INDEX "PrivateMatchParticipant_playerId_idx" ON "PrivateMatchParticipant"("playerId");

-- CreateIndex
CREATE INDEX "PrivateMatchParticipant_loadoutId_idx" ON "PrivateMatchParticipant"("loadoutId");

-- AddForeignKey
ALTER TABLE "PrivateMatch" ADD CONSTRAINT "PrivateMatch_battleRecordId_fkey" FOREIGN KEY ("battleRecordId") REFERENCES "BattleRecord"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PrivateMatchParticipant" ADD CONSTRAINT "PrivateMatchParticipant_matchId_fkey" FOREIGN KEY ("matchId") REFERENCES "PrivateMatch"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PrivateMatchParticipant" ADD CONSTRAINT "PrivateMatchParticipant_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "Player"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PrivateMatchParticipant" ADD CONSTRAINT "PrivateMatchParticipant_loadoutId_fkey" FOREIGN KEY ("loadoutId") REFERENCES "Loadout"("id") ON DELETE SET NULL ON UPDATE CASCADE;
