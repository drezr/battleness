import type { BattleEvent } from "@battleness/engine";

export type PlayerState = {
  content: ContentReleaseView;
  player: {
    id: string;
    username: string;
    displayName: string;
    experience: number;
    level: number;
    maxHealth: number;
    progression: ExperienceProgressView;
    credits: number;
  };
  materials: MaterialView[];
  inventory: InventoryItemView[];
  recipes: RecipeView[];
};

export type ProfileSettingsState = {
  profile: {
    id: string;
    username: string;
    displayName: string;
    visibility: "public" | "private";
    createdAt: string;
    lastActiveAt: string;
  };
  preferences: {
    locale: "en" | "fr";
    theme: "system" | "dark" | "light";
    reducedMotion: boolean;
    interfaceDensity: "comfortable" | "compact";
    muted: boolean;
    masterVolume: number;
    musicVolume: number;
    effectsVolume: number;
    updatedAt: string | null;
  };
};

export type ContentReleaseView = {
  version: string;
  checksum: string;
};

export type ExperienceProgressView = {
  level: number;
  maxLevel: number;
  currentLevelExperience: number;
  nextLevelExperience: number | null;
  experienceIntoLevel: number;
  experienceForNextLevel: number | null;
  experienceRemaining: number;
  progressPercent: number;
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
  contentVersion: string;
};

export type GameMarketMaterialView = MaterialView & {
  buyPrice: number;
  sellPrice: number;
};

export type GameMarketItemBlockReason =
  | "noRecipe"
  | "equipped"
  | "loadout"
  | "socketedGems"
  | "socketed"
  | "enchantment"
  | "marketListing";

export type GameMarketItemView = InventoryItemView & {
  recipeId: string | null;
  recipeValue: number | null;
  sellPrice: number | null;
  canSell: boolean;
  blockedReason: GameMarketItemBlockReason | null;
  ingredients: {
    materialId: string;
    label: string;
    quantity: number;
    unitPrice: number;
  }[];
};

export type GameMarketTransactionView = {
  id: string;
  requestId: string;
  action: "buy" | "sell";
  resourceType: "material" | "ring" | "gem" | "monster" | "spell";
  resourceId: string;
  resourceDefinitionId: string;
  resourceLabel: string;
  quantity: number;
  unitPrice: number;
  creditsDelta: number;
  contentVersion: string;
  createdAt: string;
};

export type GameMarketState = {
  content: ContentReleaseView;
  player: {
    id: string;
    username: string;
    credits: number;
  };
  materials: GameMarketMaterialView[];
  items: GameMarketItemView[];
  transactions: GameMarketTransactionView[];
};

export type PlayerMarketListingView = {
  id: string;
  resourceType: "ring" | "gem" | "monster" | "spell" | "material";
  definitionId: string;
  nameKey: string | null;
  label: string;
  rarity: "common" | "refined" | "rare" | "epic";
  element: "electric" | "fire" | "ice" | null;
  level: number | null;
  quality: number | null;
  quantity: number;
  price: number;
  contentVersion: string;
  createdAt: string;
  bundleItemCount: number;
  isOwnListing: boolean;
};

export type PlayerMarketBrowseState = {
  createOptions: {
    activeListingCount: number;
    maxActiveListings: number;
    items: {
      inventoryItemId: string;
      resourceType: Exclude<PlayerMarketListingView["resourceType"], "material">;
      definitionId: string;
      nameKey: string;
      label: string;
      rarity: PlayerMarketListingView["rarity"];
      element: Exclude<PlayerMarketListingView["element"], null>;
      level: number;
      quality: number;
      bundleItemCount: number;
    }[];
    materials: {
      materialId: string;
      definitionId: string;
      nameKey: string;
      label: string;
      rarity: PlayerMarketListingView["rarity"];
      quantity: number;
    }[];
  };
  filters: {
    resourceTypes: PlayerMarketListingView["resourceType"][];
    rarities: PlayerMarketListingView["rarity"][];
    elements: Exclude<PlayerMarketListingView["element"], null>[];
    sorts: ("newest" | "priceAsc" | "priceDesc" | "levelDesc" | "qualityDesc")[];
    definitions: {
      resourceType: PlayerMarketListingView["resourceType"];
      definitionId: string;
      nameKey: string;
      label: string;
    }[];
  };
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
  listings: PlayerMarketListingView[];
};

