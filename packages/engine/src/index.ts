export * from "./types";

import type {
  BattleAction,
  BattleActionResult,
  BattleEvent,
  BattleRecord,
  BattleRecordVersions,
  BattleResult,
  BattleSetup,
  BattleState,
  BattlePlayer,
  ElementType,
  FirstPlayerChoiceReason,
  MonsterCombatInstance,
  TargetId,
} from "./types";

export const rulesVersion = "prototype-1";

export function createBattleState(setup: BattleSetup): BattleState {
  assertValidBattleSetup(setup);

  const state: BattleState = {
    ...structuredClone(setup),
    initialSetup: structuredClone(setup),
    actionHistory: [],
    firstPlayerChoices: structuredClone(setup.firstPlayerChoices ?? {}),
    log: [{ type: "battleStarted", battleId: setup.id }],
    result: null,
  };

  state.log.push(...initializeBattleStart(state));

  return state;
}

export function applyBattleAction(state: BattleState, action: BattleAction): BattleActionResult {
  if (state.status === "finished") {
    throw new Error("Cannot apply an action to a finished battle.");
  }

  const next = structuredClone(state);
  const events: BattleEvent[] = [];

  switch (action.type) {
    case "chooseElement":
      events.push(...chooseElement(next, action));
      break;
    case "useRing":
      events.push(...useRing(next, action));
      finishBattleIfNeeded(next, events);
      break;
    case "useMonster":
      events.push(...useMonster(next, action));
      finishBattleIfNeeded(next, events);
      break;
    case "endTurn":
      events.push(...endTurn(next, action.playerId));
      break;
    case "concede":
      events.push(...concede(next, action.playerId));
      break;
  }

  next.log.push(...events);
  next.actionHistory.push(structuredClone(action));

  return { state: next, events };
}

export function createBattleRecord(
  state: BattleState,
  versions: BattleRecordVersions,
): BattleRecord {
  if (!versions.rulesVersion || !versions.contentVersion) {
    throw new Error("Battle record rulesVersion and contentVersion are required.");
  }

  return {
    format: "battlenessBattleRecord",
    formatVersion: 1,
    rulesVersion: versions.rulesVersion,
    contentVersion: versions.contentVersion,
    setup: structuredClone(state.initialSetup),
    actions: structuredClone(state.actionHistory),
    result: structuredClone(state.result),
    finalStateChecksum: createBattleStateChecksum(state),
  };
}

export function serializeBattleRecord(record: BattleRecord): string {
  assertValidBattleRecord(record);
  return JSON.stringify(record, null, 2);
}

export function parseBattleRecord(serializedRecord: string): BattleRecord {
  let parsedRecord: unknown;

  try {
    parsedRecord = JSON.parse(serializedRecord);
  } catch {
    throw new Error("Battle record is not valid JSON.");
  }

  assertValidBattleRecord(parsedRecord);
  return structuredClone(parsedRecord);
}

export function replayBattleRecord(record: BattleRecord): BattleState {
  assertValidBattleRecord(record);

  let state = createBattleState(record.setup);
  for (const action of record.actions) {
    state = applyBattleAction(state, action).state;
  }

  assertBattleRecordResult(record, state);
  assertBattleRecordState(record, state);
  return state;
}

export function assertBattleRecordResult(record: BattleRecord, state: BattleState): void {
  const expectedResult = JSON.stringify(record.result);
  const actualResult = JSON.stringify(state.result);
  if (expectedResult !== actualResult) {
    throw new Error(
      `Battle record result mismatch: expected ${expectedResult}, received ${actualResult}.`,
    );
  }
}

export function assertBattleRecordState(record: BattleRecord, state: BattleState): void {
  const checksum = createBattleStateChecksum(state);
  if (record.finalStateChecksum !== checksum) {
    throw new Error(
      `Battle record state mismatch: expected ${record.finalStateChecksum}, received ${checksum}.`,
    );
  }
}

