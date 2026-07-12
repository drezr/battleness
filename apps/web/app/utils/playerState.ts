export type PlayerState = {
  player: {
    id: string;
    username: string;
    experience: number;
    credits: number;
  };
  materials: MaterialView[];
  inventory: InventoryItemView[];
  recipes: RecipeView[];
};

export type MaterialView = {
  id: string;
  label: string;
  description: string;
  rarity: string;
  craftingFamily: string;
  realWorldType: string;
  chemicalSymbol: string | null;
  atomicNumber: number | null;
  quantity: number;
};

export type InventoryItemView = {
  id: string;
  type: string;
  definitionId: string;
  label: string;
  rarity: string;
  element: string;
  experience: number;
  quality: number;
  socketCount: number | null;
  equipped: boolean;
};

export type RecipeView = {
  id: string;
  outputType: string;
  outputDefinitionId: string;
  outputLabel: string;
  outputRarity: string;
  outputElement: string;
  craftedLevel: number;
  craftedQuality: number;
  canCraft: boolean;
  ingredients: {
    materialId: string;
    label: string;
    quantity: number;
    available: number;
  }[];
};

export type EquipmentRingView = {
  id: string;
  definitionId: string;
  label: string;
  rarity: string;
  element: string;
  experience: number;
  quality: number;
  socketCount: number | null;
  equipped: boolean;
  slotIndex: number | null;
  baseDamage: number;
  baseEnergyCost: number;
  baseCooldown: number;
  baseSpeed: number;
};

export type EquipmentState = {
  player: {
    id: string;
    username: string;
  };
  maxEquippedRings: number;
  equippedRings: EquipmentRingView[];
  availableRings: EquipmentRingView[];
  summary: {
    ringCount: number;
    totalSpeed: number;
    totalDamage: number;
    averageEnergyCost: number;
    averageCooldown: number;
  };
};

export function inventoryCountByType(
  inventory: readonly InventoryItemView[] | undefined,
  type: string,
): number {
  return (inventory ?? []).filter((item) => item.type === type).length;
}

export function totalMaterialQuantity(materials: readonly MaterialView[] | undefined): number {
  return (materials ?? []).reduce((total, material) => total + material.quantity, 0);
}

export function heroLevelFromExperience(experience: number): number {
  return Math.floor(Math.sqrt(experience / 100));
}
