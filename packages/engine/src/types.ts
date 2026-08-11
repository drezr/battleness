export type ElementType = "electric" | "fire" | "ice";
export type Rarity = "common" | "refined" | "rare" | "epic";

export type TargetId = `${string}.hero` | `${string}.monster.${string}.${number}`;

export type BattleStatus = "choosingFirstPlayer" | "active" | "finished";
export type FirstPlayerChoiceReason = "speed" | "level" | "elementDuel" | "elementDuelTiebreaker";

export type SpellAllowedTarget = "anyCombatant" | "anyMonster" | "alliedMonster" | "enemyMonster";

export type SpellTargeting =
  | { selection: "none"; allowedTargets: [] }
  | { selection: "one"; allowedTargets: SpellAllowedTarget[] };

export type DealDamageSpellEffect = {
  type: "dealDamage";
  amount: number;
  element?: ElementType;
  target: "any" | "selected";
};

export type ApplyStatusSpellEffect =
  | {
      type: "applyStatus";
      status: "burn";
      damage: number;
      durationOwnerTurns: number;
      tickTiming?: "startOfTargetControllerTurn";
    }
  | {
      type: "applyStatus";
      status: "shock" | "freeze";
      durationOwnerTurns: number;
    }
  | {
      type: "applyStatus";
      status: "lastBreath";
      duration: "endOfCurrentTurn";
      onDestroy: {
        type: "attackRandomLegalEnemyBeforeRemoval";
        ignoreCurrentCooldown: true;
      };
    };

export type PersistentRingTriggerEffect =
  | { type: "modifySupportedRingDamage"; amount: number; duration: "battle" }
  | { type: "restoreCurrentTurnEnergy"; amount: number; cap: "currentTurnMaximum" }
  | { type: "modifySupportedRingCurrentCooldown"; amount: number; minimum: 0 };

export type SpellEffect =
  | DealDamageSpellEffect
  | ApplyStatusSpellEffect
  | {
      type: "forEachMonster";
      scope: "allMonsters";
      effect: ApplyStatusSpellEffect;
    }
  | {
      type: "dealDamageToAll";
      scope: "enemyMonsters";
      amount?: number;
      amountFromCapturedStat?: "currentDamage";
      element: ElementType;
    }
  | {
      type: "modifyCurrentCooldown";
      target: "selected";
      amount: number;
      maximumFrom: "resolvedBaseCooldown";
    }
  | {
      type: "removeStatuses";
      target: "selected";
      scope: "allTemporaryStatuses";
      removeSkills: false;
    }
  | {
      type: "grantSkill";
      skill: Exclude<MonsterSkill, "haste">;
      duration: "untilMonsterDestroyed";
      activateImmediately?: true;
      duplicateBehavior: "noEffect";
    }
  | {
      type: "grantTemporaryShield";
      target: "selected";
      expires: "startOfTargetControllerNextTurn";
      duplicateBehavior: "noEffect";
    }
  | {
      type: "setCurrentCooldown";
      target: "selected";
      value?: 0;
      valueFrom?: "resolvedBaseCooldown";
    }
  | {
      type: "setCurrentCooldownForAll";
      scope: "alliedMonsters";
      value: 0;
    }
  | {
      type: "randomTarget";
      scope: "alliedRingsWithCooldownAboveZero";
      onSuccess: { type: "modifyRingCurrentCooldown"; amount: number; minimum: 0 };
    }
  | {
      type: "randomTarget";
      scope: "otherAlliedMonsters";
      onSuccess: {
        type: "modifyMonsterDamage";
        amountFrom: "destroyedTargetCurrentDamage";
        duration: "battle";
      };
    }
  | {
      type: "randomTarget";
      scope: "enemyMonsters";
      onSuccess: { type: "destroyMonster"; target: "random" };
    }
  | {
      type: "randomTarget";
      scope: "otherMonstersControlledBySelectedTargetOwner";
      onSuccess: { type: "dealDamage"; amount: number; element: ElementType };
    }
  | {
      type: "registerTrigger";
      event: "supportedRingKilledMonster";
      effect: PersistentRingTriggerEffect;
    }
  | {
      type: "conditionalPierceForAction";
      target: "selectedEnemyMonster";
      source: "ringAndGemDamage";
    }
  | {
      type: "ifTargetSurvives";
      effect: { type: "modifyMonsterDamage"; amount: number; duration: "battle" };
    }
  | {
      type: "registerActionScopedTrigger";
      event: "selectedMonsterDestroyedDuringCurrentRingAction";
      effect: {
        type: "dealDamageToControllingHero";
        amountFrom: "destroyedMonsterCurrentDamage";
        element: ElementType;
      };
    }
  | { type: "destroyMonster"; target: "selected" }
  | { type: "destroyAllMonsters"; scope: "allMonsters" }
  | { type: "captureStat"; source: "selected"; stat: "currentDamage" }
  | {
      type: "copyMonster";
      source: "selected";
      copyMode: "currentCombatStats";
      initialCooldown: 1;
      copyStatuses: false;
    }
  | {
      type: "transformMonster";
      target: "selected";
      result: {
        element: ElementType;
        damage: number;
        maxHealth: number;
        currentHealth: number;
        baseCooldown: number;
        currentCooldown: number;
        skill: null;
      };
    }
  | {
      type: "createTemporaryMonsterCopy";
      source: "selected";
      copyDamage: true;
      copyElement: true;
      maxHealth: number;
      skill: null;
      initialCooldown: 0;
      expires: "endOfCurrentTurn";
    };

