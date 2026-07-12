import { Prisma, PrismaClient } from "@prisma/client";
import { definitions } from "@battleness/content";

type PrismaContext = PrismaClient | Prisma.TransactionClient;

type PlayerSnapshot = {
  id: string;
  activeLoadoutId: string | null;
};

type InventoryItemSnapshot = {
  id: string;
  playerId: string;
  type: string;
  definitionId: string;
  experience: number;
  quality: number;
  socketCount: number | null;
  socketedGemInstanceIds: string;
  enchantment: string | null;
  equipped: boolean;
};

type MaterialStockSnapshot = {
  playerId: string;
  materialId: string;
  quantity: number;
};

type RingSocketSnapshot = {
  playerId: string;
  ringItemId: string;
  socketIndex: number;
  gemItemId: string;
};

type GemEnchantmentSnapshot = {
  playerId: string;
  gemItemId: string;
  targetItemId: string;
  targetType: string;
};

type EquippedRingSnapshot = {
  playerId: string;
  ringItemId: string;
  slotIndex: number;
};

type LoadoutSnapshot = {
  id: string;
  playerId: string;
  rings: readonly LoadoutRingSnapshot[];
};

type LoadoutRingSnapshot = {
  loadoutId: string;
  ringItemId: string;
  slotIndex: number;
};

type RewardGrantSnapshot = {
  playerId: string;
  status: string;
  credits: number;
  heroExperience: number;
  materials: readonly RewardGrantMaterialSnapshot[];
  items: readonly RewardGrantItemSnapshot[];
};

type RewardGrantMaterialSnapshot = {
  materialId: string;
  quantity: number;
};

type RewardGrantItemSnapshot = {
  inventoryItemId: string;
  experience: number;
};

export type PlayerGameStateSnapshot = {
  player: PlayerSnapshot;
  inventoryItems: readonly InventoryItemSnapshot[];
  materialStock: readonly MaterialStockSnapshot[];
  ringSockets: readonly RingSocketSnapshot[];
  gemEnchantments: readonly GemEnchantmentSnapshot[];
  equippedRings: readonly EquippedRingSnapshot[];
  loadouts: readonly LoadoutSnapshot[];
  rewardGrants: readonly RewardGrantSnapshot[];
};

const allowedItemTypes = ["ring", "gem", "monster", "spell"] as const;
const allowedRewardStatuses = new Set(["unclaimed", "claimed"]);
const maxEquippedRings = 10;
const maxLoadoutRings = 10;
const maxRingSockets = 3;

export class GameStateValidationError extends Error {
  constructor(public readonly issues: readonly string[]) {
    super(`Invalid player game state: ${issues.join(" ")}`);
    this.name = "GameStateValidationError";
  }
}

export async function assertValidPlayerGameState(
  client: PrismaContext,
  playerId: string,
): Promise<void> {
  const issues = validatePlayerGameStateSnapshot(await loadPlayerGameStateSnapshot(client, playerId));

  if (issues.length > 0) {
    throw new GameStateValidationError(issues);
  }
}

export async function loadPlayerGameStateSnapshot(
  client: PrismaContext,
  playerId: string,
): Promise<PlayerGameStateSnapshot> {
  const player = await client.player.findUniqueOrThrow({
    where: { id: playerId },
    select: { id: true, activeLoadoutId: true },
  });
  const [
    inventoryItems,
    materialStock,
    ringSockets,
    gemEnchantments,
    equippedRings,
    loadouts,
    rewardGrants,
  ] = await Promise.all([
    client.inventoryItem.findMany({ where: { playerId } }),
    client.materialStock.findMany({ where: { playerId } }),
    client.ringSocket.findMany({ where: { playerId } }),
    client.gemEnchantment.findMany({ where: { playerId } }),
    client.equippedRing.findMany({ where: { playerId } }),
    client.loadout.findMany({
      where: { playerId },
      include: { rings: true },
    }),
    client.rewardGrant.findMany({
      where: { playerId },
      include: {
        items: true,
        materials: true,
      },
    }),
  ]);

  return {
    player,
    inventoryItems,
    materialStock,
    ringSockets,
    gemEnchantments,
    equippedRings,
    loadouts,
    rewardGrants,
  };
}