export function createBattleStateChecksum(state: BattleState): string {
  const serializedState = canonicalJson(state);
  let hash = 0x811c9dc5;

  for (let index = 0; index < serializedState.length; index += 1) {
    hash ^= serializedState.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193);
  }

  return `fnv1a32:${(hash >>> 0).toString(16).padStart(8, "0")}`;
}

export function assertValidBattleRecord(record: unknown): asserts record is BattleRecord {
  if (!isRecord(record)) {
    throw new Error("Battle record must be an object.");
  }

  if (record.format !== "battlenessBattleRecord" || record.formatVersion !== 1) {
    throw new Error("Battle record format or version is not supported.");
  }

  if (!isNonEmptyString(record.rulesVersion) || !isNonEmptyString(record.contentVersion)) {
    throw new Error("Battle record rulesVersion and contentVersion are required.");
  }
  if (!isNonEmptyString(record.finalStateChecksum)) {
    throw new Error("Battle record finalStateChecksum is required.");
  }

  if (!isRecord(record.setup)) {
    throw new Error("Battle record setup is required.");
  }
  if (!Array.isArray(record.setup.players)) {
    throw new Error("Battle record setup players must be an array.");
  }
  try {
    assertValidBattleSetup(record.setup as BattleSetup);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`Battle record setup is invalid: ${message}`);
  }

  if (!Array.isArray(record.actions)) {
    throw new Error("Battle record actions must be an array.");
  }
  for (const action of record.actions) {
    assertValidBattleAction(action);
  }

  assertValidBattleResult(record.result);
}

function assertValidBattleAction(action: unknown): asserts action is BattleAction {
  if (!isRecord(action) || !isNonEmptyString(action.type) || !isNonEmptyString(action.playerId)) {
    throw new Error("Battle record contains an invalid action.");
  }

  switch (action.type) {
    case "chooseElement":
      if (!isElementType(action.element)) {
        throw new Error("Battle record contains an invalid chooseElement action.");
      }
      return;
    case "useRing":
      if (!isNonEmptyString(action.ringInstanceId) || !isTargetId(action.targetId)) {
        throw new Error("Battle record contains an invalid useRing action.");
      }
      if (
        action.enchantmentTargets !== undefined &&
        (!isRecord(action.enchantmentTargets) ||
          !Object.values(action.enchantmentTargets).every(isTargetId))
      ) {
        throw new Error("Battle record contains invalid ring enchantment targets.");
      }
      return;
    case "useMonster":
      if (!isNonEmptyString(action.monsterInstanceId) || !isTargetId(action.targetId)) {
        throw new Error("Battle record contains an invalid useMonster action.");
      }
      return;
    case "endTurn":
    case "concede":
      return;
    default:
      throw new Error(`Battle record contains unsupported action ${action.type}.`);
  }
}

function assertValidBattleResult(result: unknown): asserts result is BattleResult | null {
  if (result === null) {
    return;
  }

  if (!isRecord(result) || !isNonEmptyString(result.type)) {
    throw new Error("Battle record result is invalid.");
  }

  if (result.type === "draw") {
    return;
  }

  if (
    result.type === "winner" &&
    isNonEmptyString(result.winnerId) &&
    isNonEmptyString(result.loserId)
  ) {
    return;
  }

  throw new Error("Battle record result is invalid.");
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.length > 0;
}

function isElementType(value: unknown): value is ElementType {
  return value === "electric" || value === "fire" || value === "ice";
}

function isTargetId(value: unknown): value is TargetId {
  return (
    isNonEmptyString(value) && (value.endsWith(".hero") || /^.+\.monster\..+\.\d+$/.test(value))
  );
}

function canonicalJson(value: unknown): string {
  if (value === null || typeof value !== "object") {
    return JSON.stringify(value);
  }

  if (Array.isArray(value)) {
    return `[${value.map(canonicalJson).join(",")}]`;
  }

  return `{${Object.entries(value)
    .filter(([, entryValue]) => entryValue !== undefined)
    .sort(([firstKey], [secondKey]) => (firstKey < secondKey ? -1 : firstKey > secondKey ? 1 : 0))
    .map(([key, entryValue]) => `${JSON.stringify(key)}:${canonicalJson(entryValue)}`)
    .join(",")}}`;
}

