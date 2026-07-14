import { randomUUID } from "node:crypto";
import process from "node:process";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const suffix = randomUUID();
const playerId = `postgres-smoke-${suffix}`;
const releaseVersion = `postgres-smoke-${suffix}`;

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
            id: `postgres-smoke-item-${suffix}`,
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
      },
    });

    const player = await transaction.player.findUniqueOrThrow({
      where: { id: playerId },
      include: {
        inventoryItems: true,
        marketTransactions: true,
        materialStock: true,
        preferences: true,
        authIdentities: true,
        sessions: true,
      },
    });

    if (
      player.inventoryItems.length !== 1 ||
      player.marketTransactions.length !== 1 ||
      player.materialStock[0]?.quantity !== 2 ||
      player.preferences?.locale !== "fr" ||
      player.authIdentities[0]?.provider !== "local" ||
      player.sessions.length !== 1 ||
      (await transaction.oAuthLoginAttempt.count({ where: { provider: "google" } })) !== 1
    ) {
      throw new Error("PostgreSQL persistence smoke test returned an unexpected state.");
    }

    await transaction.player.delete({ where: { id: playerId } });
    await transaction.oAuthLoginAttempt.delete({ where: { stateHash: `state-${suffix}` } });
    await transaction.contentRelease.delete({ where: { version: releaseVersion } });
  });

  process.stdout.write("PostgreSQL migration and transactional persistence smoke test passed.\n");
} finally {
  await prisma.$disconnect();
}
