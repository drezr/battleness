import {
  createMaterialStock,
  DEVELOPMENT_STARTING_CREDITS,
  type CraftedItemInstance,
  type GemInstance,
  type MaterialDefinition,
  type MaterialStock,
} from "@battleness/content";

export type DevelopmentInventory = {
  credits: number;
  stock: MaterialStock;
  craftedItems: CraftedItemInstance[];
  nextSequence: number;
};

const storageKey = "battleness.developmentInventory.v1";
const format = "battlenessDevelopmentInventory";

export function createDefaultDevelopmentInventory(
  materials: readonly MaterialDefinition[],
): DevelopmentInventory {
  return {
    credits: DEVELOPMENT_STARTING_CREDITS,
    stock: createMaterialStock(materials, 2),
    craftedItems: [],
    nextSequence: 1,
  };
}

export function loadDevelopmentInventory(
  materials: readonly MaterialDefinition[],
  storage: Storage = localStorage,
): DevelopmentInventory {
  const rawValue = storage.getItem(storageKey);
  if (!rawValue) {
    return createDefaultDevelopmentInventory(materials);
  }

  try {
    return parseDevelopmentInventoryJson(rawValue, materials);
  } catch {
    return createDefaultDevelopmentInventory(materials);
  }
}

export function saveDevelopmentInventory(
  inventory: DevelopmentInventory,
  storage: Storage = localStorage,
): void {
  storage.setItem(storageKey, serializeDevelopmentInventory(inventory));
}

export function serializeDevelopmentInventory(inventory: DevelopmentInventory): string {
  return JSON.stringify(
    {
      format,
      version: 1,
      credits: inventory.credits,
      stock: inventory.stock,
      craftedItems: inventory.craftedItems,
      nextSequence: inventory.nextSequence,
    },
    null,
    2,
  );
}

export function parseDevelopmentInventoryJson(
  value: string,
  materials: readonly MaterialDefinition[],
): DevelopmentInventory {
  let parsed: unknown;
  try {
    parsed = JSON.parse(value);
  } catch {
    throw new Error("Development inventory is not valid JSON.");
  }

  if (!isRecord(parsed) || parsed.format !== format || parsed.version !== 1) {
    throw new Error("Development inventory format is not supported.");
  }

  const stock = parseStock(parsed.stock, materials);
  const craftedItems = parseCraftedItems(parsed.craftedItems);
  const nextSequence = parsePositiveInteger(parsed.nextSequence, "nextSequence");
  const credits = parseNonnegativeInteger(
    parsed.credits ?? DEVELOPMENT_STARTING_CREDITS,
    "credits",
  );

  return {
    credits,
    stock,
    craftedItems,
    nextSequence,
  };
}

function parseStock(value: unknown, materials: readonly MaterialDefinition[]): MaterialStock {
  if (!isRecord(value)) {
    throw new Error("Development inventory stock must be an object.");
  }

  return Object.fromEntries(
    materials.map((material) => [
      material.id,
      parseNonnegativeInteger(value[material.id] ?? 0, `stock.${material.id}`),
    ]),
  );
}

function parseCraftedItems(value: unknown): CraftedItemInstance[] {
  if (!Array.isArray(value)) {
    throw new Error("Development inventory craftedItems must be an array.");
  }

  return value.map((item, index) => parseCraftedItem(item, index));
}

function parseCraftedItem(value: unknown, index: number): CraftedItemInstance {
  if (!isRecord(value) || !isCraftedItemType(value.type) || !isRecord(value.item)) {
    throw new Error(`craftedItems.${index} has an invalid shape.`);
  }

  const base = {
    id: parseString(value.item.id, `craftedItems.${index}.item.id`),
    definitionId: parseString(value.item.definitionId, `craftedItems.${index}.item.definitionId`),
    ownerId: parseString(value.item.ownerId, `craftedItems.${index}.item.ownerId`),
    experience: parseNonnegativeInteger(
      value.item.experience,
      `craftedItems.${index}.item.experience`,
    ),
    quality: parseQuality(value.item.quality, `craftedItems.${index}.item.quality`),
  };

  if (value.type === "ring") {
    return {
      type: "ring",
      item: {
        ...base,
        socketCount: parseSocketCount(
          value.item.socketCount,
          `craftedItems.${index}.item.socketCount`,
        ),
        socketedGemInstanceIds: parseStringArray(
          value.item.socketedGemInstanceIds,
          `craftedItems.${index}.item.socketedGemInstanceIds`,
        ),
        equipped: parseBoolean(value.item.equipped, `craftedItems.${index}.item.equipped`),
      },
    };
  }

  if (value.type === "gem") {
    return {
      type: "gem",
      item: {
        ...base,
        enchantment: parseGemEnchantment(
          value.item.enchantment,
          `craftedItems.${index}.item.enchantment`,
        ),
      },
    };
  }

  return {
    type: value.type,
    item: base,
  } as CraftedItemInstance;
}

function parseGemEnchantment(value: unknown, label: string): GemInstance["enchantment"] {
  if (value === undefined) {
    return undefined;
  }

  if (!isRecord(value) || (value.type !== "monster" && value.type !== "spell")) {
    throw new Error(`${label} has an invalid shape.`);
  }

  if (value.type === "monster") {
    return {
      type: "monster",
      monsterInstanceId: parseString(value.monsterInstanceId, `${label}.monsterInstanceId`),
    };
  }

  return {
    type: "spell",
    spellInstanceId: parseString(value.spellInstanceId, `${label}.spellInstanceId`),
  };
}

function parseString(value: unknown, label: string): string {
  if (typeof value !== "string" || !value.trim()) {
    throw new Error(`${label} must be a non-empty string.`);
  }
  return value;
}

function parseStringArray(value: unknown, label: string): string[] {
  if (!Array.isArray(value) || !value.every((entry) => typeof entry === "string" && entry)) {
    throw new Error(`${label} must be a string array.`);
  }
  return value;
}

function parseBoolean(value: unknown, label: string): boolean {
  if (typeof value !== "boolean") {
    throw new Error(`${label} must be a boolean.`);
  }
  return value;
}

function parsePositiveInteger(value: unknown, label: string): number {
  const parsed = parseNonnegativeInteger(value, label);
  if (parsed < 1) {
    throw new Error(`${label} must be positive.`);
  }
  return parsed;
}

function parseNonnegativeInteger(value: unknown, label: string): number {
  if (typeof value !== "number" || !Number.isInteger(value) || value < 0) {
    throw new Error(`${label} must be a nonnegative integer.`);
  }
  return value;
}

function parseQuality(value: unknown, label: string): number {
  const parsed = parseNonnegativeInteger(value, label);
  if (parsed > 100) {
    throw new Error(`${label} cannot exceed 100.`);
  }
  return parsed;
}

function parseSocketCount(value: unknown, label: string): number {
  const parsed = parsePositiveInteger(value, label);
  if (parsed > 3) {
    throw new Error(`${label} cannot exceed 3.`);
  }
  return parsed;
}

function isCraftedItemType(value: unknown): value is CraftedItemInstance["type"] {
  return value === "ring" || value === "gem" || value === "monster" || value === "spell";
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}