export function assertValidBattleSetup(setup: BattleSetup): void {
  if (setup.players.length !== 2) {
    throw new Error("BattleSetup must include exactly two players.");
  }

  const playerIds = new Set(setup.players.map((player) => player.id));
  if (playerIds.size !== 2) {
    throw new Error("BattleSetup players must have distinct IDs.");
  }

  if (setup.activePlayerId !== null && !playerIds.has(setup.activePlayerId)) {
    throw new Error("BattleSetup activePlayerId must reference one of the players.");
  }

  if (setup.startingPlayerId !== null && !playerIds.has(setup.startingPlayerId)) {
    throw new Error("BattleSetup startingPlayerId must reference one of the players.");
  }

  for (const playerId of Object.keys(setup.firstPlayerChoices ?? {})) {
    if (!playerIds.has(playerId)) {
      throw new Error("BattleSetup firstPlayerChoices must reference setup players.");
    }
  }

  for (const player of setup.players) {
    for (const ring of player.rings) {
      if (ring.ownerId !== player.id) {
        throw new Error(`Ring ${ring.id} ownerId does not match player ${player.id}.`);
      }

      if (ring.cooldown < 1) {
        throw new Error(`Ring ${ring.id} cooldown must be at least 1.`);
      }

      if (ring.gems.length > 3) {
        throw new Error(`Ring ${ring.id} has more than 3 socketed gems.`);
      }

      for (const gem of ring.gems) {
        if (gem.ownerId !== player.id) {
          throw new Error(`Gem ${gem.id} ownerId does not match player ${player.id}.`);
        }
      }
    }

    if (player.monsters.length > 3) {
      throw new Error(`Player ${player.id} controls more than 3 monsters.`);
    }

    for (const monster of player.monsters) {
      if (monster.ownerId !== player.id) {
        throw new Error(`Monster ${monster.id} ownerId does not match player ${player.id}.`);
      }

      if (monster.cooldown < 1) {
        throw new Error(`Monster ${monster.id} cooldown must be at least 1.`);
      }
    }
  }
}

function initializeBattleStart(state: BattleState): BattleEvent[] {
  const resolved = resolveStartingPlayerByStats(state.players);
  if (resolved) {
    return startBattleForPlayer(state, resolved.player.id, resolved.reason);
  }

  resetTurnEnergy(state);
  state.status = "choosingFirstPlayer";
  state.activePlayerId = null;
  state.startingPlayerId = null;
  state.firstPlayerChoices = {};

  return [
    {
      type: "firstPlayerChoiceRequested",
      playerIds: [state.players[0].id, state.players[1].id],
      reason: "speedAndLevelTie",
    },
  ];
}

function resolveStartingPlayerByStats(
  players: [BattlePlayer, BattlePlayer],
): { player: BattlePlayer; reason: Exclude<FirstPlayerChoiceReason, "elementDuel"> } | null {
  const [first, second] = players;
  if (first.hero.speed !== second.hero.speed) {
    return {
      player: first.hero.speed > second.hero.speed ? first : second,
      reason: "speed",
    };
  }

  if (first.level !== second.level) {
    return {
      player: first.level < second.level ? first : second,
      reason: "level",
    };
  }

  return null;
}

function startBattleForPlayer(
  state: BattleState,
  playerId: string,
  reason: FirstPlayerChoiceReason,
): BattleEvent[] {
  resetTurnEnergy(state);

  const startingPlayer = getPlayer(state, playerId);
  startingPlayer.energy.turnCount = 1;
  startingPlayer.energy.maxForTurn = 1;
  startingPlayer.energy.current = 1;

  state.status = "active";
  state.activePlayerId = startingPlayer.id;
  state.startingPlayerId = startingPlayer.id;
  state.firstPlayerChoices = {};

  return [
    {
      type: "firstPlayerChosen",
      playerId: startingPlayer.id,
      reason,
    },
    {
      type: "turnStarted",
      playerId: startingPlayer.id,
      turnCount: startingPlayer.energy.turnCount,
      energy: startingPlayer.energy.current,
    },
  ];
}

