import { fileURLToPath } from "node:url";
import { Prisma, PrismaClient, type InventoryItem } from "@prisma/client";
import {
  canCraftRecipe,
  contentVersion,
  craftRecipe,
  createMaterialStock,
  definitions,
  locales,
  type CraftableItemType,
  type CraftedItemInstance,
  type MaterialDefinition,
  type MaterialStock,
  type RecipeDefinition,
  type RingDefinition,
} from "@battleness/content";
import { assertValidPlayerGameState } from "./gameStateValidation";

type CraftableDefinition = {
  id: string;
  nameKey: string;
  rarity: string;
  element: string;
};

type MaterialStockRow = {
  materialId: string;
  quantity: number;
};

type PrismaContext = PrismaClient | Prisma.TransactionClient;
type EquipmentRingItem = ReturnType<typeof toEquipmentRingView>;

const DEV_PLAYER_ID = "devPlayer";
const maxEquippedRings = 10;
const defaultDatabaseUrl = `file:${fileURLToPath(
  new URL("../../data/battleness.prisma.sqlite", import.meta.url),
).replace(/\\/g, "/")}`;
const globalForPrisma = globalThis as typeof globalThis & {
  battlenessPrisma?: PrismaClient;
  battlenessPrismaUrl?: string;
};

export type WebPlayerState = Awaited<ReturnType<typeof getPlayerState>>;

export async function getPlayerState() {
  const prisma = usePrisma();

  await seedDevelopmentPlayer(prisma);
  await assertValidPlayerGameState(prisma, DEV_PLAYER_ID);

  const player = await prisma.player.findUniqueOrThrow({
    where: { id: DEV_PLAYER_ID },
    include: {
      inventoryItems: { orderBy: { createdAt: "desc" } },
      materialStock: true,
    },
  });
  const stock = materialStockFromRows(player.materialStock);

  return {
    player: {
      id: player.id,
      username: player.username,
      experience: player.experience,
      credits: player.credits,
    },
    materials: definitions.materials.map((material) => ({
      id: material.id,
      label: label(material.nameKey),
      description: label(material.descriptionKey),
      rarity: material.rarity,
      craftingFamily: material.craftingFamily,
      realWorldType: material.realWorldType,
      chemicalSymbol: material.chemicalSymbol ?? null,
      atomicNumber: material.atomicNumber ?? null,
      quantity: stock[material.id] ?? 0,
    })),
    inventory: player.inventoryItems.map(toInventoryView),
    recipes: definitions.recipes.map((recipe) => toRecipeView(recipe, stock)),
  };
}

export async function craftPlayerRecipe(recipeId: string) {
  const prisma = usePrisma();
  const recipe = definitions.recipes.find((candidate) => candidate.id === recipeId);

  if (!recipe) {
    throw new Error(`Unknown recipe "${recipeId}".`);
  }

  await seedDevelopmentPlayer(prisma);

  const crafted = await prisma.$transaction(async (transaction) => {
    const player = await transaction.player.findUniqueOrThrow({
      where: { id: DEV_PLAYER_ID },
      include: { materialStock: true },
    });
    const stock = materialStockFromRows(player.materialStock);
    const result = craftRecipe({
      recipe,
      ownerId: player.id,
      stock,
      instanceSequence: player.nextItemSequence,
    });

    await saveMaterialStock(transaction, player.id, result.stock);
    await insertCraftedItem(transaction, player.id, result.crafted);
    await transaction.player.update({
      where: { id: player.id },
      data: { nextItemSequence: player.nextItemSequence + 1 },
    });

    return result.crafted;
  });

  return {
    crafted: toCraftedItemView(crafted),
    state: await getPlayerState(),
  };
}

export async function getPlayerEquipmentState() {
  const prisma = usePrisma();

  await seedDevelopmentPlayer(prisma);
  await assertValidPlayerGameState(prisma, DEV_PLAYER_ID);

  const player = await prisma.player.findUniqueOrThrow({
    where: { id: DEV_PLAYER_ID },
    include: {
      equippedRings: {
        include: { ringItem: true },
        orderBy: { slotIndex: "asc" },
      },
      inventoryItems: {
        where: { type: "ring" },
        orderBy: { createdAt: "desc" },
      },
    },
  });
  const equippedRingIds = new Set(player.equippedRings.map((entry) => entry.ringItemId));
  const equippedRings = player.equippedRings.map((entry) =>
    toEquipmentRingView(entry.ringItem, entry.slotIndex, true),
  );
  const availableRings = player.inventoryItems.map((ring) =>
    toEquipmentRingView(ring, player.equippedRings.find((entry) => entry.ringItemId === ring.id)?.slotIndex ?? null, equippedRingIds.has(ring.id)),
  );

  return {
    player: {
      id: player.id,
      username: player.username,
    },
    maxEquippedRings,
    equippedRings,
    availableRings,
    summary: toEquipmentSummary(equippedRings),
  };
}

