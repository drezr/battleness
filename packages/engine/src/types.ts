export type ElementType = "electric" | "fire" | "ice";
export type Rarity = "normal" | "magic" | "rare" | "legendary";

export type TargetId = `${string}.hero` | `${string}.monster.${string}.${number}`;

export type BattleStatus = "choosingFirstPlayer" | "active" | "finished";

export type SpellEffect = {
  type: "dealDamage";
  amount: number;
  target: "any";
};

export type SpellDefinition = {
  id: string;
  nameKey: string;
  element: ElementType;
  baseEnergyPenalty: number;
  baseCooldownPenalty: number;
  effects: SpellEffect[];
};

export type MonsterDefinition = {
  id: string;
  nameKey: string;
  element: ElementType;
  baseHealth: number;
  baseDamage: number;
  baseCooldown: number;
  baseSpeed: number;
  skills: MonsterSkill[];
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
  damage: number;
  energyCost: number;
  cooldown: number;
  currentCooldown: number;
  speed: number;
  gems: GemCombatInstance[];
};

export type GemCombatInstance = {
  id: string;
  definitionId: string;
  ownerId: string;
  nameKey: string;
  element: ElementType;
  damage: number;
  energyPenalty: number;
  cooldownPenalty: number;
  enchantment?: GemEnchantment;
};

export type GemEnchantment =
  | {
      type: "monster";
      monsterId: string;
    }
  | {
      type: "spell";
      spellId: string;
    };

export type MonsterCombatInstance = {
  id: string;
  definitionId: string;
  ownerId: string;
  nameKey: string;
  element: ElementType;
  health: number;
  maxHealth: number;
  damage: number;
  cooldown: number;
  currentCooldown: number;
  speed: number;
  skills: MonsterSkill[];
};

export type MonsterSkill =
  | "haste"
  | "multiHit"
  | "pierce"
  | "rage"
  | "shield"
  | "taunt"
  | {
      type: "haste" | "multiHit" | "pierce" | "rage" | "shield" | "taunt";
      amount?: number;
    };

export type BattleSetup = {
  id: string;
  seed: string;
  status: BattleStatus;
  activePlayerId: string | null;
  startingPlayerId: string | null;
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
  | { type: "firstPlayerChosen"; playerId: string; reason: string }
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
  | { type: "monsterDestroyed"; monsterInstanceId: string }
  | { type: "turnEnded"; playerId: string }
  | { type: "battleEnded"; result: BattleResult };

export type BattleState = BattleSetup & {
  log: BattleEvent[];
  result: BattleResult | null;
};

export type BattleActionResult = {
  state: BattleState;
  events: BattleEvent[];
};