function resetTurnEnergy(state: BattleState): void {
  for (const player of state.players) {
    player.energy.current = 0;
    player.energy.maxForTurn = 0;
    player.energy.turnCount = 0;
  }
}

function chooseElement(
  state: BattleState,
  action: Extract<BattleAction, { type: "chooseElement" }>,
): BattleEvent[] {
  if (state.status !== "choosingFirstPlayer") {
    throw new Error("Element choices can only be made while choosing the first player.");
  }

  const player = getPlayer(state, action.playerId);
  state.firstPlayerChoices ??= {};

  if (state.firstPlayerChoices[player.id]) {
    throw new Error(`Player ${player.id} already chose an element for this duel.`);
  }

  state.firstPlayerChoices[player.id] = action.element;

  const events: BattleEvent[] = [
    {
      type: "elementChosen",
      playerId: player.id,
      element: action.element,
    },
  ];

  const [first, second] = state.players;
  const firstChoice = state.firstPlayerChoices[first.id];
  const secondChoice = state.firstPlayerChoices[second.id];

  if (!firstChoice || !secondChoice) {
    return events;
  }

  if (firstChoice === secondChoice) {
    state.firstPlayerChoices = {};
    events.push({ type: "elementDuelTied", element: firstChoice });
    return events;
  }

  const winnerId = hasElementalAdvantage(firstChoice, secondChoice) ? first.id : second.id;
  events.push(...startBattleForPlayer(state, winnerId, "elementDuel"));

  return events;
}

function useRing(
  state: BattleState,
  action: Extract<BattleAction, { type: "useRing" }>,
): BattleEvent[] {
  const player = requireActivePlayer(state, action.playerId);
  const ring = player.rings.find((candidate) => candidate.id === action.ringInstanceId);
  if (!ring) {
    throw new Error(`Ring ${action.ringInstanceId} was not found for player ${player.id}.`);
  }

  if (ring.currentCooldown > 0) {
    throw new Error(`Ring ${ring.id} is on cooldown.`);
  }

  if (player.energy.current < ring.energyCost) {
    throw new Error(`Player ${player.id} does not have enough energy to use ring ${ring.id}.`);
  }

  requireValidTarget(state, player.id, action.targetId);
  assertTauntAllowsTarget(state, player.id, action.targetId);

  player.energy.current -= ring.energyCost;
  ring.currentCooldown = ring.cooldown;

  const events: BattleEvent[] = [
    {
      type: "ringUsed",
      playerId: player.id,
      ringInstanceId: ring.id,
      targetId: action.targetId,
    },
    {
      type: "energySpent",
      playerId: player.id,
      amount: ring.energyCost,
      remaining: player.energy.current,
    },
  ];

  const ringDamage = ring.damage + ring.gems.reduce((sum, gem) => sum + gem.damage, 0);
  events.push(
    ...applyDamage(state, player.id, ring.id, action.targetId, ringDamage, ring.element, {
      blockFirstTurnHeroDamage: true,
    }),
  );

  for (const gem of ring.gems) {
    if (!gem.enchantment) {
      continue;
    }

    if (gem.enchantment.type === "monster") {
      events.push(
        ...summonMonster(
          state,
          player,
          gem.enchantment.monsterId,
          gem.enchantment.resolvedDefinitionId,
        ),
      );
      continue;
    }

    const spellDefinitionId = gem.enchantment.resolvedDefinitionId ?? gem.enchantment.spellId;
    const spell = state.definitions.spells[spellDefinitionId];
    if (!spell) {
      throw new Error(`Spell definition ${spellDefinitionId} was not found.`);
    }

    const spellTarget = action.enchantmentTargets?.[gem.id] ?? action.targetId;
    requireValidTarget(state, player.id, spellTarget);
    assertTauntAllowsTarget(state, player.id, spellTarget);

    events.push({
      type: "spellCast",
      spellId: gem.enchantment.spellId,
      sourceGemId: gem.id,
      targetId: spellTarget,
    });

    for (const effect of spell.effects) {
      if (effect.type === "dealDamage") {
        events.push(
          ...applyDamage(
            state,
            player.id,
            gem.enchantment.spellId,
            spellTarget,
            effect.amount,
            spell.element,
            {
              blockFirstTurnHeroDamage: true,
            },
          ),
        );
      }
    }
  }

  return events;
}