export async function equipPlayerRing(ringItemId: string) {
  const prisma = usePrisma();

  await seedDevelopmentPlayer(prisma);

  await prisma.$transaction(async (transaction) => {
    const ring = await transaction.inventoryItem.findUnique({
      where: { id: ringItemId },
    });

    if (!ring || ring.playerId !== DEV_PLAYER_ID || ring.type !== "ring") {
      throw new Error(`Ring item "${ringItemId}" is not available for this player.`);
    }

    const existing = await transaction.equippedRing.findUnique({
      where: { ringItemId },
    });

    if (existing) {
      return;
    }

    const equippedRings = await transaction.equippedRing.findMany({
      where: { playerId: DEV_PLAYER_ID },
      select: { slotIndex: true },
      orderBy: { slotIndex: "asc" },
    });

    if (equippedRings.length >= maxEquippedRings) {
      throw new Error(`A player can equip at most ${maxEquippedRings} rings.`);
    }

    const usedSlots = new Set(equippedRings.map((entry) => entry.slotIndex));
    const slotIndex = Array.from({ length: maxEquippedRings }, (_, index) => index).find(
      (candidate) => !usedSlots.has(candidate),
    );

    if (slotIndex === undefined) {
      throw new Error("No equipment slot is available.");
    }

    await transaction.equippedRing.create({
      data: {
        playerId: DEV_PLAYER_ID,
        ringItemId,
        slotIndex,
      },
    });
    await transaction.inventoryItem.update({
      where: { id: ringItemId },
      data: { equipped: true },
    });
  });

  await assertValidPlayerGameState(prisma, DEV_PLAYER_ID);
  return getPlayerEquipmentState();
}

export async function unequipPlayerRing(ringItemId: string) {
  const prisma = usePrisma();

  await seedDevelopmentPlayer(prisma);

  await prisma.$transaction(async (transaction) => {
    const ring = await transaction.inventoryItem.findUnique({
      where: { id: ringItemId },
    });

    if (!ring || ring.playerId !== DEV_PLAYER_ID || ring.type !== "ring") {
      throw new Error(`Ring item "${ringItemId}" is not available for this player.`);
    }

    await transaction.equippedRing.deleteMany({
      where: { playerId: DEV_PLAYER_ID, ringItemId },
    });
    await transaction.inventoryItem.update({
      where: { id: ringItemId },
      data: { equipped: false },
    });
  });

  await assertValidPlayerGameState(prisma, DEV_PLAYER_ID);
  return getPlayerEquipmentState();
}

export async function resetDevelopmentPlayerState() {
  const prisma = usePrisma();

  await prisma.player.deleteMany({ where: { id: DEV_PLAYER_ID } });
  await seedDevelopmentPlayer(prisma);
  return getPlayerState();
}

export async function disconnectGameStateClientForTests(): Promise<void> {
  if (!globalForPrisma.battlenessPrisma) {
    return;
  }

  await globalForPrisma.battlenessPrisma.$disconnect();
  globalForPrisma.battlenessPrisma = undefined;
  globalForPrisma.battlenessPrismaUrl = undefined;
}

function usePrisma(): PrismaClient {
  const databaseUrl = process.env.BATTLENESS_DATABASE_URL ?? defaultDatabaseUrl;

  if (
    globalForPrisma.battlenessPrisma &&
    globalForPrisma.battlenessPrismaUrl === databaseUrl
  ) {
    return globalForPrisma.battlenessPrisma;
  }

  const client = new PrismaClient({
    datasources: {
      db: { url: databaseUrl },
    },
  });

  if (process.env.NODE_ENV !== "production") {
    globalForPrisma.battlenessPrisma = client;
    globalForPrisma.battlenessPrismaUrl = databaseUrl;
  }

  return client;
}

async function seedDevelopmentPlayer(client: PrismaContext): Promise<void> {
  await client.player.upsert({
    where: { id: DEV_PLAYER_ID },
    create: {
      id: DEV_PLAYER_ID,
      username: "Dev Player",
      experience: 0,
      credits: 1000,
      nextItemSequence: 1,
    },
    update: {},
  });

  const existingStockCount = await client.materialStock.count({
    where: { playerId: DEV_PLAYER_ID },
  });

  if (existingStockCount > 0) {
    return;
  }

  await saveMaterialStock(client, DEV_PLAYER_ID, createMaterialStock(definitions.materials, 2));
}

async function saveMaterialStock(
  client: PrismaContext,
  playerId: string,
  stock: MaterialStock,
): Promise<void> {
  await Promise.all(
    definitions.materials.map((material) =>
      client.materialStock.upsert({
        where: { playerId_materialId: { playerId, materialId: material.id } },
        create: {
          playerId,
          materialId: material.id,
          quantity: stock[material.id] ?? 0,
        },
        update: { quantity: stock[material.id] ?? 0 },
      }),
    ),
  );
}