export type SpellDefinition = {
  id: string;
  nameKey: string;
  element: ElementType;
  rarity: Rarity;
  baseSpeed?: number;
  baseEnergyPenalty: number;
  baseCooldownPenalty: number;
  targeting?: SpellTargeting;
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
  triggers?: RingBattleTrigger[];
};

export type RingBattleTrigger = {
  event: "supportedRingKilledMonster";
  source: TemporaryStatusSource;
  effect: PersistentRingTriggerEffect;
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
  grantedSkills?: GrantedMonsterSkill[];
  shieldActive: boolean;
  shields?: ShieldInstance[];
  rageActive: boolean;
  statuses?: TemporaryMonsterStatus[];
  temporary?: {
    source: TemporaryStatusSource;
    expires: "endOfCurrentTurn";
  };
};

export type GrantedMonsterSkill = {
  skill: Exclude<MonsterSkill, "haste">;
  source: TemporaryStatusSource;
};

export type ShieldInstance = {
  source: { kind: "natural" } | ({ kind: "grantedSkill" | "temporary" } & TemporaryStatusSource);
  expires?: "startOfOwnerNextTurn";
};

export type TemporaryStatusSource = {
  playerId: string;
  spellId: string;
  gemId: string;
};

export type TemporaryMonsterStatus =
  | {
      type: "burn";
      source: TemporaryStatusSource;
      remainingOwnerTurns: number;
      damage: number;
      element: "fire";
    }
  | {
      type: "shock" | "freeze";
      source: TemporaryStatusSource;
      remainingOwnerTurns: number;
      expiresAfterCurrentOwnerTurn?: boolean;
    }
  | {
      type: "lastBreath";
      source: TemporaryStatusSource;
      expires: "endOfCurrentTurn";
      triggered?: boolean;
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
  | { type: "spellCast"; spellId: string; sourceGemId: string; targetId?: TargetId }
  | {
      type: "statusApplied";
      monsterInstanceId: string;
      status: TemporaryMonsterStatus["type"];
      sourceSpellId: string;
      remainingOwnerTurns?: number;
      expires?: "endOfCurrentTurn";
    }
  | {
      type: "statusRemoved";
      monsterInstanceId: string;
      status: TemporaryMonsterStatus["type"];
      reason: "cleansed" | "expired";
    }
  | { type: "monsterSummoned"; playerId: string; monsterInstanceId: string; monsterId: string }
  | { type: "monsterUsed"; playerId: string; monsterInstanceId: string; targetId: TargetId }
  | { type: "shieldBroken"; monsterInstanceId: string; sourceId: string }
  | {
      type: "skillGranted";
      monsterInstanceId: string;
      skill: Exclude<MonsterSkill, "haste">;
      sourceSpellId: string;
    }
  | {
      type: "shieldGranted";
      monsterInstanceId: string;
      sourceSpellId: string;
      temporary: boolean;
    }
  | { type: "shieldExpired"; monsterInstanceId: string }
  | { type: "randomTargetSelected"; sourceSpellId: string; targetId: string }
  | {
      type: "triggerRegistered";
      sourceSpellId: string;
      ringInstanceId: string;
      event: RingBattleTrigger["event"] | "selectedMonsterDestroyedDuringCurrentRingAction";
    }
  | {
      type: "triggerActivated";
      sourceSpellId: string;
      sourceId: string;
      targetId?: string;
    }
  | { type: "ringDamageChanged"; ringInstanceId: string; from: number; to: number }
  | { type: "monsterDamageChanged"; monsterInstanceId: string; from: number; to: number }
  | { type: "energyRestored"; playerId: string; amount: number; current: number }
  | {
      type: "actionPierceOverflow";
      sourceSpellId: string;
      targetMonsterInstanceId: string;
      targetHeroId: TargetId;
      amount: number;
    }
  | {
      type: "lastBreathTriggered";
      monsterInstanceId: string;
      targetId?: TargetId;
    }
  | {
      type: "monsterCopied";
      sourceMonsterInstanceId: string;
      monsterInstanceId: string;
      playerId: string;
      temporary: boolean;
    }
  | { type: "monsterTransformed"; monsterInstanceId: string; sourceSpellId: string }
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
  randomCursor?: number;
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