function useMonster(
  state: BattleState,
  action: Extract<BattleAction, { type: "useMonster" }>,
): BattleEvent[] {
  const player = requireActivePlayer(state, action.playerId);
  const monster = player.monsters.find((candidate) => candidate.id === action.monsterInstanceId);
  if (!monster) {
    throw new Error(`Monster ${action.monsterInstanceId} was not found for player ${player.id}.`);
  }

  if (monster.currentCooldown > 0) {
    throw new Error(`Monster ${monster.id} is on cooldown.`);
  }

  requireValidTarget(state, player.id, action.targetId);
  assertTauntAllowsTarget(state, player.id, action.targetId);

  monster.currentCooldown = monster.cooldown;

  const events: BattleEvent[] = [
    {
      type: "monsterUsed",
      playerId: player.id,
      monsterInstanceId: monster.id,
      targetId: action.targetId,
    },
  ];
  const target = getTarget(state, action.targetId);

  if (monster.skill === "multiHit" && target?.kind === "monster") {
    const targetIds = target.player.monsters.map((candidate) => candidate.id as TargetId);
    events.push({
      type: "multiHitResolved",
      monsterInstanceId: monster.id,
      targetIds,
    });

    for (const targetId of targetIds) {
      events.push(
        ...applyDamage(state, player.id, monster.id, targetId, monster.damage, monster.element, {
          blockFirstTurnHeroDamage: true,
        }),
      );
    }

    return events;
  }

  events.push(
    ...applyDamage(state, player.id, monster.id, action.targetId, monster.damage, monster.element, {
      blockFirstTurnHeroDamage: true,
      pierceMonsterInstanceId: monster.skill === "pierce" ? monster.id : undefined,
    }),
  );

  return events;
}

function endTurn(state: BattleState, playerId: string): BattleEvent[] {
  const player = requireActivePlayer(state, playerId);
  const opponent = getOpponent(state, player.id);
  const events: BattleEvent[] = [{ type: "turnEnded", playerId: player.id }];

  state.activePlayerId = opponent.id;
  opponent.energy.turnCount += 1;
  opponent.energy.maxForTurn = Math.min(8, opponent.energy.turnCount);
  opponent.energy.current = opponent.energy.maxForTurn;

  for (const ring of opponent.rings) {
    events.push(...decrementCooldown(ring.id, ring));
  }

  for (const monster of opponent.monsters) {
    events.push(...decrementCooldown(monster.id, monster));
  }

  events.push({
    type: "turnStarted",
    playerId: opponent.id,
    turnCount: opponent.energy.turnCount,
    energy: opponent.energy.current,
  });

  return events;
}

function concede(state: BattleState, playerId: string): BattleEvent[] {
  const player = getPlayer(state, playerId);
  const opponent = getOpponent(state, player.id);
  const result = { type: "winner" as const, winnerId: opponent.id, loserId: player.id };

  state.status = "finished";
  state.result = result;

  return [{ type: "battleEnded", result }];
}