async function insertCraftedItem(
  client: PrismaContext,
  playerId: string,
  crafted: CraftedItemInstance,
): Promise<void> {
  const commonData = {
    id: crafted.item.id,
    playerId,
    type: crafted.type,
    definitionId: crafted.item.definitionId,
    contentVersion,
    experience: crafted.item.experience,
    quality: crafted.item.quality,
  };

  await client.inventoryItem.create({
    data: {
      ...commonData,
      socketCount: crafted.type === "ring" ? crafted.item.socketCount : null,
      socketedGemInstanceIds:
        crafted.type === "ring" ? JSON.stringify(crafted.item.socketedGemInstanceIds) : "[]",
      enchantment:
        crafted.type === "gem" && crafted.item.enchantment
          ? JSON.stringify(crafted.item.enchantment)
          : null,
      equipped: crafted.type === "ring" ? crafted.item.equipped : false,
    },
  });
}

function materialStockFromRows(rows: readonly MaterialStockRow[]): MaterialStock {
  return Object.fromEntries(rows.map((row) => [row.materialId, row.quantity]));
}

function toInventoryView(row: InventoryItem) {
  const type = row.type as CraftableItemType;
  const definition = getCraftableDefinition(type, row.definitionId);

  return {
    id: row.id,
    type,
    definitionId: row.definitionId,
    label: label(definition.nameKey),
    rarity: definition.rarity,
    element: definition.element,
    experience: row.experience,
    quality: row.quality,
    socketCount: row.socketCount,
    equipped: row.equipped,
  };
}

function toEquipmentRingView(row: InventoryItem, slotIndex: number | null, equipped: boolean) {
  const definition = getRingDefinition(row.definitionId);

  return {
    id: row.id,
    definitionId: row.definitionId,
    label: label(definition.nameKey),
    rarity: definition.rarity,
    element: definition.element,
    experience: row.experience,
    quality: row.quality,
    socketCount: row.socketCount,
    equipped,
    slotIndex,
    baseDamage: definition.baseDamage,
    baseEnergyCost: definition.baseEnergyCost,
    baseCooldown: definition.baseCooldown,
    baseSpeed: definition.baseSpeed,
  };
}

function toEquipmentSummary(equippedRings: readonly EquipmentRingItem[]) {
  const totalSpeed = equippedRings.reduce((total, ring) => total + ring.baseSpeed, 0);
  const totalDamage = equippedRings.reduce((total, ring) => total + ring.baseDamage, 0);
  const totalEnergyCost = equippedRings.reduce((total, ring) => total + ring.baseEnergyCost, 0);
  const totalCooldown = equippedRings.reduce((total, ring) => total + ring.baseCooldown, 0);
  const ringCount = equippedRings.length;

  return {
    ringCount,
    totalSpeed,
    totalDamage,
    averageEnergyCost: ringCount === 0 ? 0 : Number((totalEnergyCost / ringCount).toFixed(1)),
    averageCooldown: ringCount === 0 ? 0 : Number((totalCooldown / ringCount).toFixed(1)),
  };
}

function toCraftedItemView(crafted: CraftedItemInstance) {
  const definition = getCraftableDefinition(crafted.type, crafted.item.definitionId);

  return {
    id: crafted.item.id,
    type: crafted.type,
    definitionId: crafted.item.definitionId,
    label: label(definition.nameKey),
    rarity: definition.rarity,
    element: definition.element,
  };
}

function toRecipeView(recipe: RecipeDefinition, stock: MaterialStock) {
  const output = getCraftableDefinition(recipe.outputType, recipe.outputDefinitionId);

  return {
    id: recipe.id,
    outputType: recipe.outputType,
    outputDefinitionId: recipe.outputDefinitionId,
    outputLabel: label(output.nameKey),
    outputRarity: output.rarity,
    outputElement: output.element,
    craftedLevel: recipe.craftedLevel,
    craftedQuality: recipe.craftedQuality,
    canCraft: canCraftRecipe(recipe, stock),
    ingredients: recipe.ingredients.map((ingredient) => {
      const material = getMaterialDefinition(ingredient.materialId);

      return {
        materialId: ingredient.materialId,
        label: label(material.nameKey),
        quantity: ingredient.quantity,
        available: stock[ingredient.materialId] ?? 0,
      };
    }),
  };
}

function getCraftableDefinition(type: CraftableItemType, definitionId: string): CraftableDefinition {
  const collections = {
    ring: definitions.rings,
    gem: definitions.gems,
    monster: definitions.monsters,
    spell: definitions.spells,
  };
  const definition = collections[type].find((candidate) => candidate.id === definitionId);

  if (!definition) {
    throw new Error(`Unknown ${type} definition "${definitionId}".`);
  }

  return definition;
}

function getRingDefinition(definitionId: string): RingDefinition {
  const definition = definitions.rings.find((candidate) => candidate.id === definitionId);

  if (!definition) {
    throw new Error(`Unknown ring definition "${definitionId}".`);
  }

  return definition;
}

function getMaterialDefinition(materialId: string): MaterialDefinition {
  const material = definitions.materials.find((candidate) => candidate.id === materialId);

  if (!material) {
    throw new Error(`Unknown material "${materialId}".`);
  }

  return material;
}

function label(key: string): string {
  return (locales.en as Record<string, string>)[key] ?? key;
}
