-- CreateTable
CREATE TABLE "PlayerPreferences" (
    "playerId" TEXT NOT NULL PRIMARY KEY,
    "locale" TEXT NOT NULL DEFAULT 'en',
    "theme" TEXT NOT NULL DEFAULT 'system',
    "reducedMotion" BOOLEAN NOT NULL DEFAULT false,
    "interfaceDensity" TEXT NOT NULL DEFAULT 'comfortable',
    "muted" BOOLEAN NOT NULL DEFAULT false,
    "masterVolume" INTEGER NOT NULL DEFAULT 100,
    "musicVolume" INTEGER NOT NULL DEFAULT 70,
    "effectsVolume" INTEGER NOT NULL DEFAULT 80,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "PlayerPreferences_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "Player" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Player" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "username" TEXT NOT NULL,
    "displayName" TEXT,
    "profileVisibility" TEXT NOT NULL DEFAULT 'public',
    "experience" INTEGER NOT NULL DEFAULT 0,
    "credits" INTEGER NOT NULL DEFAULT 0,
    "nextItemSequence" INTEGER NOT NULL DEFAULT 1,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastActiveAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "activeLoadoutId" TEXT,
    CONSTRAINT "Player_activeLoadoutId_fkey" FOREIGN KEY ("activeLoadoutId") REFERENCES "Loadout" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Player" ("activeLoadoutId", "credits", "experience", "id", "nextItemSequence", "username") SELECT "activeLoadoutId", "credits", "experience", "id", "nextItemSequence", "username" FROM "Player";
DROP TABLE "Player";
ALTER TABLE "new_Player" RENAME TO "Player";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