function summonMonster(
  state: BattleState,
  player: BattlePlayer,
  monsterId: string,
  resolvedDefinitionId = monsterId,
): BattleEvent[] {
  if (player.monsters.length >= 3) {
    return [];
  }

  const definition = state.definitions.monsters[resolvedDefinitionId];
  if (!definition) {
    throw new Error(`Monster definition ${resolvedDefinitionId} was not found.`);
  }

  const instanceNumber =
    player.monsters.filter((monster) => monster.definitionId === monsterId).length + 1;
  const monsterInstance: MonsterCombatInstance = {
    id: `${player.id}.monster.${monsterId}.${instanceNumber}`,
    definitionId: monsterId,
    ownerId: player.id,
    nameKey: definition.nameKey,
    element: definition.element,
    health: definition.baseHealth,
    maxHealth: definition.baseHealth,
    baseDamage: definition.baseDamage,
    damage: definition.baseDamage,
    cooldown: definition.baseCooldown,
    currentCooldown: definition.skill === "haste" ? 0 : 1,
    speed: definition.baseSpeed,
    skill: definition.skill,
    shieldActive: definition.skill === "shield",
    rageActive: false,
  };

  player.monsters.push(monsterInstance);

  const events: BattleEvent[] = [
    {
      type: "monsterSummoned",
      playerId: player.id,
      monsterInstanceId: monsterInstance.id,
      monsterId,
    },
  ];

  if (definition.skill === "haste") {
    events.push({
      type: "hasteActivated",
      monsterInstanceId: monsterInstance.id,
    });
  }

  return events;
}

function applyDamage(
  state: BattleState,
  sourcePlayerId: string,
  sourceId: string,
  targetId: TargetId,
  baseAmount: number,
  element: ElementType,
  options: {
    blockFirstTurnHeroDamage: boolean;
    pierceMonsterInstanceId?: string;
  },
): BattleEvent[] {
  const target = getTarget(state, targetId);
  if (!target) {
    return [];
  }

  if (
    options.blockFirstTurnHeroDamage &&
    target.kind === "hero" &&
    isFirstTurnHeroDamageBlocked(state, sourcePlayerId, target.player.id)
  ) {
    return [];
  }

  const amount =
    target.kind === "monster" && hasElementalAdvantage(element, target.monster.element)
      ? Math.floor(baseAmount * 1.1)
      : baseAmount;

  if (amount <= 0) {
    return [];
  }

  if (target.kind === "hero") {
    const appliedAmount = Math.min(amount, target.player.hero.health);
    if (appliedAmount <= 0) {
      return [];
    }

    target.player.hero.health -= appliedAmount;
    return [
      {
        type: "damageDealt",
        sourceId,
        targetId,
        amount: appliedAmount,
        element,
      },
    ];
  }

  if (target.monster.shieldActive) {
    target.monster.shieldActive = false;
    return [
      {
        type: "shieldBroken",
        monsterInstanceId: target.monster.id,
        sourceId,
      },
    ];
  }

  const appliedAmount = Math.min(amount, target.monster.health);
  const overflowAmount = amount - appliedAmount;
  target.monster.health -= appliedAmount;

  const events: BattleEvent[] = [
    {
      type: "damageDealt",
      sourceId,
      targetId,
      amount: appliedAmount,
      element,
    },
  ];

  if (options.pierceMonsterInstanceId && overflowAmount > 0) {
    const heroTargetId = `${target.player.id}.hero` as TargetId;
    const overflowEvents = applyDamage(
      state,
      sourcePlayerId,
      sourceId,
      heroTargetId,
      overflowAmount,
      element,
      { blockFirstTurnHeroDamage: options.blockFirstTurnHeroDamage },
    );

    const heroDamageEvent = overflowEvents.find((event) => event.type === "damageDealt");
    if (heroDamageEvent) {
      events.push({
        type: "pierceOverflow",
        monsterInstanceId: options.pierceMonsterInstanceId,
        targetMonsterInstanceId: target.monster.id,
        targetHeroId: heroTargetId,
        amount: heroDamageEvent.amount,
      });
      events.push(...overflowEvents);
    }
  }

  if (
    target.monster.health > 0 &&
    target.monster.skill === "rage" &&
    !target.monster.rageActive &&
    target.monster.health * 2 < target.monster.maxHealth
  ) {
    const previousDamage = target.monster.damage;
    target.monster.rageActive = true;
    target.monster.damage = Math.floor(target.monster.baseDamage * 1.2);
    events.push({
      type: "rageActivated",
      monsterInstanceId: target.monster.id,
      previousDamage,
      damage: target.monster.damage,
    });
  }

  if (target.monster.health === 0) {
    target.player.monsters = target.player.monsters.filter(
      (monster) => monster.id !== target.monster.id,
    );
    events.push({ type: "monsterDestroyed", monsterInstanceId: target.monster.id });
  }

  return events;
}

