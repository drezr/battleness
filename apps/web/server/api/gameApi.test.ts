import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { execFileSync } from "node:child_process";
import { PrismaClient } from "@prisma/client";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";

type TestEvent = {
  body?: unknown;
};

type ApiHandler = (event: TestEvent) => Promise<unknown> | unknown;

type TestGlobal = typeof globalThis & {
  createError?: (input: { statusCode: number; statusMessage: string }) => Error;
  defineEventHandler?: <T extends ApiHandler>(handler: T) => T;
  readBody?: <T>(event: TestEvent) => Promise<T>;
};

type PlayerApiResponse = {
  player: { id: string; credits: number };
  materials: { id: string; quantity: number }[];
  inventory: { id: string; type: string; definitionId: string }[];
  recipes: { id: string; canCraft: boolean }[];
};

type CraftApiResponse = {
  crafted: { id: string; type: string; definitionId: string };
  state: PlayerApiResponse;
};

type EquipmentApiResponse = {
  maxEquippedRings: number;
  equippedRings: { id: string; equipped: boolean; slotIndex: number | null }[];
  availableRings: {
    id: string;
    definitionId: string;
    equipped: boolean;
    baseDamage: number;
    baseSpeed: number;
  }[];
  summary: {
    ringCount: number;
    totalSpeed: number;
    totalDamage: number;
  };
};

const projectRoot = fileURLToPath(new URL("../../../..", import.meta.url));
const tempDir = mkdtempSync(join(tmpdir(), "battleness-api-test-"));
const testDatabasePath = join(tempDir, "battleness.test.sqlite").replace(/\\/g, "/");
const testDatabaseUrl = `file:${testDatabasePath}`;

let playerHandler: ApiHandler;
let craftHandler: ApiHandler;
let equipmentGetHandler: ApiHandler;
let equipmentPostHandler: ApiHandler;
let resetHandler: ApiHandler;
let disconnectGameStateClientForTests: () => Promise<void>;
let prisma: PrismaClient;

