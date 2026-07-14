-- AlterTable
ALTER TABLE "Player" ADD COLUMN "displayName" TEXT;
ALTER TABLE "Player" ADD COLUMN "profileVisibility" TEXT NOT NULL DEFAULT 'public';
ALTER TABLE "Player" ADD COLUMN "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE "Player" ADD COLUMN "lastActiveAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- CreateTable
CREATE TABLE "PlayerPreferences" (
    "playerId" TEXT NOT NULL,
    "locale" TEXT NOT NULL DEFAULT 'en',
    "theme" TEXT NOT NULL DEFAULT 'system',
    "reducedMotion" BOOLEAN NOT NULL DEFAULT false,
    "interfaceDensity" TEXT NOT NULL DEFAULT 'comfortable',
    "muted" BOOLEAN NOT NULL DEFAULT false,
    "masterVolume" INTEGER NOT NULL DEFAULT 100,
    "musicVolume" INTEGER NOT NULL DEFAULT 70,
    "effectsVolume" INTEGER NOT NULL DEFAULT 80,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PlayerPreferences_pkey" PRIMARY KEY ("playerId")
);

-- AddForeignKey
ALTER TABLE "PlayerPreferences" ADD CONSTRAINT "PlayerPreferences_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "Player"("id") ON DELETE CASCADE ON UPDATE CASCADE;