export function validatePlayerGameStateSnapshot(snapshot: PlayerGameStateSnapshot): string[] {
  const issues: string[] = [];
  const inventoryById = new Map(snapshot.inventoryItems.map((item) => [item.id, item]));
  const loadoutsById = new Map(snapshot.loadouts.map((loadout) => [loadout.id, loadout]));

  validateInventoryItems(snapshot, inventoryById, issues);
  validateMaterialStock(snapshot, issues);
  validateRingSockets(snapshot, inventoryById, issues);
  validateGemEnchantments(snapshot, inventoryById, issues);
  validateEquippedRings(snapshot, inventoryById, issues);
  validateLoadouts(snapshot, inventoryById, loadoutsById, issues);
  validateRewards(snapshot, inventoryById, issues);

  return issues;
}

function validateInventoryItems(
  snapshot: PlayerGameStateSnapshot,
  inventoryById: ReadonlyMap<string, InventoryItemSnapshot>,
  issues: string[],
): void {
  const itemDefinitionIds = {
    gem: new Set(definitions.gems.map((definition) => definition.id)),
    monster: new Set(definitions.monsters.map((definition) => definition.id)),
    ring: new Set(definitions.rings.map((definition) => definition.id)),
    spell: new Set(definitions.spells.map((definition) => definition.id)),
  };

  for (const item of snapshot.inventoryItems) {
    if (item.playerId !== snapshot.player.id) {
      issues.push(`Inventory item "${item.id}" is owned by "${item.playerId}".`);
    }
    if (!allowedItemTypes.includes(item.type as (typeof allowedItemTypes)[number])) {
      issues.push(`Inventory item "${item.id}" has invalid type "${item.type}".`);
      continue;
    }

    const itemType = item.type as keyof typeof itemDefinitionIds;
    if (!itemDefinitionIds[itemType].has(item.definitionId)) {
      issues.push(`Inventory item "${item.id}" references unknown ${item.type} definition.`);
    }
    if (!Number.isInteger(item.experience) || item.experience < 0) {
      issues.push(`Inventory item "${item.id}" has invalid experience.`);
    }
    if (!Number.isInteger(item.quality) || item.quality < 0 || item.quality > 100) {
      issues.push(`Inventory item "${item.id}" has invalid quality.`);
    }
    if (item.type === "ring") {
      if (
        item.socketCount === null ||
        !Number.isInteger(item.socketCount) ||
        item.socketCount < 1 ||
        item.socketCount > maxRingSockets
      ) {
        issues.push(`Ring item "${item.id}" has invalid socket count.`);
      }
      validateLegacySocketedGemIds(item, inventoryById, issues);
      continue;
    }
    if (item.socketCount !== null) {
      issues.push(`Non-ring item "${item.id}" must not have socket count.`);
    }
    if (item.equipped) {
      issues.push(`Non-ring item "${item.id}" must not be marked equipped.`);
    }
  }
}

function validateMaterialStock(snapshot: PlayerGameStateSnapshot, issues: string[]): void {
  const materialIds = new Set(definitions.materials.map((material) => material.id));

  for (const stock of snapshot.materialStock) {
    if (stock.playerId !== snapshot.player.id) {
      issues.push(`Material stock "${stock.materialId}" is owned by "${stock.playerId}".`);
    }
    if (!materialIds.has(stock.materialId)) {
      issues.push(`Material stock references unknown material "${stock.materialId}".`);
    }
    if (!Number.isInteger(stock.quantity) || stock.quantity < 0) {
      issues.push(`Material stock "${stock.materialId}" has invalid quantity.`);
    }
  }
}

function validateRingSockets(
  snapshot: PlayerGameStateSnapshot,
  inventoryById: ReadonlyMap<string, InventoryItemSnapshot>,
  issues: string[],
): void {
  const gemsByRingId = new Map<string, number>();
  const usedGemIds = new Set<string>();

  for (const socket of snapshot.ringSockets) {
    if (socket.playerId !== snapshot.player.id) {
      issues.push(`Ring socket for ring "${socket.ringItemId}" is owned by "${socket.playerId}".`);
    }

    const ring = inventoryById.get(socket.ringItemId);
    const gem = inventoryById.get(socket.gemItemId);
    if (!ring) {
      issues.push(`Ring socket references missing ring item "${socket.ringItemId}".`);
    } else if (ring.type !== "ring") {
      issues.push(`Ring socket references non-ring item "${socket.ringItemId}".`);
    } else {
      if (ring.playerId !== snapshot.player.id) {
        issues.push(`Ring socket references foreign ring item "${socket.ringItemId}".`);
      }
      if (
        !Number.isInteger(socket.socketIndex) ||
        socket.socketIndex < 0 ||
        ring.socketCount === null ||
        socket.socketIndex >= ring.socketCount
      ) {
        issues.push(`Ring socket index is invalid for ring "${socket.ringItemId}".`);
      }
      gemsByRingId.set(socket.ringItemId, (gemsByRingId.get(socket.ringItemId) ?? 0) + 1);
    }

    if (!gem) {
      issues.push(`Ring socket references missing gem item "${socket.gemItemId}".`);
    } else if (gem.type !== "gem") {
      issues.push(`Ring socket references non-gem item "${socket.gemItemId}".`);
    } else if (gem.playerId !== snapshot.player.id) {
      issues.push(`Ring socket references foreign gem item "${socket.gemItemId}".`);
    }

    if (usedGemIds.has(socket.gemItemId)) {
      issues.push(`Gem item "${socket.gemItemId}" is socketed more than once.`);
    }
    usedGemIds.add(socket.gemItemId);
  }

  for (const [ringItemId, gemCount] of gemsByRingId.entries()) {
    const ring = inventoryById.get(ringItemId);
    if (ring?.socketCount !== null && ring && gemCount > ring.socketCount) {
      issues.push(`Ring item "${ringItemId}" has more gems than sockets.`);
    }
  }
}

