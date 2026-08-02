import { log } from "node:console";
import process from "node:process";
import { URL } from "node:url";
import { PrismaClient } from "@prisma/client";

const confirmationValue = "RESET battleness_staging FOR production-items-v1";
const apply = process.argv.includes("--apply");
const databaseUrl = process.env.BATTLENESS_DATABASE_URL;

if (!apply) {
  log("Dry run: no database was changed.");
  log(
    "The staging gameplay reset preserves Player identity/profile fields, AuthIdentity, PlayerSession, OAuthLoginAttempt, PlayerPreferences, and ContentRelease.",
  );
  log(
    `To apply, provide BATTLENESS_DATABASE_URL, BATTLENESS_STAGING_BACKUP_ID, BATTLENESS_STAGING_RESET_CONFIRMATION="${confirmationValue}", and pass --apply.`,
  );
  process.exit(0);
}

if (!databaseUrl) {
  throw new Error("BATTLENESS_DATABASE_URL is required.");
}

const databaseName = decodeURIComponent(new URL(databaseUrl).pathname.replace(/^\//, ""));
if (databaseName !== "battleness_staging") {
  throw new Error(
    `Refusing to reset database "${databaseName}"; only battleness_staging is allowed.`,
  );
}

if (!process.env.BATTLENESS_STAGING_BACKUP_ID?.trim()) {
  throw new Error("BATTLENESS_STAGING_BACKUP_ID must identify the verified pre-reset backup.");
}

if (process.env.BATTLENESS_STAGING_RESET_CONFIRMATION !== confirmationValue) {
  throw new Error("BATTLENESS_STAGING_RESET_CONFIRMATION does not match the required value.");
}

const prisma = new PrismaClient();

try {
  await prisma.$transaction(async (transaction) => {
    await transaction.player.updateMany({
      data: {
        activeLoadoutId: null,
        experience: 0,
        credits: 0,
        nextItemSequence: 1,
        onboardingVersion: 0,
      },
    });

    await transaction.$executeRawUnsafe(`
      TRUNCATE TABLE
        "CampaignProgress",
        "RankedSeason",
        "RankedSeasonRating",
        "RankedRatingAdjustment",
        "RankedQueueEntry",
        "RankedQueueDiscipline",
        "MarketTransaction",
        "PlayerMarketListing",
        "PlayerMarketEscrowItem",
        "PlayerMarketMutation",
        "MaterialStock",
        "InventoryItem",
        "RingSocket",
        "GemEnchantment",
        "EquippedRing",
        "Loadout",
        "LoadoutRing",
        "RewardGrant",
        "RankedSeasonReward",
        "PlayerCosmeticUnlock",
        "RewardGrantMaterial",
        "RewardGrantItem",
        "BattleRecord",
        "PrivateMatch",
        "CasualQueueEntry",
        "PrivateMatchParticipant"
      RESTART IDENTITY CASCADE
    `);
  });

  log(`Staging gameplay reset complete. Backup: ${process.env.BATTLENESS_STAGING_BACKUP_ID}`);
} finally {
  await prisma.$disconnect();
}
