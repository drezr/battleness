import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { execFileSync } from "node:child_process";
import { PrismaClient } from "@prisma/client";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";

type TestEvent = {
  body?: unknown;
  context?: {
    params?: Record<string, string>;
  };
};

type ApiHandler = (event: TestEvent) => Promise<unknown> | unknown;

type TestGlobal = typeof globalThis & {
  createError?: (input: { statusCode: number; statusMessage: string }) => Error;
  defineEventHandler?: <T extends ApiHandler>(handler: T) => T;
  getRouterParam?: (event: TestEvent, name: string) => string | undefined;
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
  equippedRings: EquipmentRingResponse[];
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
    totalRingDamage: number;
    totalGemDamage: number;
    totalSpellDamage: number;
    totalMonsterDamage: number;
    totalEnergyPenalty: number;
    totalCooldownPenalty: number;
  };
};

type EquipmentRingResponse = {
  id: string;
  definitionId: string;
  equipped: boolean;
  slotIndex: number | null;
  socketCount: number | null;
  baseDamage: number;
  baseSpeed: number;
  damage: number;
  ringDamage: number;
  gemDamage: number;
  spellDamage: number;
  monsterDamage: number;
  energyCost: number;
  cooldown: number;
  energyPenalty: number;
  cooldownPenalty: number;
  gems: {
    id: string;
    definitionId: string;
    damage: number;
    energyPenalty: number;
    cooldownPenalty: number;
    enchantment: null | {
      id: string;
      type: "spell" | "monster";
      definitionId: string;
      damage: number;
    };
  }[];
};

type SocketRingResponse = EquipmentRingResponse & {
  nextSocketCount: number | null;
  socketImprovementCost: number | null;
  canImproveSockets: boolean;
};

type LoadoutsApiResponse = {
  player: {
    activeLoadoutId: string | null;
  };
  currentEquipment: {
    rings: EquipmentRingResponse[];
  };
  loadouts: {
    id: string;
    name: string;
    active: boolean;
    ringCount: number;
    rings: EquipmentRingResponse[];
  }[];
};

type SocketApiResponse = {
  player: {
    credits: number;
  };
  rings: SocketRingResponse[];
  gems: {
    id: string;
    definitionId: string;
    damage: number;
    socketedRingId: string | null;
    socketIndex: number | null;
    enchantment: null | {
      id: string;
      type: "spell" | "monster";
      definitionId: string;
      damage: number;
    };
  }[];
  enchantmentTargets: {
    id: string;
    type: "spell" | "monster";
    definitionId: string;
    damage: number;
    enchantedGemId: string | null;
  }[];
};

type QualityApiResponse = {
  player: {
    credits: number;
  };
  qualityStep: number;
  items: {
    id: string;
    type: string;
    definitionId: string;
    quality: number;
    nextQuality: number;
    cost: number | null;
    canImprove: boolean;
    stats: {
      label: string;
      current: number;
      next: number;
    }[];
  }[];
};

type GameMarketApiResponse = {
  player: {
    id: string;
    credits: number;
  };
  materials: {
    id: string;
    rarity: string;
    quantity: number;
    buyPrice: number;
    sellPrice: number;
  }[];
  transactions: {
    id: string;
    requestId: string;
    action: "buy" | "sell";
    resourceId: string;
    quantity: number;
    unitPrice: number;
    creditsDelta: number;
    createdAt: string;
  }[];
};

type BattleHistoryApiResponse = {
  player: {
    id: string;
    credits: number;
    experience: number;
    level: number;
  };
  records: {
    id: string;
    mode: string;
    outcome: "win" | "draw" | "loss";
    actionCount: number;
    finalStateChecksum: string | null;
    replayAvailable: boolean;
    reward: null | {
      id: string;
      status: "unclaimed" | "claimed";
      credits: number;
      heroExperience: number;
      claimedAt: string | null;
      materials: { materialId: string; quantity: number }[];
      items: { inventoryItemId: string; experience: number }[];
    };
  }[];
};

type DevelopmentBattleResultApiResponse = {
  recordId: string;
  state: BattleHistoryApiResponse;
};

type LiveBattleApiResponse = {
  id: string;
  mode: string;
  status: "choosingFirstPlayer" | "active" | "finished";
  activePlayerId: string | null;
  actionCount: number;
  viewer: {
    id: string;
    username: string;
    ringCount: number;
    energy: { current: number; maxForTurn: number; turnCount: number };
    rings?: {
      id: string;
      definitionId: string;
      damage: number;
    }[];
  };
  opponent: {
    id: string;
    username: string;
    ringCount: number;
    rings?: unknown[];
  };
  result: null | { type: "draw" } | { type: "winner"; winnerId: string; loserId: string };
};

type LiveBattleActionApiResponse = {
  battle: LiveBattleApiResponse;
  events: { type: string }[];
};

const projectRoot = fileURLToPath(new URL("../../../..", import.meta.url));
const tempDir = mkdtempSync(join(tmpdir(), "battleness-api-test-"));
const testDatabasePath = join(tempDir, "battleness.test.sqlite").replace(/\\/g, "/");
const testDatabaseUrl = `file:${testDatabasePath}`;