function validateGemEnchantments(
  snapshot: PlayerGameStateSnapshot,
  inventoryById: ReadonlyMap<string, InventoryItemSnapshot>,
  issues: string[],
): void {
  const enchantedTargetIds = new Set<string>();

  for (const enchantment of snapshot.gemEnchantments) {
    if (enchantment.playerId !== snapshot.player.id) {
      issues.push(`Gem enchantment for gem "${enchantment.gemItemId}" is owned by "${enchantment.playerId}".`);
    }

    const gem = inventoryById.get(enchantment.gemItemId);
    const target = inventoryById.get(enchantment.targetItemId);
    if (!gem) {
      issues.push(`Gem enchantment references missing gem item "${enchantment.gemItemId}".`);
    } else if (gem.type !== "gem") {
      issues.push(`Gem enchantment references non-gem item "${enchantment.gemItemId}".`);
    } else if (gem.playerId !== snapshot.player.id) {
      issues.push(`Gem enchantment references foreign gem item "${enchantment.gemItemId}".`);
    }

    if (enchantment.targetType !== "monster" && enchantment.targetType !== "spell") {
      issues.push(`Gem enchantment has invalid target type "${enchantment.targetType}".`);
    }
    if (!target) {
      issues.push(`Gem enchantment references missing target item "${enchantment.targetItemId}".`);
    } else {
      if (target.playerId !== snapshot.player.id) {
        issues.push(`Gem enchantment references foreign target item "${enchantment.targetItemId}".`);
      }
      if (target.type !== enchantment.targetType) {
        issues.push(`Gem enchantment target "${target.id}" does not match target type.`);
      }
    }
    if (enchantedTargetIds.has(enchantment.targetItemId)) {
      issues.push(`Enchantment target "${enchantment.targetItemId}" is reused.`);
    }
    enchantedTargetIds.add(enchantment.targetItemId);
  }
}

function validateEquippedRings(
  snapshot: PlayerGameStateSnapshot,
  inventoryById: ReadonlyMap<string, InventoryItemSnapshot>,
  issues: string[],
): void {
  if (snapshot.equippedRings.length > maxEquippedRings) {
    issues.push(`Player "${snapshot.player.id}" has more than ${maxEquippedRings} equipped rings.`);
  }

  for (const equippedRing of snapshot.equippedRings) {
    if (equippedRing.playerId !== snapshot.player.id) {
      issues.push(`Equipped ring "${equippedRing.ringItemId}" is owned by "${equippedRing.playerId}".`);
    }
    validateRingReference(
      equippedRing.ringItemId,
      snapshot.player.id,
      inventoryById,
      issues,
      "Equipped ring",
    );
    if (!Number.isInteger(equippedRing.slotIndex) || equippedRing.slotIndex < 0 || equippedRing.slotIndex >= maxEquippedRings) {
      issues.push(`Equipped ring "${equippedRing.ringItemId}" has invalid slot index.`);
    }
  }
}