export type PlayerMarketHistoryTransactionView = Omit<
  PlayerMarketListingView,
  "createdAt" | "isOwnListing"
> & {
  direction: "purchase" | "sale";
  listedAt: string;
  soldAt: string;
};

export type PlayerMarketHistoryState = {
  filter: { role: "all" | "buyer" | "seller" };
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
  transactions: PlayerMarketHistoryTransactionView[];
};

export type BattleRewardView = {
  id: string;
  contentVersion: string;
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

export type RankedSeasonRewardView = {
  seasonId: string;
  tier: "bronze" | "silver" | "gold" | "platinum" | "diamond" | "master";
  peakRating: number;
  badgeCosmeticId: string;
  titleCosmeticId: string;
  reward: BattleRewardView;
};

export type BattleResultSummaryActivityView = {
  id: string;
  label: string;
  playerId: string;
  count: number;
};

export type BattleResultSummaryView = {
  turnCount: number;
  actionCount: number;
  players: {
    playerId: string;
    username: string;
    damage: number;
    actionCount: number;
  }[];
  ringsUsed: BattleResultSummaryActivityView[];
  spellsCast: BattleResultSummaryActivityView[];
  monstersSummoned: BattleResultSummaryActivityView[];
  monstersUsed: BattleResultSummaryActivityView[];
  loadouts: {
    playerId: string;
    username: string;
    level: number;
    rings: LiveBattleRingView[];
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
  summary: BattleResultSummaryView | null;
};

export type BattleHistoryState = {
  player: {
    id: string;
    username: string;
    credits: number;
    experience: number;
    level: number;
  };
  seasonRewards: RankedSeasonRewardView[];
  records: BattleHistoryRecordView[];
};

export type PrivateMatchState = {
  playerId: string;
  match: null | {
    id: string;
    code: string;
    status: "waiting" | "starting" | "active" | "finished" | "cancelled";
    battleId: string | null;
    turnDeadlineAt: string | null;
    openingDuelDeadlineAt: string | null;
    expiresAt: string;
    participants: {
      isCurrentPlayer: boolean;
      displayName: string;
      level: number;
      rank: PvpVisibleRank;
      slot: "host" | "guest";
      ready: boolean;
      loadoutId?: string | null;
      loadoutName?: string | null;
      ringCount?: number;
    }[];
  };
  loadouts: {
    id: string;
    name: string;
    ringCount: number;
  }[];
};

export type CasualMatchmakingState = {
  playerId: string;
  status: "idle" | "searching" | "matched";
  activeLoadout: {
    id: string;
    name: string;
    ringCount: number;
  } | null;
  queue: {
    id: string;
    joinedAt: string;
    expiresAt: string;
    loadoutName: string | null;
    ringCount: number;
  } | null;
  match: {
    battleId: string;
    opponent: {
      displayName: string;
      level: number;
      rank: PvpVisibleRank;
      ready: boolean;
    };
  } | null;
  recentBattleId: string | null;
};

export type RankedMatchmakingState = {
  playerId: string;
  status: "unavailable" | "idle" | "searching" | "accepting" | "matched";
  season: { id: string; endsAt: string } | null;
  rating: {
    value: number;
    deviation: number;
    placementMatches: number;
    placementTarget: number;
    standing: {
      tier: "bronze" | "silver" | "gold" | "platinum" | "diamond" | "master";
      division: 1 | 2 | 3 | null;
      minimumRating: number;
    } | null;
    peakRating: number | null;
    peakStanding: {
      tier: "bronze" | "silver" | "gold" | "platinum" | "diamond" | "master";
      division: 1 | 2 | 3 | null;
      minimumRating: number;
    } | null;
  } | null;
  seasonReset: {
    ratingBefore: number;
    ratingAfter: number;
    previousPlacementMatches: number;
  } | null;
  seasonRewards: RankedSeasonRewardView[];
  activeLoadout: { id: string; name: string; ringCount: number } | null;
  queue: {
    id: string;
    joinedAt: string;
    expiresAt: string;
    loadoutName: string | null;
    ringCount: number;
    ratingRange: number;
    heroLevelRange: number;
  } | null;
  proposal: {
    pairingKey: string;
    acceptanceDeadlineAt: string;
    accepted: boolean;
    opponent: PvpOpponentIdentity;
  } | null;
  match: {
    battleId: string;
    opponent: PvpOpponentIdentity;
  } | null;
  recentBattleId: string | null;
  discipline: { missedAcceptances: number; lockedUntil: string | null };
};

export type PvpVisibleRank = {
  tier: "bronze" | "silver" | "gold" | "platinum" | "diamond" | "master";
  division: 1 | 2 | 3 | null;
} | null;

export type PvpOpponentIdentity = {
  displayName: string;
  level: number;
  rank: PvpVisibleRank;
  ready: boolean;
};

export type RankedLeaderboardEntry = {
  position: number;
  playerId: string;
  username: string | null;
  isCurrentPlayer: boolean;
  rating: number;
  deviation: number;
  standing: NonNullable<NonNullable<RankedMatchmakingState["rating"]>["standing"]>;
  wins: number;
  losses: number;
  draws: number;
};

export type RankedLeaderboardState = {
  season: { id: string; endsAt: string } | null;
  top: RankedLeaderboardEntry[];
  current: RankedLeaderboardEntry | null;
  nearby: RankedLeaderboardEntry[];
};

export type CampaignRewardPreview = {
  credits: number;
  heroExperience: number;
  materials: {
    materialId: string;
    label: string;
    quantity: number;
  }[];
};

export type CampaignOpponentView = {
  id: string;
  order: number;
  label: string;
  description: string;
  element: string;
  recommendedLevel: number;
  opponentLevel: number;
  victoryCount: number;
  status: "available" | "locked" | "completed";
  repeatable: boolean;
  prerequisite: { id: string; label: string } | null;
  loadoutVisibility: "hidden" | "summary" | "full";
  rings: {
    definitionId: string;
    label: string;
    element: string;
    rarity: string;
    level: number;
    quality: number;
    gems: {
      definitionId: string;
      label: string;
      element: string;
      rarity: string;
      enchantment: null | {
        type: "monster" | "spell";
        definitionId: string;
        label: string;
      };
    }[];
  }[];
  firstClearReward: CampaignRewardPreview;
  repeatVictoryReward: CampaignRewardPreview;
};

export type CampaignState = {
  player: {
    id: string;
    username: string;
    level: number;
    activeLoadoutId: string | null;
  };
  progress: {
    completedCount: number;
    unlockedCount: number;
    totalCount: number;
  };
  opponents: CampaignOpponentView[];
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
    energyPenalty: number;
    cooldownPenalty: number;
    enchantment?: LiveBattleEnchantmentView | null;
  }[];
};

export type LiveBattleEnchantmentView =
  | {
      type: "spell";
      definitionId: string;
      label: string;
      element: string;
      rarity: string;
      damage: number;
      energyPenalty: number;
      cooldownPenalty: number;
    }
  | {
      type: "monster";
      definitionId: string;
      label: string;
      element: string;
      rarity: string;
      health: number;
      damage: number;
      cooldown: number;
      speed: number;
      skill: string | null;
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
  turnPlayerId: string | null;
  turnDeadlineAt: string | null;
  openingDuelDeadlineAt: string | null;
  openingDuelChoiceSubmitted: boolean;
  openingDuelRound: number;
  viewer: LiveBattlePlayerView;
  opponent: LiveBattlePlayerView;
  result: null | { type: "draw" } | { type: "winner"; winnerId: string; loserId: string };
  reward: BattleRewardView | null;
  summary: BattleResultSummaryView | null;
};

export type LiveBattleActionCommand =
  | { type: "chooseElement"; element: "electric" | "fire" | "ice" }
  | { type: "useRing"; ringInstanceId: string; targetId: string }
  | { type: "useMonster"; monsterInstanceId: string; targetId: string }
  | { type: "endTurn" }
  | { type: "concede" };

export type LiveBattleActionResponse = {
  battle: LiveBattleState;
  events: BattleEvent[];
};

export type InventoryItemView = {
  id: string;
  type: string;
  definitionId: string;
  contentVersion: string;
  label: string;
  rarity: string;
  element: string;
  experience: number;
  level: number;
  progression: ExperienceProgressView;
  quality: number;
  bonusPercent: number;
  socketCount: number | null;
  equipped: boolean;
  damage?: number;
  health?: number;
  energyPenalty?: number;
  cooldownPenalty?: number;
  cooldown?: number;
  skill?: string | null;
  socketedRingId?: string | null;
  socketedRingLabel?: string | null;
  socketIndex?: number | null;
  enchantedGemId?: string | null;
  enchantedGemLabel?: string | null;
  gems?: EquipmentGemView[];
  enchantment?: EquipmentEnchantmentView | null;
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