let playerHandler: ApiHandler;
let craftHandler: ApiHandler;
let equipmentGetHandler: ApiHandler;
let equipmentPostHandler: ApiHandler;
let loadoutsGetHandler: ApiHandler;
let loadoutsPostHandler: ApiHandler;
let socketGetHandler: ApiHandler;
let socketPostHandler: ApiHandler;
let qualityGetHandler: ApiHandler;
let qualityPostHandler: ApiHandler;
let marketGameGetHandler: ApiHandler;
let marketGamePostHandler: ApiHandler;
let battleHistoryGetHandler: ApiHandler;
let battleStartHandler: ApiHandler;
let battleLiveGetHandler: ApiHandler;
let battleActionHandler: ApiHandler;
let battleRewardClaimHandler: ApiHandler;
let developmentBattleResultHandler: ApiHandler;
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
      loadoutsGetModule,
      loadoutsPostModule,
      socketGetModule,
      socketPostModule,
      qualityGetModule,
      qualityPostModule,
      marketGameGetModule,
      marketGamePostModule,
      battleHistoryGetModule,
      battleStartModule,
      battleLiveGetModule,
      battleActionModule,
      battleRewardClaimModule,
      developmentBattleResultModule,
      resetModule,
      gameStateModule,
    ] = await Promise.all([
      import("./player.get"),
      import("./forge/craft.post"),
      import("./inventory/equipment.get"),
      import("./inventory/equipment.post"),
      import("./inventory/loadouts.get"),
      import("./inventory/loadouts.post"),
      import("./forge/socket.get"),
      import("./forge/socket.post"),
      import("./forge/quality.get"),
      import("./forge/quality.post"),
      import("./market/game.get"),
      import("./market/game.post"),
      import("./battle/history.get"),
      import("./battle/start.post"),
      import("./battle/live/[battleId].get"),
      import("./battle/live/[battleId]/actions.post"),
      import("./battle/rewards/claim.post"),
      import("./dev/battle-result.post"),
      import("./dev/reset.post"),
      import("../utils/gameState"),
    ]);

    playerHandler = playerModule.default;
    craftHandler = craftModule.default;
    equipmentGetHandler = equipmentGetModule.default;
    equipmentPostHandler = equipmentPostModule.default;
    loadoutsGetHandler = loadoutsGetModule.default;
    loadoutsPostHandler = loadoutsPostModule.default;
    socketGetHandler = socketGetModule.default;
    socketPostHandler = socketPostModule.default;
    qualityGetHandler = qualityGetModule.default;
    qualityPostHandler = qualityPostModule.default;
    marketGameGetHandler = marketGameGetModule.default;
    marketGamePostHandler = marketGamePostModule.default;
    battleHistoryGetHandler = battleHistoryGetModule.default;
    battleStartHandler = battleStartModule.default;
    battleLiveGetHandler = battleLiveGetModule.default;
    battleActionHandler = battleActionModule.default;
    battleRewardClaimHandler = battleRewardClaimModule.default;
    developmentBattleResultHandler = developmentBattleResultModule.default;
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

    expect(response.player).toMatchObject({ id: "devPlayer", credits: 1_000_000 });
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
    await expect(craftHandler({ body: { recipeId: "missingRecipe" } })).rejects.toMatchObject({
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

  it("returns resolved equipment metrics with socketed gems and enchantments", async () => {
    await prisma.inventoryItem.createMany({
      data: [
        {
          id: "devPlayer.ring.emberLoop.metrics",
          playerId: "devPlayer",
          type: "ring",
          definitionId: "emberLoop",
          contentVersion: "prototype-5",
          experience: 10_000,
          quality: 40,
          socketCount: 1,
          socketedGemInstanceIds: "[]",
          equipped: false,
        },
        {
          id: "devPlayer.gem.rubyShard.metrics",
          playerId: "devPlayer",
          type: "gem",
          definitionId: "rubyShard",
          contentVersion: "prototype-5",
          experience: 10_000,
          quality: 40,
          socketedGemInstanceIds: "[]",
          equipped: false,
        },
        {
          id: "devPlayer.spell.firebolt.metrics",
          playerId: "devPlayer",
          type: "spell",
          definitionId: "firebolt",
          contentVersion: "prototype-5",
          experience: 10_000,
          quality: 40,
          socketedGemInstanceIds: "[]",
          equipped: false,
        },
      ],
    });
    await prisma.ringSocket.create({
      data: {
        playerId: "devPlayer",
        ringItemId: "devPlayer.ring.emberLoop.metrics",
        socketIndex: 0,
        gemItemId: "devPlayer.gem.rubyShard.metrics",
      },
    });
    await prisma.gemEnchantment.create({
      data: {
        playerId: "devPlayer",
        gemItemId: "devPlayer.gem.rubyShard.metrics",
        targetItemId: "devPlayer.spell.firebolt.metrics",
        targetType: "spell",
      },
    });

    const equipment = (await equipmentPostHandler({
      body: { action: "equip", ringItemId: "devPlayer.ring.emberLoop.metrics" },
    })) as EquipmentApiResponse;
    const ring = equipment.equippedRings[0];

    expect(ring).toMatchObject({
      id: "devPlayer.ring.emberLoop.metrics",
      damage: 12,
      ringDamage: 5,
      gemDamage: 2,
      spellDamage: 5,
      monsterDamage: 0,
      energyCost: 3,
      cooldown: 3,
      energyPenalty: 1,
      cooldownPenalty: 1,
    });
    expect(ring.gems[0]).toMatchObject({
      id: "devPlayer.gem.rubyShard.metrics",
      damage: 2,
      energyPenalty: 1,
      cooldownPenalty: 1,
      enchantment: {
        id: "devPlayer.spell.firebolt.metrics",
        type: "spell",
        damage: 5,
      },
    });
    expect(equipment.summary).toMatchObject({
      totalDamage: 12,
      totalRingDamage: 5,
      totalGemDamage: 2,
      totalSpellDamage: 5,
      totalMonsterDamage: 0,
      totalEnergyPenalty: 1,
      totalCooldownPenalty: 1,
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

  it("saves, activates, and deletes a persisted loadout from equipped rings", async () => {
    const crafted = (await craftHandler({
      body: { recipeId: "craftRingEmberLoop" },
    })) as CraftApiResponse;
    await equipmentPostHandler({
      body: { action: "equip", ringItemId: crafted.crafted.id },
    });

    const saved = (await loadoutsPostHandler({
      body: { action: "saveFromEquipped", name: "Starter Loadout" },
    })) as LoadoutsApiResponse;

    expect(saved.currentEquipment.rings).toHaveLength(1);
    expect(saved.loadouts).toHaveLength(1);
    expect(saved.loadouts[0]).toMatchObject({
      name: "Starter Loadout",
      active: false,
      ringCount: 1,
    });
    expect(saved.loadouts[0].rings[0]).toMatchObject({
      id: crafted.crafted.id,
      damage: 4,
      slotIndex: 0,
    });

    const activated = (await loadoutsPostHandler({
      body: { action: "activate", loadoutId: saved.loadouts[0].id },
    })) as LoadoutsApiResponse;

    expect(activated.player.activeLoadoutId).toBe(saved.loadouts[0].id);
    expect(activated.loadouts[0].active).toBe(true);

    const deleted = (await loadoutsPostHandler({
      body: { action: "delete", loadoutId: saved.loadouts[0].id },
    })) as LoadoutsApiResponse;

    expect(deleted.player.activeLoadoutId).toBeNull();
    expect(deleted.loadouts).toHaveLength(0);

    const reloaded = (await loadoutsGetHandler({})) as LoadoutsApiResponse;
    expect(reloaded.loadouts).toHaveLength(0);
  });

  it("sockets and unsockets a gem in a persisted ring", async () => {
    const ring = (await craftHandler({
      body: { recipeId: "craftRingEmberLoop" },
    })) as CraftApiResponse;
    const gem = (await craftHandler({
      body: { recipeId: "craftGemRubyShard" },
    })) as CraftApiResponse;

    const socketed = (await socketPostHandler({
      body: { action: "socket", ringItemId: ring.crafted.id, gemItemId: gem.crafted.id },
    })) as SocketApiResponse;
    const socketedRing = socketed.rings.find((candidate) => candidate.id === ring.crafted.id);
    const socketedGem = socketed.gems.find((candidate) => candidate.id === gem.crafted.id);

    expect(socketedRing?.gems[0]).toMatchObject({
      id: gem.crafted.id,
      socketIndex: 0,
      damage: 2,
    });
    expect(socketedGem).toMatchObject({
      id: gem.crafted.id,
      socketedRingId: ring.crafted.id,
      socketIndex: 0,
    });
    await expectLegacySocketedGemIds(ring.crafted.id, [gem.crafted.id]);

    const unsocketed = (await socketPostHandler({
      body: { action: "unsocket", gemItemId: gem.crafted.id },
    })) as SocketApiResponse;
    const unsocketedRing = unsocketed.rings.find((candidate) => candidate.id === ring.crafted.id);
    const unsocketedGem = unsocketed.gems.find((candidate) => candidate.id === gem.crafted.id);

    expect(unsocketedRing?.gems).toHaveLength(0);
    expect(unsocketedGem).toMatchObject({
      id: gem.crafted.id,
      socketedRingId: null,
      socketIndex: null,
    });
    await expectLegacySocketedGemIds(ring.crafted.id, []);

    const reloaded = (await socketGetHandler({})) as SocketApiResponse;
    expect(reloaded.rings.find((candidate) => candidate.id === ring.crafted.id)?.gems).toHaveLength(
      0,
    );
  });

  it("rejects socketing one gem into multiple rings", async () => {
    const firstRing = (await craftHandler({
      body: { recipeId: "craftRingEmberLoop" },
    })) as CraftApiResponse;
    const secondRing = (await craftHandler({
      body: { recipeId: "craftRingEmberLoop" },
    })) as CraftApiResponse;
    const gem = (await craftHandler({
      body: { recipeId: "craftGemRubyShard" },
    })) as CraftApiResponse;

    await socketPostHandler({
      body: { action: "socket", ringItemId: firstRing.crafted.id, gemItemId: gem.crafted.id },
    });

    await expect(
      socketPostHandler({
        body: { action: "socket", ringItemId: secondRing.crafted.id, gemItemId: gem.crafted.id },
      }),
    ).rejects.toMatchObject({
      statusCode: 400,
      statusMessage: `Gem item "${gem.crafted.id}" is already socketed.`,
    });
  });

  it("improves persisted ring socket capacity by spending credits", async () => {
    const ring = (await craftHandler({
      body: { recipeId: "craftRingEmberLoop" },
    })) as CraftApiResponse;

    const before = (await socketGetHandler({})) as SocketApiResponse;
    expect(before.rings.find((candidate) => candidate.id === ring.crafted.id)).toMatchObject({
      socketCount: 1,
      nextSocketCount: 2,
      socketImprovementCost: 250,
      canImproveSockets: true,
    });

    const improved = (await socketPostHandler({
      body: { action: "improveSockets", ringItemId: ring.crafted.id },
    })) as SocketApiResponse;
    const improvedRing = improved.rings.find((candidate) => candidate.id === ring.crafted.id);

    expect(improved.player.credits).toBe(999_750);
    expect(improvedRing).toMatchObject({
      socketCount: 2,
      nextSocketCount: 3,
      socketImprovementCost: 375,
      canImproveSockets: true,
    });

    const persisted = await prisma.inventoryItem.findUniqueOrThrow({
      where: { id: ring.crafted.id },
    });
    expect(persisted.socketCount).toBe(2);
  });

  it("rejects ring socket capacity improvement without enough credits", async () => {
    const ring = (await craftHandler({
      body: { recipeId: "craftRingEmberLoop" },
    })) as CraftApiResponse;
    await prisma.player.update({
      where: { id: "devPlayer" },
      data: { credits: 0 },
    });

    await expect(
      socketPostHandler({
        body: { action: "improveSockets", ringItemId: ring.crafted.id },
      }),
    ).rejects.toMatchObject({
      statusCode: 400,
      statusMessage: "Not enough credits.",
    });
  });

  it("rejects ring socket capacity improvement at maximum sockets", async () => {
    const ring = (await craftHandler({
      body: { recipeId: "craftRingEmberLoop" },
    })) as CraftApiResponse;
    await prisma.inventoryItem.update({
      where: { id: ring.crafted.id },
      data: { socketCount: 3 },
    });

    const state = (await socketGetHandler({})) as SocketApiResponse;
    expect(state.rings.find((candidate) => candidate.id === ring.crafted.id)).toMatchObject({
      socketCount: 3,
      nextSocketCount: 3,
      socketImprovementCost: null,
      canImproveSockets: false,
    });

    await expect(
      socketPostHandler({
        body: { action: "improveSockets", ringItemId: ring.crafted.id },
      }),
    ).rejects.toMatchObject({
      statusCode: 400,
      statusMessage: "Ring socket count is already at the maximum.",
    });
  });

  it("rejects ring socket capacity improvement for non-ring items", async () => {
    const gem = (await craftHandler({
      body: { recipeId: "craftGemRubyShard" },
    })) as CraftApiResponse;

    await expect(
      socketPostHandler({
        body: { action: "improveSockets", ringItemId: gem.crafted.id },
      }),
    ).rejects.toMatchObject({
      statusCode: 400,
      statusMessage: `Ring item "${gem.crafted.id}" is not available for this player.`,
    });
  });

  it("enchants and unenchant a gem with a persisted spell", async () => {
    const gem = (await craftHandler({
      body: { recipeId: "craftGemRubyShard" },
    })) as CraftApiResponse;
    const spell = (await craftHandler({
      body: { recipeId: "craftSpellFirebolt" },
    })) as CraftApiResponse;

    const enchanted = (await socketPostHandler({
      body: {
        action: "enchant",
        gemItemId: gem.crafted.id,
        targetItemId: spell.crafted.id,
        targetType: "spell",
      },
    })) as SocketApiResponse;
    const enchantedGem = enchanted.gems.find((candidate) => candidate.id === gem.crafted.id);
    const usedTarget = enchanted.enchantmentTargets.find(
      (candidate) => candidate.id === spell.crafted.id,
    );

    expect(enchantedGem?.enchantment).toMatchObject({
      id: spell.crafted.id,
      type: "spell",
      damage: 4,
    });
    expect(usedTarget).toMatchObject({
      id: spell.crafted.id,
      enchantedGemId: gem.crafted.id,
    });

    const unenchant = (await socketPostHandler({
      body: { action: "unenchant", gemItemId: gem.crafted.id },
    })) as SocketApiResponse;

    expect(
      unenchant.gems.find((candidate) => candidate.id === gem.crafted.id)?.enchantment,
    ).toBeNull();
    expect(
      unenchant.enchantmentTargets.find((candidate) => candidate.id === spell.crafted.id)
        ?.enchantedGemId,
    ).toBeNull();
  });

  it("rejects reusing an enchantment target on multiple gems", async () => {
    const firstGem = (await craftHandler({
      body: { recipeId: "craftGemRubyShard" },
    })) as CraftApiResponse;
    const secondGem = (await craftHandler({
      body: { recipeId: "craftGemSparkPrism" },
    })) as CraftApiResponse;
    const spell = (await craftHandler({
      body: { recipeId: "craftSpellFirebolt" },
    })) as CraftApiResponse;

    await socketPostHandler({
      body: {
        action: "enchant",
        gemItemId: firstGem.crafted.id,
        targetItemId: spell.crafted.id,
        targetType: "spell",
      },
    });

    await expect(
      socketPostHandler({
        body: {
          action: "enchant",
          gemItemId: secondGem.crafted.id,
          targetItemId: spell.crafted.id,
          targetType: "spell",
        },
      }),
    ).rejects.toMatchObject({
      statusCode: 400,
      statusMessage: `Spell item "${spell.crafted.id}" is already used as an enchantment.`,
    });
  });

  it("improves persisted item quality by spending credits", async () => {
    const crafted = (await craftHandler({
      body: { recipeId: "craftRingEmberLoop" },
    })) as CraftApiResponse;

    const before = (await qualityGetHandler({})) as QualityApiResponse;
    expect(before.qualityStep).toBe(5);
    expect(before.items.find((item) => item.id === crafted.crafted.id)).toMatchObject({
      quality: 0,
      nextQuality: 5,
      cost: 25,
      canImprove: true,
    });

    const improved = (await qualityPostHandler({
      body: { action: "improveQuality", itemId: crafted.crafted.id },
    })) as QualityApiResponse;
    const improvedItem = improved.items.find((item) => item.id === crafted.crafted.id);

    expect(improved.player.credits).toBe(999_975);
    expect(improvedItem).toMatchObject({
      quality: 5,
      nextQuality: 10,
      cost: 25,
      canImprove: true,
    });

    const persisted = await prisma.inventoryItem.findUniqueOrThrow({
      where: { id: crafted.crafted.id },
    });
    expect(persisted.quality).toBe(5);
  });

  it("rejects quality improvement without enough credits", async () => {
    const crafted = (await craftHandler({
      body: { recipeId: "craftRingEmberLoop" },
    })) as CraftApiResponse;
    await prisma.player.update({
      where: { id: "devPlayer" },
      data: { credits: 0 },
    });

    await expect(
      qualityPostHandler({
        body: { action: "improveQuality", itemId: crafted.crafted.id },
      }),
    ).rejects.toMatchObject({
      statusCode: 400,
      statusMessage: "Not enough credits.",
    });
  });

  it("rejects quality improvement at maximum quality", async () => {
    const crafted = (await craftHandler({
      body: { recipeId: "craftRingEmberLoop" },
    })) as CraftApiResponse;
    await prisma.inventoryItem.update({
      where: { id: crafted.crafted.id },
      data: { quality: 100 },
    });

    const state = (await qualityGetHandler({})) as QualityApiResponse;
    expect(state.items.find((item) => item.id === crafted.crafted.id)).toMatchObject({
      quality: 100,
      nextQuality: 100,
      cost: null,
      canImprove: false,
    });

    await expect(
      qualityPostHandler({
        body: { action: "improveQuality", itemId: crafted.crafted.id },
      }),
    ).rejects.toMatchObject({
      statusCode: 400,
      statusMessage: "Item quality is already at the maximum.",
    });
  });

  it("returns the fixed game market material catalogue", async () => {
    const response = (await marketGameGetHandler({})) as GameMarketApiResponse;

    expect(response.player).toMatchObject({ id: "devPlayer", credits: 1_000_000 });
    expect(response.materials).toHaveLength(70);
    expect(response.materials.find((material) => material.id === "aluminium")).toMatchObject({
      rarity: "common",
      quantity: 2,
      buyPrice: 10,
      sellPrice: 5,
    });
    expect(response.materials.find((material) => material.rarity === "epic")?.buyPrice).toBe(150);
    expect(response.materials.find((material) => material.rarity === "epic")?.sellPrice).toBe(75);
    expect(response.transactions).toHaveLength(0);
  });

  it("buys game market materials and persists credits plus stock atomically", async () => {
    const response = (await marketGamePostHandler({
      body: {
        action: "buyMaterial",
        materialId: "aluminium",
        quantity: 3,
        requestId: "buy-aluminium-3",
      },
    })) as GameMarketApiResponse;

    expect(response.player.credits).toBe(999_970);
    expect(response.materials.find((material) => material.id === "aluminium")?.quantity).toBe(5);

    const player = await prisma.player.findUniqueOrThrow({ where: { id: "devPlayer" } });
    const stock = await prisma.materialStock.findUniqueOrThrow({
      where: {
        playerId_materialId: { playerId: "devPlayer", materialId: "aluminium" },
      },
    });
    expect(player.credits).toBe(999_970);
    expect(stock.quantity).toBe(5);
    expect(response.transactions[0]).toMatchObject({
      requestId: "buy-aluminium-3",
      action: "buy",
      resourceId: "aluminium",
      quantity: 3,
      unitPrice: 10,
      creditsDelta: -30,
    });
    expect(await prisma.marketTransaction.count()).toBe(1);
  });

  it("rejects market purchases without enough credits and preserves stock", async () => {
    await prisma.player.update({
      where: { id: "devPlayer" },
      data: { credits: 0 },
    });

    await expect(
      marketGamePostHandler({
        body: {
          action: "buyMaterial",
          materialId: "aluminium",
          quantity: 1,
          requestId: "buy-without-credits",
        },
      }),
    ).rejects.toMatchObject({
      statusCode: 400,
      statusMessage: "Not enough credits.",
    });

    const stock = await prisma.materialStock.findUniqueOrThrow({
      where: {
        playerId_materialId: { playerId: "devPlayer", materialId: "aluminium" },
      },
    });
    expect(stock.quantity).toBe(2);
    expect(await prisma.marketTransaction.count()).toBe(0);
  });

  it("rejects market purchases for unknown materials or invalid quantities", async () => {
    await expect(
      marketGamePostHandler({
        body: {
          action: "buyMaterial",
          materialId: "missingMaterial",
          quantity: 1,
          requestId: "buy-missing",
        },
      }),
    ).rejects.toMatchObject({
      statusCode: 400,
      statusMessage: 'Unknown material "missingMaterial".',
    });

    await expect(
      marketGamePostHandler({
        body: {
          action: "buyMaterial",
          materialId: "aluminium",
          quantity: 0,
          requestId: "buy-zero",
        },
      }),
    ).rejects.toMatchObject({
      statusCode: 400,
      statusMessage: "quantity must be an integer between 1 and 999.",
    });
  });

  it("sells material stock and persists earned credits plus history atomically", async () => {
    const response = (await marketGamePostHandler({
      body: {
        action: "sellMaterial",
        materialId: "aluminium",
        quantity: 2,
        requestId: "sell-aluminium-2",
      },
    })) as GameMarketApiResponse;

    expect(response.player.credits).toBe(1_000_010);
    expect(response.materials.find((material) => material.id === "aluminium")?.quantity).toBe(0);
    expect(response.transactions[0]).toMatchObject({
      requestId: "sell-aluminium-2",
      action: "sell",
      resourceId: "aluminium",
      quantity: 2,
      unitPrice: 5,
      creditsDelta: 10,
    });

    const player = await prisma.player.findUniqueOrThrow({ where: { id: "devPlayer" } });
    const stock = await prisma.materialStock.findUniqueOrThrow({
      where: {
        playerId_materialId: { playerId: "devPlayer", materialId: "aluminium" },
      },
    });
    expect(player.credits).toBe(1_000_010);
    expect(stock.quantity).toBe(0);
    expect(await prisma.marketTransaction.count()).toBe(1);
  });

  it("rejects selling more material than the player owns without granting credits", async () => {
    await expect(
      marketGamePostHandler({
        body: {
          action: "sellMaterial",
          materialId: "aluminium",
          quantity: 3,
          requestId: "sell-too-many",
        },
      }),
    ).rejects.toMatchObject({
      statusCode: 400,
      statusMessage: "Not enough material stock.",
    });

    const player = await prisma.player.findUniqueOrThrow({ where: { id: "devPlayer" } });
    const stock = await prisma.materialStock.findUniqueOrThrow({
      where: {
        playerId_materialId: { playerId: "devPlayer", materialId: "aluminium" },
      },
    });
    expect(player.credits).toBe(1_000_000);
    expect(stock.quantity).toBe(2);
    expect(await prisma.marketTransaction.count()).toBe(0);
  });

  it("does not apply the same market request twice", async () => {
    const body = {
      action: "buyMaterial",
      materialId: "aluminium",
      quantity: 1,
      requestId: "idempotent-buy",
    };

    await marketGamePostHandler({ body });
    const response = (await marketGamePostHandler({ body })) as GameMarketApiResponse;

    expect(response.player.credits).toBe(999_990);
    expect(response.materials.find((material) => material.id === "aluminium")?.quantity).toBe(3);
    expect(response.transactions).toHaveLength(1);
    expect(await prisma.marketTransaction.count()).toBe(1);
  });

  it("rejects reusing a market request id for a different transaction", async () => {
    await marketGamePostHandler({
      body: {
        action: "buyMaterial",
        materialId: "aluminium",
        quantity: 1,
        requestId: "conflicting-request",
      },
    });

    await expect(
      marketGamePostHandler({
        body: {
          action: "sellMaterial",
          materialId: "aluminium",
          quantity: 1,
          requestId: "conflicting-request",
        },
      }),
    ).rejects.toMatchObject({
      statusCode: 400,
      statusMessage: "requestId was already used for a different market transaction.",
    });

    const response = (await marketGameGetHandler({})) as GameMarketApiResponse;
    expect(response.player.credits).toBe(999_990);
    expect(response.materials.find((material) => material.id === "aluminium")?.quantity).toBe(3);
    expect(response.transactions).toHaveLength(1);
  });

  it("requires an active loadout before starting a live training battle", async () => {
    await expect(
      battleStartHandler({ body: { requestId: "live-battle-without-loadout" } }),
    ).rejects.toMatchObject({
      statusCode: 400,
      statusMessage: "An active loadout with at least one ring is required.",
    });

    expect(await prisma.battleRecord.count()).toBe(0);
  });

  it("starts and reloads a persistent live battle from the active database loadout", async () => {
    const { ringItemId } = await createAndActivateRingLoadout();
    const requestId = "live-training-battle";
    const started = (await battleStartHandler({
      body: { requestId },
    })) as LiveBattleApiResponse;

    expect(started).toMatchObject({
      id: requestId,
      mode: "training",
      status: "active",
      activePlayerId: "devPlayer",
      actionCount: 1,
      viewer: {
        id: "devPlayer",
        ringCount: 1,
      },
      opponent: {
        id: "playerTwo",
        ringCount: 2,
      },
    });
    expect(started.viewer.rings?.[0]).toMatchObject({
      id: ringItemId,
      definitionId: "emberLoop",
      damage: 4,
    });
    expect(started.opponent.rings).toBeUndefined();
    expect(JSON.stringify(started)).not.toContain("frostSeal");
    expect(JSON.stringify(started)).not.toContain("ironCircle");

    const persisted = await prisma.battleRecord.findUniqueOrThrow({ where: { id: requestId } });
    const persistedSetup = JSON.parse(persisted.setupJson) as {
      players: { id: string; rings: { id: string }[] }[];
    };
    expect(persisted).toMatchObject({
      status: "active",
      result: "pending",
      playerOneId: "devPlayer",
      playerTwoId: null,
    });
    expect(persistedSetup.players[0]?.rings.map((ring) => ring.id)).toEqual([ringItemId]);

    const reloaded = (await battleLiveGetHandler({
      context: { params: { battleId: requestId } },
    })) as LiveBattleApiResponse;
    expect(reloaded).toEqual(started);

    const history = (await battleHistoryGetHandler({})) as BattleHistoryApiResponse;
    expect(history.records).toHaveLength(0);
  });

  it("submits live actions authoritatively and advances the passive training opponent", async () => {
    await createAndActivateRingLoadout();
    const started = (await battleStartHandler({
      body: { requestId: "live-action-battle" },
    })) as LiveBattleApiResponse;

    expect(started).toMatchObject({
      activePlayerId: "devPlayer",
      actionCount: 1,
      viewer: { energy: { current: 1, turnCount: 1 } },
    });

    const response = (await battleActionHandler({
      context: { params: { battleId: started.id } },
      body: {
        expectedActionCount: started.actionCount,
        action: { type: "endTurn", playerId: "playerTwo" },
      },
    })) as LiveBattleActionApiResponse;

    expect(response.battle).toMatchObject({
      status: "active",
      activePlayerId: "devPlayer",
      actionCount: 3,
      viewer: { energy: { current: 2, maxForTurn: 2, turnCount: 2 } },
    });
    expect(response.events.map((event) => event.type)).toEqual([
      "turnEnded",
      "turnStarted",
      "turnEnded",
      "turnStarted",
    ]);

    const ringAction = (await battleActionHandler({
      context: { params: { battleId: started.id } },
      body: {
        expectedActionCount: response.battle.actionCount,
        action: {
          type: "useRing",
          ringInstanceId: response.battle.viewer.rings?.[0]?.id,
          targetId: response.battle.opponent.id + ".hero",
        },
      },
    })) as LiveBattleActionApiResponse;
    expect(ringAction.battle).toMatchObject({
      activePlayerId: "devPlayer",
      actionCount: 4,
      viewer: { energy: { current: 0, maxForTurn: 2, turnCount: 2 } },
    });
    expect(ringAction.events.map((event) => event.type)).toEqual([
      "ringUsed",
      "energySpent",
      "damageDealt",
    ]);

    const persisted = await prisma.battleRecord.findUniqueOrThrow({ where: { id: started.id } });
    const actions = JSON.parse(persisted.actionLogJson) as {
      type: string;
      playerId: string;
      ringInstanceId?: string;
    }[];
    expect(actions.slice(0, 3)).toEqual([
      { type: "endTurn", playerId: "playerTwo" },
      { type: "endTurn", playerId: "devPlayer" },
      { type: "endTurn", playerId: "playerTwo" },
    ]);
    expect(actions[3]).toMatchObject({
      type: "useRing",
      playerId: "devPlayer",
      ringInstanceId: response.battle.viewer.rings?.[0]?.id,
    });
  });

  it("rejects stale and invalid live battle actions without mutating the journal", async () => {
    const { ringItemId } = await createAndActivateRingLoadout();
    const started = (await battleStartHandler({
      body: { requestId: "rejected-live-actions" },
    })) as LiveBattleApiResponse;

    await expect(
      battleActionHandler({
        context: { params: { battleId: started.id } },
        body: {
          expectedActionCount: started.actionCount - 1,
          action: { type: "endTurn" },
        },
      }),
    ).rejects.toMatchObject({
      statusCode: 400,
      statusMessage: "Battle state is stale. Reload the latest state before acting.",
    });

    await expect(
      battleActionHandler({
        context: { params: { battleId: started.id } },
        body: {
          expectedActionCount: started.actionCount,
          action: {
            type: "useRing",
            ringInstanceId: `${ringItemId}-forged`,
            targetId: started.opponent.id + ".hero",
          },
        },
      }),
    ).rejects.toMatchObject({
      statusCode: 400,
      statusMessage: expect.stringContaining("was not found for player devPlayer"),
    });

    const persisted = await prisma.battleRecord.findUniqueOrThrow({ where: { id: started.id } });
    expect(JSON.parse(persisted.actionLogJson)).toHaveLength(started.actionCount);
  });

  it("persists a finished and replayable live battle after the viewer concedes", async () => {
    await createAndActivateRingLoadout();
    const started = (await battleStartHandler({
      body: { requestId: "conceded-live-battle" },
    })) as LiveBattleApiResponse;
    const response = (await battleActionHandler({
      context: { params: { battleId: started.id } },
      body: {
        expectedActionCount: started.actionCount,
        action: { type: "concede" },
      },
    })) as LiveBattleActionApiResponse;

    expect(response.battle).toMatchObject({
      status: "finished",
      actionCount: started.actionCount + 1,
      result: { type: "winner", winnerId: "playerTwo", loserId: "devPlayer" },
    });
    const persisted = await prisma.battleRecord.findUniqueOrThrow({ where: { id: started.id } });
    expect(persisted).toMatchObject({
      status: "finished",
      result: "loss",
      winnerPlayerId: null,
    });
    expect(persisted.finalStateChecksum).toMatch(/^fnv1a32:/);

    const history = (await battleHistoryGetHandler({})) as BattleHistoryApiResponse;
    expect(history.records[0]).toMatchObject({
      id: started.id,
      outcome: "loss",
      replayAvailable: true,
    });
  });

  it("makes live battle creation idempotent and protects player ownership", async () => {
    await createAndActivateRingLoadout();
    const body = { requestId: "idempotent-live-battle" };

    const first = (await battleStartHandler({ body })) as LiveBattleApiResponse;
    const repeated = (await battleStartHandler({ body })) as LiveBattleApiResponse;

    expect(repeated).toEqual(first);
    expect(await prisma.battleRecord.count()).toBe(1);
    await expect(
      battleLiveGetHandler({ context: { params: { battleId: "missing-battle" } } }),
    ).rejects.toMatchObject({
      statusCode: 404,
      statusMessage: 'Battle "missing-battle" is not available for this player.',
    });
  });

  it("requires an active loadout before creating a development battle result", async () => {
    await expect(
      developmentBattleResultHandler({
        body: { outcome: "win", requestId: "battle-without-loadout" },
      }),
    ).rejects.toMatchObject({
      statusCode: 400,
      statusMessage: "An active loadout with at least one ring is required.",
    });

    expect(await prisma.battleRecord.count()).toBe(0);
    expect(await prisma.rewardGrant.count()).toBe(0);
  });

  it("persists a verified battle record and an unclaimed deterministic reward", async () => {
    const { ringItemId } = await createAndActivateRingLoadout();

    const response = (await developmentBattleResultHandler({
      body: { outcome: "win", requestId: "verified-development-win" },
    })) as DevelopmentBattleResultApiResponse;
    const historyRecord = response.state.records[0];

    expect(response.recordId).toBe("verified-development-win");
    expect(historyRecord).toMatchObject({
      id: "verified-development-win",
      mode: "development",
      outcome: "win",
      actionCount: 1,
      replayAvailable: true,
      reward: {
        status: "unclaimed",
        credits: 150,
        heroExperience: 100,
        claimedAt: null,
        materials: expect.arrayContaining([
          expect.objectContaining({ materialId: "aluminium", quantity: 1 }),
          expect.objectContaining({ materialId: "hydrogen", quantity: 1 }),
          expect.objectContaining({ materialId: "pearl", quantity: 1 }),
          expect.objectContaining({ materialId: "sand", quantity: 1 }),
        ]),
        items: [{ inventoryItemId: ringItemId, experience: 8 }],
      },
    });
    expect(historyRecord?.finalStateChecksum).toMatch(/^fnv1a32:/);

    const record = await prisma.battleRecord.findUniqueOrThrow({
      where: { id: "verified-development-win" },
    });
    expect(JSON.parse(record.actionLogJson)).toEqual([
      expect.objectContaining({ type: "concede", playerId: "playerTwo" }),
    ]);
    expect(JSON.parse(record.resultJson ?? "null")).toMatchObject({ winnerId: "playerOne" });
    expect(await prisma.rewardGrant.count()).toBe(1);
  });

  it("claims a battle reward exactly once and persists every progression currency", async () => {
    const { ringItemId } = await createAndActivateRingLoadout();
    const created = (await developmentBattleResultHandler({
      body: { outcome: "win", requestId: "claimable-development-win" },
    })) as DevelopmentBattleResultApiResponse;
    const rewardId = created.state.records[0]?.reward?.id;
    expect(rewardId).toBeTruthy();

    const playerBefore = await prisma.player.findUniqueOrThrow({ where: { id: "devPlayer" } });
    const ringBefore = await prisma.inventoryItem.findUniqueOrThrow({ where: { id: ringItemId } });
    const aluminiumBefore = await materialStockQuantity("aluminium");
    const hydrogenBefore = await materialStockQuantity("hydrogen");

    const claimed = (await battleRewardClaimHandler({
      body: { rewardGrantId: rewardId },
    })) as BattleHistoryApiResponse;

    expect(claimed.player).toMatchObject({
      credits: playerBefore.credits + 150,
      experience: playerBefore.experience + 100,
      level: 1,
    });
    expect(claimed.records[0]?.reward).toMatchObject({ status: "claimed" });
    expect(claimed.records[0]?.reward?.claimedAt).not.toBeNull();

    const ringAfterFirstClaim = await prisma.inventoryItem.findUniqueOrThrow({
      where: { id: ringItemId },
    });
    expect(ringAfterFirstClaim.experience).toBe(ringBefore.experience + 8);
    expect(await materialStockQuantity("aluminium")).toBe(aluminiumBefore + 1);
    expect(await materialStockQuantity("hydrogen")).toBe(hydrogenBefore + 1);

    await battleRewardClaimHandler({ body: { rewardGrantId: rewardId } });

    const playerAfterSecondClaim = await prisma.player.findUniqueOrThrow({
      where: { id: "devPlayer" },
    });
    const ringAfterSecondClaim = await prisma.inventoryItem.findUniqueOrThrow({
      where: { id: ringItemId },
    });
    expect(playerAfterSecondClaim.credits).toBe(playerBefore.credits + 150);
    expect(playerAfterSecondClaim.experience).toBe(playerBefore.experience + 100);
    expect(ringAfterSecondClaim.experience).toBe(ringBefore.experience + 8);
    expect(await materialStockQuantity("aluminium")).toBe(aluminiumBefore + 1);
  });

  it("creates the reduced loss reward without material drops", async () => {
    await createAndActivateRingLoadout();

    const response = (await developmentBattleResultHandler({
      body: { outcome: "loss", requestId: "development-loss" },
    })) as DevelopmentBattleResultApiResponse;

    expect(response.state.records[0]).toMatchObject({
      outcome: "loss",
      reward: {
        status: "unclaimed",
        credits: 30,
        heroExperience: 25,
        materials: [],
      },
    });
  });

  it("makes development battle result requests idempotent", async () => {
    await createAndActivateRingLoadout();
    const body = { outcome: "win", requestId: "idempotent-development-result" };

    await developmentBattleResultHandler({ body });
    const repeated = (await developmentBattleResultHandler({
      body,
    })) as DevelopmentBattleResultApiResponse;

    expect(repeated.state.records).toHaveLength(1);
    expect(await prisma.battleRecord.count()).toBe(1);
    expect(await prisma.rewardGrant.count()).toBe(1);

    await expect(
      developmentBattleResultHandler({
        body: { outcome: "loss", requestId: body.requestId },
      }),
    ).rejects.toMatchObject({
      statusCode: 400,
      statusMessage: "requestId was already used for a different battle result.",
    });
  });

  it("rejects claiming a missing battle reward", async () => {
    await expect(
      battleRewardClaimHandler({ body: { rewardGrantId: "missing-reward" } }),
    ).rejects.toMatchObject({
      statusCode: 400,
      statusMessage: 'Reward grant "missing-reward" is not available for this player.',
    });

    const history = (await battleHistoryGetHandler({})) as BattleHistoryApiResponse;
    expect(history.records).toHaveLength(0);
  });
});

function installNuxtHandlerGlobals(): void {
  const testGlobal = globalThis as TestGlobal;

  testGlobal.defineEventHandler = <T extends ApiHandler>(handler: T) => handler;
  testGlobal.getRouterParam = (event, name) => event.context?.params?.[name];
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

async function materialStockQuantity(materialId: string): Promise<number> {
  const stock = await prisma.materialStock.findUniqueOrThrow({
    where: { playerId_materialId: { playerId: "devPlayer", materialId } },
  });
  return stock.quantity;
}

async function createAndActivateRingLoadout(): Promise<{ ringItemId: string; loadoutId: string }> {
  const crafted = (await craftHandler({
    body: { recipeId: "craftRingEmberLoop" },
  })) as CraftApiResponse;
  await equipmentPostHandler({
    body: { action: "equip", ringItemId: crafted.crafted.id },
  });
  const saved = (await loadoutsPostHandler({
    body: { action: "saveFromEquipped", name: "Battle Reward Test" },
  })) as LoadoutsApiResponse;
  const loadoutId = saved.loadouts[0]?.id;
  if (!loadoutId) {
    throw new Error("Expected the test loadout to be created.");
  }
  await loadoutsPostHandler({ body: { action: "activate", loadoutId } });

  return { ringItemId: crafted.crafted.id, loadoutId };
}

async function expectLegacySocketedGemIds(
  ringItemId: string,
  expectedGemIds: string[],
): Promise<void> {
  const ring = await prisma.inventoryItem.findUniqueOrThrow({
    where: { id: ringItemId },
  });

  expect(JSON.parse(ring.socketedGemInstanceIds)).toEqual(expectedGemIds);
}