describe("Nuxt Game App APIs", () => {
  beforeAll(async () => {
    installNuxtHandlerGlobals();
    process.env.BATTLENESS_DATABASE_URL = testDatabaseUrl;
    pushPrismaSchemaToTestDatabase();
    prisma = new PrismaClient({
      datasources: {
        db: { url: testDatabaseUrl },
      },
    });

    const [
      playerModule,
      craftModule,
      equipmentGetModule,
      equipmentPostModule,
      resetModule,
      gameStateModule,
    ] = await Promise.all([
      import("./player.get"),
      import("./forge/craft.post"),
      import("./inventory/equipment.get"),
      import("./inventory/equipment.post"),
      import("./dev/reset.post"),
      import("../utils/gameState"),
    ]);

    playerHandler = playerModule.default;
    craftHandler = craftModule.default;
    equipmentGetHandler = equipmentGetModule.default;
    equipmentPostHandler = equipmentPostModule.default;
    resetHandler = resetModule.default;
    disconnectGameStateClientForTests = gameStateModule.disconnectGameStateClientForTests;
  }, 30_000);

  beforeEach(async () => {
    await resetHandler({});
  });

  afterAll(async () => {
    await prisma?.$disconnect();
    await disconnectGameStateClientForTests?.();
    rmSync(tempDir, { force: true, recursive: true });
  });

  it("returns seeded player state", async () => {
    const response = (await playerHandler({})) as PlayerApiResponse;

    expect(response.player).toMatchObject({ id: "devPlayer", credits: 1000 });
    expect(response.materials).toHaveLength(70);
    expect(response.inventory).toHaveLength(0);
    expect(response.recipes).toHaveLength(48);
    expect(response.recipes.every((recipe) => recipe.canCraft)).toBe(true);
  });

  it("crafts a recipe and persists the crafted item plus consumed materials", async () => {
    const response = (await craftHandler({
      body: { recipeId: "craftRingEmberLoop" },
    })) as CraftApiResponse;

    expect(response.crafted).toMatchObject({
      type: "ring",
      definitionId: "emberLoop",
    });
    expect(response.state.inventory).toHaveLength(1);
    expect(response.state.inventory[0]).toMatchObject({
      type: "ring",
      definitionId: "emberLoop",
    });
    expect(materialQuantity(response.state, "aluminium")).toBe(1);
    expect(materialQuantity(response.state, "iron")).toBe(1);
    expect(materialQuantity(response.state, "sodium")).toBe(1);

    const reloadedState = (await playerHandler({})) as PlayerApiResponse;
    expect(reloadedState.inventory).toHaveLength(1);
    expect(reloadedState.inventory[0]?.id).toBe(response.crafted.id);
  });

  it("rejects an unknown recipe without changing persisted state", async () => {
    await expect(
      craftHandler({ body: { recipeId: "missingRecipe" } }),
    ).rejects.toMatchObject({
      statusCode: 400,
      statusMessage: 'Unknown recipe "missingRecipe".',
    });

    const response = (await playerHandler({})) as PlayerApiResponse;
    expect(response.inventory).toHaveLength(0);
  });

  it("rejects craft requests without a recipe id", async () => {
    await expect(craftHandler({ body: {} })).rejects.toMatchObject({
      statusCode: 400,
      statusMessage: "recipeId is required.",
    });
  });

  it("equips and unequips a crafted ring", async () => {
    const crafted = (await craftHandler({
      body: { recipeId: "craftRingEmberLoop" },
    })) as CraftApiResponse;

    const equipped = (await equipmentPostHandler({
      body: { action: "equip", ringItemId: crafted.crafted.id },
    })) as EquipmentApiResponse;

    expect(equipped.equippedRings).toHaveLength(1);
    expect(equipped.equippedRings[0]).toMatchObject({
      id: crafted.crafted.id,
      equipped: true,
      slotIndex: 0,
    });
    expect(equipped.summary).toMatchObject({
      ringCount: 1,
      totalDamage: 4,
      totalSpeed: 1,
    });

    const reloaded = (await equipmentGetHandler({})) as EquipmentApiResponse;
    expect(reloaded.availableRings[0]).toMatchObject({
      id: crafted.crafted.id,
      equipped: true,
      baseDamage: 4,
      baseSpeed: 1,
    });

    const unequipped = (await equipmentPostHandler({
      body: { action: "unequip", ringItemId: crafted.crafted.id },
    })) as EquipmentApiResponse;

    expect(unequipped.equippedRings).toHaveLength(0);
    expect(unequipped.availableRings[0]).toMatchObject({
      id: crafted.crafted.id,
      equipped: false,
    });
  });

  it("rejects missing and invalid equipment actions", async () => {
    await expect(equipmentPostHandler({ body: {} })).rejects.toMatchObject({
      statusCode: 400,
      statusMessage: "ringItemId is required.",
    });
    await expect(
      equipmentPostHandler({ body: { action: "equip", ringItemId: "missingRing" } }),
    ).rejects.toMatchObject({
      statusCode: 400,
      statusMessage: 'Ring item "missingRing" is not available for this player.',
    });
    await expect(
      equipmentPostHandler({ body: { action: "delete", ringItemId: "missingRing" } }),
    ).rejects.toMatchObject({
      statusCode: 400,
      statusMessage: "action must be equip or unequip.",
    });
  });

  it("enforces the 10-ring equipment limit", async () => {
    const craftedRingIds = Array.from(
      { length: 11 },
      (_, index) => `devPlayer.ring.emberLoop.limit.${index}`,
    );

    await prisma.inventoryItem.createMany({
      data: craftedRingIds.map((id) => ({
        id,
        playerId: "devPlayer",
        type: "ring",
        definitionId: "emberLoop",
        contentVersion: "prototype-5",
        experience: 0,
        quality: 0,
        socketCount: 1,
        socketedGemInstanceIds: "[]",
        equipped: false,
      })),
    });

    for (const ringItemId of craftedRingIds.slice(0, 10)) {
      await equipmentPostHandler({ body: { action: "equip", ringItemId } });
    }

    await expect(
      equipmentPostHandler({ body: { action: "equip", ringItemId: craftedRingIds[10] } }),
    ).rejects.toMatchObject({
      statusCode: 400,
      statusMessage: "A player can equip at most 10 rings.",
    });

    const equipment = (await equipmentGetHandler({})) as EquipmentApiResponse;
    expect(equipment.equippedRings).toHaveLength(10);
  });
});

function installNuxtHandlerGlobals(): void {
  const testGlobal = globalThis as TestGlobal;

  testGlobal.defineEventHandler = <T extends ApiHandler>(handler: T) => handler;
  testGlobal.readBody = async <T>(event: TestEvent) => event.body as T;
  testGlobal.createError = (input) =>
    Object.assign(new Error(input.statusMessage), {
      statusCode: input.statusCode,
      statusMessage: input.statusMessage,
    });
}

function pushPrismaSchemaToTestDatabase(): void {
  const options = {
    cwd: projectRoot,
    env: { ...process.env, BATTLENESS_DATABASE_URL: testDatabaseUrl, RUST_LOG: "info" },
    stdio: "pipe" as const,
  };

  if (process.platform === "win32") {
    execFileSync(
      "cmd.exe",
      [
        "/d",
        "/s",
        "/c",
        "pnpm.cmd --filter @battleness/web exec prisma db push --schema prisma/schema.prisma --skip-generate",
      ],
      options,
    );
    return;
  }

  execFileSync(
    "pnpm",
    [
      "--filter",
      "@battleness/web",
      "exec",
      "prisma",
      "db",
      "push",
      "--schema",
      "prisma/schema.prisma",
      "--skip-generate",
    ],
    options,
  );
}

function materialQuantity(response: PlayerApiResponse, materialId: string): number | undefined {
  return response.materials.find((material) => material.id === materialId)?.quantity;
}