function isFirstTurnHeroDamageBlocked(
  state: BattleState,
  sourcePlayerId: string,
  targetPlayerId: string,
): boolean {
  return (
    targetPlayerId !== sourcePlayerId &&
    sourcePlayerId === state.startingPlayerId &&
    getPlayer(state, sourcePlayerId).energy.turnCount === 1
  );
}

function finishBattleIfNeeded(state: BattleState, events: BattleEvent[]): void {
  const defeatedPlayers = state.players.filter((player) => player.hero.health === 0);
  if (defeatedPlayers.length === 0) {
    return;
  }

  const result =
    defeatedPlayers.length === 2
      ? { type: "draw" as const }
      : {
          type: "winner" as const,
          winnerId: getOpponent(state, defeatedPlayers[0]!.id).id,
          loserId: defeatedPlayers[0]!.id,
        };

  state.status = "finished";
  state.result = result;
  events.push({ type: "battleEnded", result });
}

function decrementCooldown(targetId: string, target: { currentCooldown: number }): BattleEvent[] {
  if (target.currentCooldown === 0) {
    return [];
  }

  const from = target.currentCooldown;
  target.currentCooldown = Math.max(0, target.currentCooldown - 1);

  return [{ type: "cooldownChanged", targetId, from, to: target.currentCooldown }];
}

function requireActivePlayer(state: BattleState, playerId: string): BattlePlayer {
  if (state.activePlayerId !== playerId) {
    throw new Error(`Player ${playerId} is not the active player.`);
  }

  return getPlayer(state, playerId);
}

function getPlayer(state: BattleState, playerId: string): BattlePlayer {
  const player = state.players.find((candidate) => candidate.id === playerId);
  if (!player) {
    throw new Error(`Player ${playerId} was not found.`);
  }

  return player;
}

function getOpponent(state: BattleState, playerId: string): BattlePlayer {
  const opponent = state.players.find((candidate) => candidate.id !== playerId);
  if (!opponent) {
    throw new Error(`Opponent for player ${playerId} was not found.`);
  }

  return opponent;
}

function requireValidTarget(state: BattleState, sourcePlayerId: string, targetId: TargetId): void {
  if (!getTarget(state, targetId)) {
    throw new Error(`Target ${targetId} was not found for player ${sourcePlayerId}.`);
  }
}

function getTarget(
  state: BattleState,
  targetId: TargetId,
):
  | { kind: "hero"; player: BattlePlayer }
  | { kind: "monster"; player: BattlePlayer; monster: MonsterCombatInstance }
  | null {
  if (targetId.endsWith(".hero")) {
    const playerId = targetId.slice(0, -".hero".length);
    const player = state.players.find((candidate) => candidate.id === playerId);
    return player ? { kind: "hero", player } : null;
  }

  const [playerId, monsterPart] = targetId.split(".monster.");
  if (!playerId || !monsterPart) {
    return null;
  }

  const player = state.players.find((candidate) => candidate.id === playerId);
  const monster = player?.monsters.find((candidate) => candidate.id === targetId);
  return player && monster ? { kind: "monster", player, monster } : null;
}

function assertTauntAllowsTarget(
  state: BattleState,
  sourcePlayerId: string,
  targetId: TargetId,
): void {
  const target = getTarget(state, targetId);
  if (!target || target.player.id === sourcePlayerId) {
    return;
  }

  const tauntMonsters = target.player.monsters.filter(hasTaunt);
  if (tauntMonsters.length === 0) {
    return;
  }

  if (target.kind === "monster" && hasTaunt(target.monster)) {
    return;
  }

  throw new Error(`Target ${targetId} is protected by Taunt.`);
}

function hasTaunt(monster: MonsterCombatInstance): boolean {
  return monster.skill === "taunt";
}

function hasElementalAdvantage(attacker: ElementType, defender: ElementType): boolean {
  return (
    (attacker === "electric" && defender === "fire") ||
    (attacker === "fire" && defender === "ice") ||
    (attacker === "ice" && defender === "electric")
  );
}
