import { experienceForLevel } from "./progression";
import type {
  GemInstance,
  MaterialDefinition,
  MonsterInstance,
  RecipeDefinition,
  RecipeIngredient,
  RingInstance,
  SpellInstance,
} from "./schemas";

export type ImprovementRarity = "common" | "refined" | "rare" | "legendary";
export type MaterialStock = Record<string, number>;

export type CraftedItemInstance =
  | { type: "ring"; item: RingInstance }
  | { type: "gem"; item: GemInstance }
  | { type: "monster"; item: MonsterInstance }
  | { type: "spell"; item: SpellInstance };

export const DEVELOPMENT_STARTING_CREDITS = 1000;
export const QUALITY_IMPROVEMENT_STEP = 5;
export const MAX_RING_SOCKET_COUNT = 3;

export type CraftRecipeInput = {
  recipe: RecipeDefinition;
  ownerId: string;
  stock: MaterialStock;
  instanceSequence: number;
};

export type CraftRecipeResult = {
  stock: MaterialStock;
  crafted: CraftedItemInstance;
};

export type ImprovementResult<T extends CraftedItemInstance> = {
  credits: number;
  crafted: T;
  cost: number;
};

export function createMaterialStock(
  materials: readonly MaterialDefinition[],
  quantity: number,
): MaterialStock {
  if (!Number.isInteger(quantity) || quantity < 0) {
    throw new RangeError("Material stock quantity must be a nonnegative integer.");
  }

  return Object.fromEntries(materials.map((material) => [material.id, quantity]));
}

export function canCraftRecipe(recipe: RecipeDefinition, stock: MaterialStock): boolean {
  return missingRecipeIngredients(recipe, stock).length === 0;
}

export function missingRecipeIngredients(
  recipe: RecipeDefinition,
  stock: MaterialStock,
): RecipeIngredient[] {
  return recipe.ingredients.filter(
    (ingredient) => (stock[ingredient.materialId] ?? 0) < ingredient.quantity,
  );
}

export function craftRecipe(input: CraftRecipeInput): CraftRecipeResult {
  if (!canCraftRecipe(input.recipe, input.stock)) {
    const missing = missingRecipeIngredients(input.recipe, input.stock)
      .map((ingredient) => ingredient.materialId)
      .join(", ");
    throw new Error(`Recipe "${input.recipe.id}" is missing materials: ${missing}.`);
  }

  const stock = { ...input.stock };
  for (const ingredient of input.recipe.ingredients) {
    stock[ingredient.materialId] = (stock[ingredient.materialId] ?? 0) - ingredient.quantity;
  }

  return {
    stock,
    crafted: createCraftedItem(input.recipe, input.ownerId, input.instanceSequence),
  };
}

export function qualityImprovementCost(rarity: ImprovementRarity, currentQuality: number): number {
  assertQualityCanImprove(currentQuality);
  return rarityBaseCost(rarity) * (1 + Math.floor(currentQuality / 25));
}

export function socketImprovementCost(
  rarity: ImprovementRarity,
  currentSocketCount: number,
): number {
  assertSocketCanImprove(currentSocketCount);
  return rarityBaseCost(rarity) * 5 * (currentSocketCount + 1);
}

export function improveCraftedItemQuality<T extends CraftedItemInstance>(
  crafted: T,
  rarity: ImprovementRarity,
  credits: number,
): ImprovementResult<T> {
  const cost = qualityImprovementCost(rarity, crafted.item.quality);
  assertEnoughCredits(credits, cost);

  return {
    credits: credits - cost,
    cost,
    crafted: {
      ...crafted,
      item: {
        ...crafted.item,
        quality: Math.min(100, crafted.item.quality + QUALITY_IMPROVEMENT_STEP),
      },
    } as T,
  };
}

export function improveRingSocketCount(
  crafted: Extract<CraftedItemInstance, { type: "ring" }>,
  rarity: ImprovementRarity,
  credits: number,
): ImprovementResult<Extract<CraftedItemInstance, { type: "ring" }>> {
  const cost = socketImprovementCost(rarity, crafted.item.socketCount);
  assertEnoughCredits(credits, cost);

  return {
    credits: credits - cost,
    cost,
    crafted: {
      ...crafted,
      item: {
        ...crafted.item,
        socketCount: crafted.item.socketCount + 1,
      },
    },
  };
}

function createCraftedItem(
  recipe: RecipeDefinition,
  ownerId: string,
  instanceSequence: number,
): CraftedItemInstance {
  const base = {
    id: `${ownerId}.${recipe.outputType}.${recipe.outputDefinitionId}.crafted.${instanceSequence}`,
    definitionId: recipe.outputDefinitionId,
    ownerId,
    experience: experienceForLevel(recipe.craftedLevel),
    quality: recipe.craftedQuality,
  };

  if (recipe.outputType === "ring") {
    return {
      type: "ring",
      item: {
        ...base,
        socketCount: recipe.ringSocketCount ?? 1,
        socketedGemInstanceIds: [],
        equipped: false,
      },
    };
  }

  return {
    type: recipe.outputType,
    item: base,
  } as CraftedItemInstance;
}

function rarityBaseCost(rarity: ImprovementRarity): number {
  const costs = {
    common: 25,
    refined: 50,
    rare: 100,
    legendary: 200,
  } satisfies Record<ImprovementRarity, number>;
  return costs[rarity];
}

function assertQualityCanImprove(currentQuality: number): void {
  if (!Number.isInteger(currentQuality) || currentQuality < 0 || currentQuality > 100) {
    throw new RangeError("Quality must be an integer between 0 and 100.");
  }
  if (currentQuality >= 100) {
    throw new Error("Item quality is already at the maximum.");
  }
}

function assertSocketCanImprove(currentSocketCount: number): void {
  if (
    !Number.isInteger(currentSocketCount) ||
    currentSocketCount < 1 ||
    currentSocketCount > MAX_RING_SOCKET_COUNT
  ) {
    throw new RangeError(`Socket count must be an integer between 1 and ${MAX_RING_SOCKET_COUNT}.`);
  }
  if (currentSocketCount >= MAX_RING_SOCKET_COUNT) {
    throw new Error("Ring socket count is already at the maximum.");
  }
}

function assertEnoughCredits(credits: number, cost: number): void {
  if (!Number.isInteger(credits) || credits < 0) {
    throw new RangeError("Credits must be a nonnegative integer.");
  }
  if (credits < cost) {
    throw new Error("Not enough credits.");
  }
}