function validateLoadouts(
  snapshot: PlayerGameStateSnapshot,
  inventoryById: ReadonlyMap<string, InventoryItemSnapshot>,
  loadoutsById: ReadonlyMap<string, LoadoutSnapshot>,
  issues: string[],
): void {
  if (snapshot.player.activeLoadoutId && !loadoutsById.has(snapshot.player.activeLoadoutId)) {
    issues.push(`Player "${snapshot.player.id}" references missing active loadout.`);
  }

  for (const loadout of snapshot.loadouts) {
    if (loadout.playerId !== snapshot.player.id) {
      issues.push(`Loadout "${loadout.id}" is owned by "${loadout.playerId}".`);
    }
    if (loadout.rings.length > maxLoadoutRings) {
      issues.push(`Loadout "${loadout.id}" has more than ${maxLoadoutRings} rings.`);
    }

    for (const loadoutRing of loadout.rings) {
      if (loadoutRing.loadoutId !== loadout.id) {
        issues.push(`Loadout ring references loadout "${loadoutRing.loadoutId}" from loadout "${loadout.id}".`);
      }
      validateRingReference(
        loadoutRing.ringItemId,
        snapshot.player.id,
        inventoryById,
        issues,
        "Loadout ring",
      );
      if (!Number.isInteger(loadoutRing.slotIndex) || loadoutRing.slotIndex < 0 || loadoutRing.slotIndex >= maxLoadoutRings) {
        issues.push(`Loadout ring "${loadoutRing.ringItemId}" has invalid slot index.`);
      }
    }
  }
}

function validateRewards(
  snapshot: PlayerGameStateSnapshot,
  inventoryById: ReadonlyMap<string, InventoryItemSnapshot>,
  issues: string[],
): void {
  const materialIds = new Set(definitions.materials.map((material) => material.id));

  for (const reward of snapshot.rewardGrants) {
    if (reward.playerId !== snapshot.player.id) {
      issues.push(`Reward grant is owned by "${reward.playerId}".`);
    }
    if (!allowedRewardStatuses.has(reward.status)) {
      issues.push(`Reward grant has invalid status "${reward.status}".`);
    }
    if (!Number.isInteger(reward.credits) || reward.credits < 0) {
      issues.push("Reward grant has invalid credits.");
    }
    if (!Number.isInteger(reward.heroExperience) || reward.heroExperience < 0) {
      issues.push("Reward grant has invalid hero experience.");
    }

    for (const material of reward.materials) {
      if (!materialIds.has(material.materialId)) {
        issues.push(`Reward grant references unknown material "${material.materialId}".`);
      }
      if (!Number.isInteger(material.quantity) || material.quantity < 0) {
        issues.push(`Reward material "${material.materialId}" has invalid quantity.`);
      }
    }

    for (const itemReward of reward.items) {
      const item = inventoryById.get(itemReward.inventoryItemId);
      if (!item) {
        issues.push(`Reward item references missing inventory item "${itemReward.inventoryItemId}".`);
      } else if (item.playerId !== snapshot.player.id) {
        issues.push(`Reward item references foreign inventory item "${itemReward.inventoryItemId}".`);
      }
      if (!Number.isInteger(itemReward.experience) || itemReward.experience < 0) {
        issues.push(`Reward item "${itemReward.inventoryItemId}" has invalid experience.`);
      }
    }
  }
}

function validateLegacySocketedGemIds(
  ring: InventoryItemSnapshot,
  inventoryById: ReadonlyMap<string, InventoryItemSnapshot>,
  issues: string[],
): void {
  const parsedGemIds = parseJsonStringArray(ring.socketedGemInstanceIds);
  if (!parsedGemIds) {
    issues.push(`Ring item "${ring.id}" has invalid socketed gem JSON.`);
    return;
  }
  if (ring.socketCount !== null && parsedGemIds.length > ring.socketCount) {
    issues.push(`Ring item "${ring.id}" has more legacy gems than sockets.`);
  }
  for (const gemId of parsedGemIds) {
    const gem = inventoryById.get(gemId);
    if (!gem) {
      issues.push(`Ring item "${ring.id}" references missing legacy gem "${gemId}".`);
    } else if (gem.type !== "gem") {
      issues.push(`Ring item "${ring.id}" references non-gem legacy item "${gemId}".`);
    } else if (gem.playerId !== ring.playerId) {
      issues.push(`Ring item "${ring.id}" references foreign legacy gem "${gemId}".`);
    }
  }
}

function validateRingReference(
  ringItemId: string,
  playerId: string,
  inventoryById: ReadonlyMap<string, InventoryItemSnapshot>,
  issues: string[],
  context: string,
): void {
  const ring = inventoryById.get(ringItemId);
  if (!ring) {
    issues.push(`${context} references missing ring item "${ringItemId}".`);
  } else if (ring.type !== "ring") {
    issues.push(`${context} references non-ring item "${ringItemId}".`);
  } else if (ring.playerId !== playerId) {
    issues.push(`${context} references foreign ring item "${ringItemId}".`);
  }
}

function parseJsonStringArray(value: string): string[] | undefined {
  try {
    const parsed = JSON.parse(value) as unknown;
    return Array.isArray(parsed) && parsed.every((entry) => typeof entry === "string")
      ? parsed
      : undefined;
  } catch {
    return undefined;
  }
}
