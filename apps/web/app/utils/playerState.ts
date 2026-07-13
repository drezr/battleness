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

export type GameMarketMaterialView = MaterialView & {
  buyPrice: number;
  sellPrice: number;
};

export type GameMarketTransactionView = {
  id: string;
  requestId: string;
  action: "buy" | "sell";
  resourceType: "material";
  resourceId: string;
  resourceLabel: string;
  quantity: number;
  unitPrice: number;
  creditsDelta: number;
  createdAt: string;
};

export type GameMarketState = {
  player: {
    id: string;
    username: string;
    credits: number;
  };
  materials: GameMarketMaterialView[];
  transactions: GameMarketTransactionView[];
};

export type BattleRewardView = {
  id: string;
  status: "unclaimed" | "claimed";
  credits: number;
  heroExperience: number;
  claimedAt: string | null;
  materials: {
    materialId: string;
    label: string;
    quantity: number;
  }[];
  items: {
    inventoryItemId: string;
    definitionId: string;
    type: string;
    label: string;
    experience: number;
  }[];
};

export type BattleHistoryRecordView = {
  id: string;
  mode: string;
  status: string;
  outcome: "win" | "draw" | "loss";
  seed: string;
  rulesVersion: string;
  contentVersion: string;
  actionCount: number;
  turnCount: number;
  finalStateChecksum: string | null;
  replayAvailable: boolean;
  createdAt: string;
  reward: BattleRewardView | null;
};

export type BattleHistoryState = {
  player: {
    id: string;
    username: string;
    credits: number;
    experience: number;
    level: number;
  };
  records: BattleHistoryRecordView[];
};

export type LiveBattleMonsterView = {
  id: string;
  definitionId: string;
  label: string;
  element: string;
  rarity: string;
  health: number;
  maxHealth: number;
  damage: number;
  cooldown: number;
  currentCooldown: number;
  skill: string | null;
  shieldActive: boolean;
  rageActive: boolean;
};

export type LiveBattleRingView = {
  id: string;
  definitionId: string;
  label: string;
  element: string;
  rarity: string;
  damage: number;
  energyCost: number;
  cooldown: number;
  currentCooldown: number;
  speed: number;
  gems: {
    id: string;
    definitionId: string;
    label: string;
    element: string;
    rarity: string;
    damage: number;
    enchantmentType: "monster" | "spell" | null;
  }[];
};

export type LiveBattlePlayerView = {
  id: string;
  username: string;
  level: number;
  hero: {
    health: number;
    maxHealth: number;
    speed: number;
  };
  energy: {
    current: number;
    maxForTurn: number;
    turnCount: number;
  };
  heroTargetId: string;
  ringCount: number;
  monsters: LiveBattleMonsterView[];
  rings?: LiveBattleRingView[];
};

export type LiveBattleState = {
  id: string;
  mode: string;
  status: "choosingFirstPlayer" | "active" | "finished";
  activePlayerId: string | null;
  startingPlayerId: string | null;
  rulesVersion: string;
  contentVersion: string;
  actionCount: number;
  turnCount: number;
  viewer: LiveBattlePlayerView;
  opponent: LiveBattlePlayerView;
  result: null | { type: "draw" } | { type: "winner"; winnerId: string; loserId: string };
};

export type LiveBattleActionCommand =
  | { type: "chooseElement"; element: "electric" | "fire" | "ice" }
  | { type: "useRing"; ringInstanceId: string; targetId: string }
  | { type: "useMonster"; monsterInstanceId: string; targetId: string }
  | { type: "endTurn" }
  | { type: "concede" };

export type LiveBattleActionResponse = {
  battle: LiveBattleState;
  events: { type: string }[];
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
  level: number;
  quality: number;
  socketCount: number | null;
  equipped: boolean;
  slotIndex: number | null;
  baseDamage: number;
  baseEnergyCost: number;
  baseCooldown: number;
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
  gems: EquipmentGemView[];
};

export type EquipmentGemView = {
  id: string;
  definitionId: string;
  label: string;
  rarity: string;
  element: string;
  experience: number;
  level: number;
  quality: number;
  socketIndex: number;
  damage: number;
  energyPenalty: number;
  cooldownPenalty: number;
  enchantment: EquipmentEnchantmentView | null;
};

export type EquipmentEnchantmentView =
  | {
      id: string;
      type: "spell";
      definitionId: string;
      label: string;
      rarity: string;
      element: string;
      level: number;
      quality: number;
      damage: number;
      energyPenalty: number;
      cooldownPenalty: number;
    }
  | {
      id: string;
      type: "monster";
      definitionId: string;
      label: string;
      rarity: string;
      element: string;
      level: number;
      quality: number;
      damage: number;
      health: number;
      cooldown: number;
      skill: string | null;
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
    totalRingDamage: number;
    totalGemDamage: number;
    totalSpellDamage: number;
    totalMonsterDamage: number;
    totalEnergyPenalty: number;
    totalCooldownPenalty: number;
    averageEnergyCost: number;
    averageCooldown: number;
  };
};

export type LoadoutView = {
  id: string;
  name: string;
  active: boolean;
  ringCount: number;
  rings: EquipmentRingView[];
  summary: EquipmentState["summary"];
};

export type LoadoutState = {
  player: {
    id: string;
    username: string;
    activeLoadoutId: string | null;
  };
  maxLoadoutRings: number;
  currentEquipment: {
    rings: EquipmentRingView[];
    summary: EquipmentState["summary"];
  };
  loadouts: LoadoutView[];
};

export type SocketGemView = {
  id: string;
  definitionId: string;
  label: string;
  rarity: string;
  element: string;
  experience: number;
  level: number;
  quality: number;
  damage: number;
  energyPenalty: number;
  cooldownPenalty: number;
  socketedRingId: string | null;
  socketIndex: number | null;
  enchantment: EquipmentEnchantmentView | null;
};

export type SocketRingView = EquipmentRingView & {
  nextSocketCount: number | null;
  socketImprovementCost: number | null;
  canImproveSockets: boolean;
};

export type SocketEnchantmentTargetView =
  | {
      id: string;
      type: "spell";
      definitionId: string;
      label: string;
      rarity: string;
      element: string;
      experience: number;
      level: number;
      quality: number;
      damage: number;
      energyPenalty: number;
      cooldownPenalty: number;
      enchantedGemId: string | null;
    }
  | {
      id: string;
      type: "monster";
      definitionId: string;
      label: string;
      rarity: string;
      element: string;
      experience: number;
      level: number;
      quality: number;
      damage: number;
      health: number;
      cooldown: number;
      skill: string | null;
      enchantedGemId: string | null;
    };

export type SocketState = {
  player: {
    id: string;
    username: string;
    credits: number;
  };
  maxRingSockets: number;
  rings: SocketRingView[];
  gems: SocketGemView[];
  enchantmentTargets: SocketEnchantmentTargetView[];
};

export type QualityItemView = {
  id: string;
  type: string;
  definitionId: string;
  label: string;
  rarity: string;
  element: string;
  experience: number;
  level: number;
  quality: number;
  nextQuality: number;
  cost: number | null;
  canImprove: boolean;
  stats: {
    label: string;
    current: number;
    next: number;
  }[];
};

export type QualityState = {
  player: {
    id: string;
    username: string;
    credits: number;
  };
  qualityStep: number;
  items: QualityItemView[];
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
