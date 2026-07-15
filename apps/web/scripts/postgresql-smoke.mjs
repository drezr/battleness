import { randomUUID } from "node:crypto";
import process from "node:process";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const suffix = randomUUID();
const playerId = `postgres-smoke-${suffix}`;
const releaseVersion = `postgres-smoke-${suffix}`;
const rankedSeasonId = `postgres-smoke-season-${suffix}`;
const successorSeasonId = `postgres-smoke-successor-season-${suffix}`;
const rankedRewardGrantId = `postgres-smoke-ranked-reward-${suffix}`;
const rankedBadgeId = `ranked.${rankedSeasonId}.gold.badge`;
const inventoryItemId = `postgres-smoke-item-${suffix}`;
const playerMarketListingId = `postgres-smoke-listing-${suffix}`;

try {
  await prisma.$transaction(async (transaction) => {
    await transaction.contentRelease.create({
      data: {
        version: releaseVersion,
        checksum: suffix.replaceAll("-", ""),
        manifestJson: JSON.stringify({ smoke: true }),
      },
    });
    await transaction.oAuthLoginAttempt.create({
      data: {
        stateHash: `state-${suffix}`,
        provider: "google",
        browserBindingHash: `binding-${suffix}`,
        codeVerifier: `verifier-${suffix}`,
        returnTo: "/",
        expiresAt: new Date(Date.now() + 60_000),
      },
    });
    await transaction.rankedSeason.create({
      data: {
        id: rankedSeasonId,
        status: "active",
        startsAt: new Date(Date.now() - 60_000),
        endsAt: new Date(Date.now() + 60_000),
      },
    });
    await transaction.rankedSeason.create({
      data: {
        id: successorSeasonId,
        previousSeasonId: rankedSeasonId,
        status: "scheduled",
        startsAt: new Date(Date.now() + 60_000),
        endsAt: new Date(Date.now() + 120_000),
      },
    });
    await transaction.player.create({
      data: {
        id: playerId,
        username: "PostgreSQL Smoke Test",
        displayName: "PostgreSQL Smoke Test",
        credits: 100,
        preferences: {
          create: {
            locale: "fr",
            theme: "dark",
            interfaceDensity: "compact",
            masterVolume: 75,
          },
        },
        authIdentities: {
          create: {
            provider: "local",
            providerAccountId: playerId,
          },
        },
        sessions: {
          create: {
            tokenHash: suffix.replaceAll("-", "").padEnd(64, "0"),
            expiresAt: new Date(Date.now() + 60_000),
          },
        },
        materialStock: {
          create: {
            materialId: "aluminium",
            quantity: 2,
            contentVersion: releaseVersion,
          },
        },
        inventoryItems: {
          create: {
            id: inventoryItemId,
            type: "ring",
            definitionId: "emberLoop",
            contentVersion: releaseVersion,
            experience: 0,
            quality: 0,
            socketCount: 1,
          },
        },
        marketTransactions: {
          create: {
            requestId: `postgres-smoke-request-${suffix}`,
            action: "buy",
            resourceType: "material",
            resourceId: "aluminium",
            quantity: 2,
            unitPrice: 10,
            creditsDelta: -20,
            contentVersion: releaseVersion,
          },
        },
        rankedSeasonRatings: {
          create: { seasonId: rankedSeasonId, placementMatches: 5, peakRating: 1_650 },
        },
      },
    });
    await transaction.playerMarketListing.create({
      data: {
        id: playerMarketListingId,
        sellerId: playerId,
        resourceType: "ring",
        definitionId: "emberLoop",
        rarity: "common",
        element: "fire",
        level: 0,
        quality: 0,
        quantity: 1,
        price: 250,
        rootItemId: inventoryItemId,
        itemSnapshotJson: JSON.stringify({
          rootItemId: inventoryItemId,
          itemIds: [inventoryItemId],
        }),
        contentVersion: releaseVersion,
        escrowItems: { create: { inventoryItemId, role: "root" } },
        mutations: {
          create: {
            requestId: `postgres-smoke-player-market-${suffix}`,
            playerId,
            action: "create",
            payloadHash: suffix.replaceAll("-", ""),
          },
        },
      },
    });
    await transaction.rewardGrant.create({
      data: {
        id: rankedRewardGrantId,
        playerId,
        sourceType: "rankedSeason",
        sourceId: rankedSeasonId,
        credits: 1_000,
        contentVersion: releaseVersion,
      },
    });
    await transaction.rankedSeasonReward.create({
      data: {
        seasonId: rankedSeasonId,
        playerId,
        rewardGrantId: rankedRewardGrantId,
        tier: "gold",
        peakRating: 1_650,
        badgeCosmeticId: rankedBadgeId,
        titleCosmeticId: `ranked.${rankedSeasonId}.gold.title`,
      },
    });
    await transaction.playerCosmeticUnlock.create({
      data: {
        playerId,
        cosmeticId: rankedBadgeId,
        type: "badge",
        sourceType: "rankedSeason",
        sourceId: rankedSeasonId,
      },
    });
    const loadout = await transaction.loadout.create({
      data: {
        playerId,
        name: "PostgreSQL Ranked Smoke",
        rings: {
          create: { ringItemId: inventoryItemId, slotIndex: 0 },
        },
      },
    });
    await transaction.rankedQueueEntry.create({
      data: {
        playerId,
        seasonId: rankedSeasonId,
        loadoutId: loadout.id,
        ringItemIdsJson: JSON.stringify([inventoryItemId]),
        ratingSnapshot: 1_500,
        heroLevelSnapshot: 1,
        expiresAt: new Date(Date.now() + 60_000),
      },
    });
    await transaction.rankedQueueDiscipline.create({
      data: { playerId, missedAcceptances: 1, lockedUntil: new Date(Date.now() + 60_000) },
    });

    const player = await transaction.player.findUniqueOrThrow({
      where: { id: playerId },
      include: {
        inventoryItems: true,
        marketTransactions: true,
        playerMarketListingsSold: { include: { escrowItems: true, mutations: true } },
        playerMarketMutations: true,
        materialStock: true,
        preferences: true,
        authIdentities: true,
        sessions: true,
        rankedSeasonRatings: true,
        rankedSeasonRewards: true,
        cosmeticUnlocks: true,
        rankedQueueEntries: true,
        rankedQueueDiscipline: true,
      },
    });

    if (
      player.inventoryItems.length !== 1 ||
      player.marketTransactions.length !== 1 ||
      player.playerMarketListingsSold[0]?.id !== playerMarketListingId ||
      player.playerMarketListingsSold[0]?.escrowItems[0]?.inventoryItemId !== inventoryItemId ||
      player.playerMarketListingsSold[0]?.mutations.length !== 1 ||
      player.playerMarketMutations.length !== 1 ||
      player.materialStock[0]?.quantity !== 2 ||
      player.preferences?.locale !== "fr" ||
      player.authIdentities[0]?.provider !== "local" ||
      player.sessions.length !== 1 ||
      player.rankedSeasonRatings[0]?.rating !== 1_500 ||
      player.rankedSeasonRatings[0]?.peakRating !== 1_650 ||
      player.rankedSeasonRewards[0]?.tier !== "gold" ||
      player.cosmeticUnlocks[0]?.cosmeticId !== rankedBadgeId ||
      player.rankedQueueEntries[0]?.ratingSnapshot !== 1_500 ||
      player.rankedQueueDiscipline?.missedAcceptances !== 1 ||
      (await transaction.rankedSeason.count({
        where: { id: successorSeasonId, previousSeasonId: rankedSeasonId },
      })) !== 1 ||
      (await transaction.oAuthLoginAttempt.count({ where: { provider: "google" } })) !== 1
    ) {
      throw new Error("PostgreSQL persistence smoke test returned an unexpected state.");
    }

    await transaction.playerMarketListing.delete({ where: { id: playerMarketListingId } });
    await transaction.player.delete({ where: { id: playerId } });
    await transaction.rankedSeason.delete({ where: { id: successorSeasonId } });
    await transaction.rankedSeason.delete({ where: { id: rankedSeasonId } });
    await transaction.oAuthLoginAttempt.delete({ where: { stateHash: `state-${suffix}` } });
    await transaction.contentRelease.delete({ where: { version: releaseVersion } });
  });

  process.stdout.write("PostgreSQL migration and transactional persistence smoke test passed.\n");
} finally {
  await prisma.$disconnect();
}
