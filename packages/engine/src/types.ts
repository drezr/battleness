export type ElementType = "electric" | "fire" | "ice";
export type Rarity = "common" | "refined" | "rare" | "epic";

export type TargetId = `${string}.hero` | `${string}.monster.${string}.${number}`;

export type BattleStatus = "choosingFirstPlayer" | "active" | "finished";
export type FirstPlayerChoiceReason = "speed" | "level" | "elementDuel" | "elementDuelTiebreaker";

export type SpellEffect = {
  type: "dealDamage";
  amount: number;
  target: "any";
};

export type SpellDefinition = {
  id: string;
  nameKey: string;
  element: ElementType;
  rarity: Rarity;
  baseSpeed?: number;
  baseEnergyPenalty: number;
  baseCooldownPenalty: number;
  effects: SpellEffect[];
};

export type MonsterDefinition = {
  id: string;
  nameKey: string;
  element: ElementType;
  rarity: Rarity;
  baseHealth: number;
  baseDamage: number;
  baseCooldown: number;
  baseSpeed: number;
  baseEnergyPenalty?: number;
  baseCooldownPenalty?: number;
  skill?: MonsterSkill;
};

export type CombatantStats = {
  health: number;
  maxHealth: number;
  speed: number;
};

export type BattlePlayer = {
  id: string;
  username: string;
  level: number;
  hero: CombatantStats;
  energy: {
    current: number;
    maxForTurn: number;
    turnCount: number;
  };
  rings: RingCombatInstance[];
  monsters: MonsterCombatInstance[];
};

export type RingCombatInstance = {
  id: string;
  definitionId: string;
  ownerId: string;
  nameKey: string;
  element: ElementType;
  rarity: Rarity;
  damage: number;
  energyCost: number;
  cooldown: number;
  currentCooldown: number;
  speed: number;
  socketCount: number;
  gems: GemCombatInstance[];
};

export type GemCombatInstance = {
  id: string;
  definitionId: string;
  ownerId: string;
  nameKey: string;
  element: ElementType;
  rarity: Rarity;
  damage: number;
  energyPenalty: number;
  cooldownPenalty: number;
  speed: number;
  enchantment?: GemEnchantment;
};

export type GemEnchantment =
  | {
      type: "monster";
      monsterId: string;
      resolvedDefinitionId?: string;
    }
  | {
      type: "spell";
      spellId: string;
      resolvedDefinitionId?: string;
    };

export type MonsterCombatInstance = {
  id: string;
  definitionId: string;
  ownerId: string;
  nameKey: string;
  element: ElementType;
  rarity: Rarity;
  health: number;
  maxHealth: number;
  baseDamage: number;
  damage: number;
  cooldown: number;
  currentCooldown: number;
  speed: number;
  skill?: MonsterSkill;
  shieldActive: boolean;
  rageActive: boolean;
};

export type MonsterSkill = "haste" | "multiHit" | "pierce" | "rage" | "shield" | "taunt";

export type BattleSetup = {
  id: string;
  seed: string;
  status: BattleStatus;
  activePlayerId: string | null;
  startingPlayerId: string | null;
  firstPlayerChoices?: Partial<Record<string, ElementType>>;
  definitions: {
    monsters: Record<string, MonsterDefinition>;
    spells: Record<string, SpellDefinition>;
  };
  players: [BattlePlayer, BattlePlayer];
};

export type BattleAction =
  | {
      type: "chooseElement";
      playerId: string;
      element: ElementType;
    }
  | {
      type: "useRing";
      playerId: string;
      ringInstanceId: string;
      targetId: TargetId;
      enchantmentTargets?: Record<string, TargetId>;
    }
  | {
      type: "useMonster";
      playerId: string;
      monsterInstanceId: string;
      targetId: TargetId;
    }
  | {
      type: "endTurn";
      playerId: string;
    }
  | {
      type: "concede";
      playerId: string;
    }
  | {
      type: "resolveOpeningDuelTimeout";
      timedOutPlayerId: string | null;
    };

export type BattleResult =
  | {
      type: "winner";
      winnerId: string;
      loserId: string;
    }
  | {
      type: "draw";
    };

export type BattleEvent =
  | { type: "battleStarted"; battleId: string }
  | { type: "firstPlayerChoiceRequested"; playerIds: [string, string]; reason: "speedAndLevelTie" }
  | { type: "elementChosen"; playerId: string; element: ElementType }
  | { type: "elementDuelTied"; element: ElementType }
  | { type: "elementDuelTiebreaker"; playerId: string; tieCount: number }
  | { type: "openingDuelTimedOut"; timedOutPlayerId: string | null }
  | { type: "firstPlayerChosen"; playerId: string; reason: FirstPlayerChoiceReason }
  | { type: "turnStarted"; playerId: string; turnCount: number; energy: number }
  | { type: "cooldownChanged"; targetId: string; from: number; to: number }
  | { type: "ringUsed"; playerId: string; ringInstanceId: string; targetId: TargetId }
  | { type: "energySpent"; playerId: string; amount: number; remaining: number }
  | {
      type: "damageDealt";
      sourceId: string;
      targetId: TargetId;
      amount: number;
      element?: ElementType;
    }
  | { type: "spellCast"; spellId: string; sourceGemId: string; targetId: TargetId }
  | { type: "monsterSummoned"; playerId: string; monsterInstanceId: string; monsterId: string }
  | { type: "monsterUsed"; playerId: string; monsterInstanceId: string; targetId: TargetId }
  | { type: "shieldBroken"; monsterInstanceId: string; sourceId: string }
  | {
      type: "pierceOverflow";
      monsterInstanceId: string;
      targetMonsterInstanceId: string;
      targetHeroId: TargetId;
      amount: number;
    }
  | { type: "hasteActivated"; monsterInstanceId: string }
  | {
      type: "rageActivated";
      monsterInstanceId: string;
      previousDamage: number;
      damage: number;
    }
  | {
      type: "multiHitResolved";
      monsterInstanceId: string;
      targetIds: TargetId[];
    }
  | { type: "monsterDestroyed"; monsterInstanceId: string }
  | { type: "turnEnded"; playerId: string }
  | { type: "battleEnded"; result: BattleResult };

export type BattleState = BattleSetup & {
  initialSetup: BattleSetup;
  actionHistory: BattleAction[];
  log: BattleEvent[];
  result: BattleResult | null;
};

export type BattleActionResult = {
  state: BattleState;
  events: BattleEvent[];
};

export type BattleRecord = {
  format: "battlenessBattleRecord";
  formatVersion: 1;
  rulesVersion: string;
  contentVersion: string;
  setup: BattleSetup;
  actions: BattleAction[];
  result: BattleResult | null;
  finalStateChecksum: string;
};

export type BattleRecordVersions = {
  rulesVersion: string;
  contentVersion: string;
};
