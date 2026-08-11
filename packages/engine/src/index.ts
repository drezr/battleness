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
  GemCombatInstance,
  MonsterCombatInstance,
  RingCombatInstance,
  SpellDefinition,
  SpellEffect,
  TargetId,
  TemporaryMonsterStatus,
} from "./types";

type RingActionResolutionContext = {
  ringInstanceId: string;
  actionPierces: Array<{ targetId: TargetId; sourceSpellId: string }>;
  funeralBrands: Array<{
    targetId: TargetId;
    sourcePlayerId: string;
    sourceSpellId: string;
    activated: boolean;
  }>;
  capturedCurrentDamage: Map<string, number>;
  destroyedTargetCurrentDamage: Map<string, number>;
  selectedTargetOwnerIds: Map<string, string>;
  destroyingMonsterIds: Set<string>;
};

export const rulesVersion = "production-spells-v1";

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
    case "resolveOpeningDuelTimeout":
      events.push(...resolveOpeningDuelTimeout(next, action.timedOutPlayerId));
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
  if (!isRecord(action) || !isNonEmptyString(action.type)) {
    throw new Error("Battle record contains an invalid action.");
  }

  if (action.type === "resolveOpeningDuelTimeout") {
    if (action.timedOutPlayerId !== null && !isNonEmptyString(action.timedOutPlayerId)) {
      throw new Error("Battle record contains an invalid opening duel timeout action.");
    }
    return;
  }
  if (!isNonEmptyString(action.playerId)) {
    throw new Error("Battle record contains an action without a playerId.");
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
    const tieCount = state.log.filter((event) => event.type === "elementDuelTied").length + 1;
    events.push({ type: "elementDuelTied", element: firstChoice });
    if (tieCount >= 3) {
      const winner = deterministicOpeningDuelWinner(state, tieCount);
      events.push({
        type: "elementDuelTiebreaker",
        playerId: winner.id,
        tieCount,
      });
      events.push(...startBattleForPlayer(state, winner.id, "elementDuelTiebreaker"));
      return events;
    }
    state.firstPlayerChoices = {};
    return events;
  }

  const winnerId = hasElementalAdvantage(firstChoice, secondChoice) ? first.id : second.id;
  events.push(...startBattleForPlayer(state, winnerId, "elementDuel"));

  return events;
}

function deterministicOpeningDuelWinner(state: BattleState, tieCount: number): BattlePlayer {
  const input = `${state.seed}:${state.id}:opening-duel:${tieCount}`;
  let hash = 0x811c9dc5;
  for (let index = 0; index < input.length; index += 1) {
    hash ^= input.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193);
  }
  return state.players[(hash >>> 0) % state.players.length]!;
}

function resolveOpeningDuelTimeout(
  state: BattleState,
  timedOutPlayerId: string | null,
): BattleEvent[] {
  if (state.status !== "choosingFirstPlayer") {
    throw new Error("Opening duel timeout can only resolve an unresolved element duel.");
  }

  const events: BattleEvent[] = [{ type: "openingDuelTimedOut", timedOutPlayerId }];
  if (timedOutPlayerId === null) {
    const result = { type: "draw" as const };
    state.status = "finished";
    state.result = result;
    events.push({ type: "battleEnded", result });
    return events;
  }

  const timedOutPlayer = getPlayer(state, timedOutPlayerId);
  const opponent = getOpponent(state, timedOutPlayer.id);
  if (state.firstPlayerChoices?.[timedOutPlayer.id]) {
    throw new Error("The timed-out opening duel player already submitted a choice.");
  }
  if (!state.firstPlayerChoices?.[opponent.id]) {
    throw new Error("A single-player opening duel timeout requires the opponent's choice.");
  }

  events.push(...concede(state, timedOutPlayer.id));
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

  for (const gem of ring.gems) {
    if (gem.enchantment?.type !== "spell") {
      continue;
    }
    const spell = getSpellDefinition(state, gem);
    const spellTarget = resolveSpellTarget(action, gem, spell);
    validateSpellTarget(state, player.id, spell, spellTarget);
  }

  player.energy.current -= ring.energyCost;
  ring.currentCooldown = ring.cooldown;

  const actionContext = prepareRingActionContext(state, player, ring, action);

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
  events.push(...actionContext.events);
  const ringTarget = getTarget(state, action.targetId);
  const ringTargetMonsterId = ringTarget?.kind === "monster" ? ringTarget.monster.id : undefined;
  events.push(
    ...applyDamage(state, player.id, ring.id, action.targetId, ringDamage, ring.element, {
      blockFirstTurnHeroDamage: true,
      isRingAndGemDamage: true,
      actionContext: actionContext.context,
    }),
  );
  if (ringTargetMonsterId && !getTarget(state, ringTargetMonsterId as TargetId)) {
    events.push(...settleSupportedRingKillTriggers(player, ring, ringTargetMonsterId));
  }

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

    const spell = getSpellDefinition(state, gem);
    const spellTarget = resolveSpellTarget(action, gem, spell);
    const preparedForAction = spell.effects.some(
      (effect) =>
        effect.type === "conditionalPierceForAction" ||
        effect.type === "registerActionScopedTrigger",
    );
    if (spellTarget && !getTarget(state, spellTarget) && !preparedForAction) {
      continue;
    }

    events.push({
      type: "spellCast",
      spellId: gem.enchantment.spellId,
      sourceGemId: gem.id,
      ...(spellTarget ? { targetId: spellTarget } : {}),
    });

    for (const effect of spell.effects) {
      events.push(
        ...resolveSpellEffect(
          state,
          player,
          ring,
          gem,
          spell,
          effect,
          spellTarget,
          actionContext.context,
        ),
      );
    }
  }

  return events;
}

function prepareRingActionContext(
  state: BattleState,
  player: BattlePlayer,
  ring: RingCombatInstance,
  action: Extract<BattleAction, { type: "useRing" }>,
): { context: RingActionResolutionContext; events: BattleEvent[] } {
  const context: RingActionResolutionContext = {
    ringInstanceId: ring.id,
    actionPierces: [],
    funeralBrands: [],
    capturedCurrentDamage: new Map(),
    destroyedTargetCurrentDamage: new Map(),
    selectedTargetOwnerIds: new Map(),
    destroyingMonsterIds: new Set(),
  };
  const events: BattleEvent[] = [];

  for (const gem of ring.gems) {
    if (gem.enchantment?.type !== "spell") {
      continue;
    }
    const spell = getSpellDefinition(state, gem);
    const targetId = resolveSpellTarget(action, gem, spell);
    if (!targetId) {
      continue;
    }
    const selectedTarget = getTarget(state, targetId);
    if (selectedTarget?.kind === "monster") {
      context.selectedTargetOwnerIds.set(gem.id, selectedTarget.player.id);
    }
    for (const effect of spell.effects) {
      if (effect.type === "conditionalPierceForAction") {
        context.actionPierces.push({ targetId, sourceSpellId: gem.enchantment.spellId });
      }
      if (effect.type === "registerActionScopedTrigger") {
        context.funeralBrands.push({
          targetId,
          sourcePlayerId: player.id,
          sourceSpellId: gem.enchantment.spellId,
          activated: false,
        });
        events.push({
          type: "triggerRegistered",
          sourceSpellId: gem.enchantment.spellId,
          ringInstanceId: ring.id,
          event: effect.event,
        });
      }
    }
  }

  return { context, events };
}

function settleSupportedRingKillTriggers(
  player: BattlePlayer,
  ring: RingCombatInstance,
  destroyedMonsterId: string,
): BattleEvent[] {
  const events: BattleEvent[] = [];
  for (const trigger of ring.triggers ?? []) {
    events.push({
      type: "triggerActivated",
      sourceSpellId: trigger.source.spellId,
      sourceId: ring.id,
      targetId: destroyedMonsterId,
    });
    switch (trigger.effect.type) {
      case "modifySupportedRingDamage": {
        const from = ring.damage;
        ring.damage += trigger.effect.amount;
        events.push({ type: "ringDamageChanged", ringInstanceId: ring.id, from, to: ring.damage });
        break;
      }
      case "restoreCurrentTurnEnergy": {
        const from = player.energy.current;
        player.energy.current = Math.min(
          player.energy.maxForTurn,
          player.energy.current + trigger.effect.amount,
        );
        const amount = player.energy.current - from;
        if (amount > 0) {
          events.push({
            type: "energyRestored",
            playerId: player.id,
            amount,
            current: player.energy.current,
          });
        }
        break;
      }
      case "modifySupportedRingCurrentCooldown":
        events.push(
          ...setCurrentCooldown(
            ring.id,
            ring,
            Math.max(trigger.effect.minimum, ring.currentCooldown + trigger.effect.amount),
          ),
        );
        break;
    }
  }
  return events;
}

function getSpellDefinition(state: BattleState, gem: GemCombatInstance): SpellDefinition {
  if (gem.enchantment?.type !== "spell") {
    throw new Error(`Gem ${gem.id} does not contain a spell enchantment.`);
  }

  const spellDefinitionId = gem.enchantment.resolvedDefinitionId ?? gem.enchantment.spellId;
  const spell = state.definitions.spells[spellDefinitionId];
  if (!spell) {
    throw new Error(`Spell definition ${spellDefinitionId} was not found.`);
  }
  return spell;
}

function resolveSpellTarget(
  action: Extract<BattleAction, { type: "useRing" }>,
  gem: GemCombatInstance,
  spell: SpellDefinition,
): TargetId | undefined {
  if (spell.targeting?.selection === "none") {
    return undefined;
  }
  return action.enchantmentTargets?.[gem.id] ?? action.targetId;
}

function validateSpellTarget(
  state: BattleState,
  sourcePlayerId: string,
  spell: SpellDefinition,
  targetId: TargetId | undefined,
): void {
  if (spell.targeting?.selection === "none") {
    return;
  }
  if (!targetId) {
    throw new Error(`Spell ${spell.id} requires a target.`);
  }

  requireValidTarget(state, sourcePlayerId, targetId);
  const target = getTarget(state, targetId)!;
  const allowedTargets = spell.targeting?.allowedTargets ?? ["anyCombatant"];
  const allowed = allowedTargets.some((allowedTarget) => {
    switch (allowedTarget) {
      case "anyCombatant":
        return true;
      case "anyMonster":
        return target.kind === "monster";
      case "alliedMonster":
        return target.kind === "monster" && target.player.id === sourcePlayerId;
      case "enemyMonster":
        return target.kind === "monster" && target.player.id !== sourcePlayerId;
    }
  });
  if (!allowed) {
    throw new Error(`Target ${targetId} is not legal for spell ${spell.id}.`);
  }

  if (spell.effects.some((effect) => effect.type === "dealDamage")) {
    assertTauntAllowsTarget(state, sourcePlayerId, targetId);
  }
}

function resolveSpellEffect(
  state: BattleState,
  player: BattlePlayer,
  ring: RingCombatInstance,
  gem: GemCombatInstance,
  spell: SpellDefinition,
  effect: SpellEffect,
  selectedTargetId: TargetId | undefined,
  actionContext: RingActionResolutionContext,
): BattleEvent[] {
  const spellSourceId = gem.enchantment?.type === "spell" ? gem.enchantment.spellId : spell.id;
  switch (effect.type) {
    case "dealDamage":
      return selectedTargetId
        ? applyDamage(
            state,
            player.id,
            spellSourceId,
            selectedTargetId,
            effect.amount,
            effect.element ?? spell.element,
            { blockFirstTurnHeroDamage: true, actionContext },
          )
        : [];
    case "applyStatus":
      return selectedTargetId
        ? applyTemporaryStatus(state, selectedTargetId, player.id, spellSourceId, gem.id, effect)
        : [];
    case "forEachMonster": {
      const targetIds = state.players.flatMap((candidate) =>
        candidate.monsters.map((monster) => monster.id as TargetId),
      );
      return targetIds.flatMap((targetId) =>
        getTarget(state, targetId)
          ? applyTemporaryStatus(state, targetId, player.id, spellSourceId, gem.id, effect.effect)
          : [],
      );
    }
    case "dealDamageToAll": {
      const opponent = getOpponent(state, player.id);
      const targetIds = opponent.monsters.map((monster) => monster.id as TargetId);
      const amount = effect.amount ?? actionContext.capturedCurrentDamage.get(gem.id) ?? 0;
      return targetIds.flatMap((targetId) =>
        applyDamage(state, player.id, spellSourceId, targetId, amount, effect.element, {
          blockFirstTurnHeroDamage: true,
          actionContext,
        }),
      );
    }
    case "modifyCurrentCooldown": {
      if (!selectedTargetId) {
        return [];
      }
      const target = getTarget(state, selectedTargetId);
      if (target?.kind !== "monster") {
        return [];
      }
      const from = target.monster.currentCooldown;
      target.monster.currentCooldown = Math.min(
        target.monster.cooldown,
        Math.max(0, target.monster.currentCooldown + effect.amount),
      );
      return from === target.monster.currentCooldown
        ? []
        : [
            {
              type: "cooldownChanged",
              targetId: target.monster.id,
              from,
              to: target.monster.currentCooldown,
            },
          ];
    }
    case "removeStatuses": {
      if (!selectedTargetId) {
        return [];
      }
      const target = getTarget(state, selectedTargetId);
      if (target?.kind !== "monster") {
        return [];
      }
      const statuses = target.monster.statuses ?? [];
      target.monster.statuses = [];
      const shields = getActiveShields(target.monster);
      const temporaryShields = shields.filter((shield) => shield.source.kind === "temporary");
      target.monster.shields = shields.filter((shield) => shield.source.kind !== "temporary");
      syncShieldActive(target.monster);
      return [
        ...statuses.map((status) => ({
          type: "statusRemoved" as const,
          monsterInstanceId: target.monster.id,
          status: status.type,
          reason: "cleansed" as const,
        })),
        ...temporaryShields.map(() => ({
          type: "shieldExpired" as const,
          monsterInstanceId: target.monster.id,
        })),
      ];
    }
    case "grantSkill": {
      if (!selectedTargetId) {
        return [];
      }
      const target = getTarget(state, selectedTargetId);
      if (target?.kind !== "monster" || hasMonsterSkill(target.monster, effect.skill)) {
        return [];
      }
      const source = { playerId: player.id, spellId: spellSourceId, gemId: gem.id };
      (target.monster.grantedSkills ??= []).push({ skill: effect.skill, source });
      const events: BattleEvent[] = [
        {
          type: "skillGranted",
          monsterInstanceId: target.monster.id,
          skill: effect.skill,
          sourceSpellId: spellSourceId,
        },
      ];
      if (effect.skill === "shield" && effect.activateImmediately) {
        const shields = getActiveShields(target.monster);
        shields.push({ source: { kind: "grantedSkill", ...source } });
        target.monster.shields = shields;
        syncShieldActive(target.monster);
        events.push({
          type: "shieldGranted",
          monsterInstanceId: target.monster.id,
          sourceSpellId: spellSourceId,
          temporary: false,
        });
      }
      events.push(...activateRageIfEligible(target.monster));
      return events;
    }
    case "grantTemporaryShield": {
      if (!selectedTargetId) {
        return [];
      }
      const target = getTarget(state, selectedTargetId);
      if (target?.kind !== "monster" || getActiveShields(target.monster).length > 0) {
        return [];
      }
      target.monster.shields = [
        {
          source: {
            kind: "temporary",
            playerId: player.id,
            spellId: spellSourceId,
            gemId: gem.id,
          },
          expires: "startOfOwnerNextTurn",
        },
      ];
      syncShieldActive(target.monster);
      return [
        {
          type: "shieldGranted",
          monsterInstanceId: target.monster.id,
          sourceSpellId: spellSourceId,
          temporary: true,
        },
      ];
    }
    case "setCurrentCooldown": {
      if (!selectedTargetId) {
        return [];
      }
      const target = getTarget(state, selectedTargetId);
      if (target?.kind !== "monster") {
        return [];
      }
      const value = effect.valueFrom === "resolvedBaseCooldown" ? target.monster.cooldown : 0;
      return setCurrentCooldown(target.monster.id, target.monster, value);
    }
    case "setCurrentCooldownForAll":
      return player.monsters.flatMap((monster) => setCurrentCooldown(monster.id, monster, 0));
    case "randomTarget": {
      switch (effect.scope) {
        case "alliedRingsWithCooldownAboveZero": {
          const eligible = player.rings.filter((candidate) => candidate.currentCooldown > 0);
          if (eligible.length === 0) return [];
          const chosen = chooseDeterministicRandomTarget(state, eligible, effect.scope);
          return [
            { type: "randomTargetSelected", sourceSpellId: spellSourceId, targetId: chosen.id },
            ...setCurrentCooldown(
              chosen.id,
              chosen,
              Math.max(effect.onSuccess.minimum, chosen.currentCooldown + effect.onSuccess.amount),
            ),
          ];
        }
        case "otherAlliedMonsters": {
          const eligible = player.monsters.filter((candidate) => candidate.id !== selectedTargetId);
          if (eligible.length === 0) return [];
          const chosen = chooseDeterministicRandomTarget(state, eligible, effect.scope);
          const amount = actionContext.destroyedTargetCurrentDamage.get(gem.id) ?? 0;
          const from = chosen.damage;
          chosen.damage += amount;
          return [
            { type: "randomTargetSelected", sourceSpellId: spellSourceId, targetId: chosen.id },
            { type: "monsterDamageChanged", monsterInstanceId: chosen.id, from, to: chosen.damage },
          ];
        }
        case "enemyMonsters": {
          const opponent = getOpponent(state, player.id);
          if (opponent.monsters.length === 0) return [];
          const chosen = chooseDeterministicRandomTarget(state, opponent.monsters, effect.scope);
          return [
            { type: "randomTargetSelected", sourceSpellId: spellSourceId, targetId: chosen.id },
            ...resolveMonsterDestruction(state, opponent, chosen, actionContext),
          ];
        }
        case "otherMonstersControlledBySelectedTargetOwner": {
          const ownerId = actionContext.selectedTargetOwnerIds.get(gem.id);
          const owner = ownerId ? getPlayer(state, ownerId) : undefined;
          const eligible =
            owner?.monsters.filter((candidate) => candidate.id !== selectedTargetId) ?? [];
          if (eligible.length === 0) return [];
          const chosen = chooseDeterministicRandomTarget(state, eligible, effect.scope);
          return [
            { type: "randomTargetSelected", sourceSpellId: spellSourceId, targetId: chosen.id },
            ...applyDamage(
              state,
              player.id,
              spellSourceId,
              chosen.id as TargetId,
              effect.onSuccess.amount,
              effect.onSuccess.element,
              { blockFirstTurnHeroDamage: true, actionContext },
            ),
          ];
        }
      }
      return [];
    }
    case "registerTrigger": {
      const triggers = (ring.triggers ??= []);
      if (triggers.some((trigger) => trigger.source.spellId === spellSourceId)) {
        return [];
      }
      triggers.push({
        event: effect.event,
        source: { playerId: player.id, spellId: spellSourceId, gemId: gem.id },
        effect: structuredClone(effect.effect),
      });
      return [
        {
          type: "triggerRegistered",
          sourceSpellId: spellSourceId,
          ringInstanceId: ring.id,
          event: effect.event,
        },
      ];
    }
    case "conditionalPierceForAction":
    case "registerActionScopedTrigger":
      return [];
    case "ifTargetSurvives": {
      if (!selectedTargetId) {
        return [];
      }
      const target = getTarget(state, selectedTargetId);
      if (target?.kind !== "monster" || target.monster.health <= 0) {
        return [];
      }
      const from = target.monster.damage;
      target.monster.damage += effect.effect.amount;
      return [
        {
          type: "monsterDamageChanged",
          monsterInstanceId: target.monster.id,
          from,
          to: target.monster.damage,
        },
      ];
    }
    case "captureStat": {
      if (!selectedTargetId) return [];
      const target = getTarget(state, selectedTargetId);
      if (target?.kind === "monster") {
        actionContext.capturedCurrentDamage.set(gem.id, target.monster.damage);
      }
      return [];
    }
    case "destroyMonster": {
      if (!selectedTargetId) return [];
      const target = getTarget(state, selectedTargetId);
      if (target?.kind !== "monster") return [];
      actionContext.destroyedTargetCurrentDamage.set(gem.id, target.monster.damage);
      return resolveMonsterDestruction(state, target.player, target.monster, actionContext);
    }
    case "destroyAllMonsters": {
      const targetIds = state.players.flatMap((candidate) =>
        candidate.monsters.map((monster) => monster.id as TargetId),
      );
      for (const targetId of targetIds) actionContext.destroyingMonsterIds.add(targetId);
      return targetIds.flatMap((targetId) => {
        const target = getTarget(state, targetId);
        return target?.kind === "monster"
          ? resolveMonsterDestruction(state, target.player, target.monster, actionContext)
          : [];
      });
    }
    case "copyMonster":
      return selectedTargetId
        ? copyMonsterForPlayer(state, player, selectedTargetId, spellSourceId, gem.id, false)
        : [];
    case "createTemporaryMonsterCopy":
      return selectedTargetId
        ? copyMonsterForPlayer(state, player, selectedTargetId, spellSourceId, gem.id, true)
        : [];
    case "transformMonster": {
      if (!selectedTargetId) return [];
      const target = getTarget(state, selectedTargetId);
      if (target?.kind !== "monster") return [];
      transformMonster(target.monster, effect.result);
      return [
        {
          type: "monsterTransformed",
          monsterInstanceId: target.monster.id,
          sourceSpellId: spellSourceId,
        },
      ];
    }
  }

  return [];
}

function applyTemporaryStatus(
  state: BattleState,
  targetId: TargetId,
  sourcePlayerId: string,
  spellId: string,
  gemId: string,
  effect: Extract<SpellEffect, { type: "applyStatus" }>,
): BattleEvent[] {
  const target = getTarget(state, targetId);
  if (target?.kind !== "monster") {
    return [];
  }

  const statuses = (target.monster.statuses ??= []);
  const existing = statuses.find((status) => status.type === effect.status);
  if (effect.status === "lastBreath") {
    if (existing) {
      return [];
    }
    const status: TemporaryMonsterStatus = {
      type: "lastBreath",
      source: { playerId: sourcePlayerId, spellId, gemId },
      expires: "endOfCurrentTurn",
    };
    statuses.push(status);
    return [
      {
        type: "statusApplied",
        monsterInstanceId: target.monster.id,
        status: "lastBreath",
        sourceSpellId: spellId,
        expires: status.expires,
      },
    ];
  }
  if (
    existing &&
    existing.type !== "lastBreath" &&
    existing.remainingOwnerTurns >= effect.durationOwnerTurns
  ) {
    return [];
  }

  const source = { playerId: sourcePlayerId, spellId, gemId };
  const status: TemporaryMonsterStatus =
    effect.status === "burn"
      ? {
          type: "burn",
          source,
          remainingOwnerTurns: effect.durationOwnerTurns,
          damage: effect.damage,
          element: "fire",
        }
      : {
          type: effect.status,
          source,
          remainingOwnerTurns: effect.durationOwnerTurns,
        };

  target.monster.statuses = statuses.filter((candidate) => candidate.type !== effect.status);
  target.monster.statuses.push(status);
  return [
    {
      type: "statusApplied",
      monsterInstanceId: target.monster.id,
      status: status.type,
      sourceSpellId: spellId,
      remainingOwnerTurns: status.remainingOwnerTurns,
    },
  ];
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

  const blockingStatus = monster.statuses?.find(
    (status) => status.type === "shock" || status.type === "freeze",
  );
  if (blockingStatus) {
    throw new Error(
      `Monster ${monster.id} cannot attack while affected by ${blockingStatus.type}.`,
    );
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

  if (hasMonsterSkill(monster, "multiHit") && target?.kind === "monster") {
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
      pierceMonsterInstanceId: hasMonsterSkill(monster, "pierce") ? monster.id : undefined,
    }),
  );

  return events;
}

function endTurn(state: BattleState, playerId: string): BattleEvent[] {
  const player = requireActivePlayer(state, playerId);
  const opponent = getOpponent(state, player.id);
  const events: BattleEvent[] = [{ type: "turnEnded", playerId: player.id }];

  events.push(...expireTemporaryMonsters(state, player));
  events.push(...expireEndOfOwnerTurnStatuses(player));

  state.activePlayerId = opponent.id;
  opponent.energy.turnCount += 1;
  opponent.energy.maxForTurn = Math.min(8, opponent.energy.turnCount);
  opponent.energy.current = opponent.energy.maxForTurn;

  events.push(...processStartOfOwnerTurnStatuses(state, opponent));

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

function expireTemporaryMonsters(state: BattleState, player: BattlePlayer): BattleEvent[] {
  const expiringIds = player.monsters
    .filter((monster) => monster.temporary?.expires === "endOfCurrentTurn")
    .map((monster) => monster.id as TargetId);
  if (expiringIds.length === 0) return [];
  const context = createEmptyRingActionContext("turn-end");
  for (const id of expiringIds) context.destroyingMonsterIds.add(id);
  return expiringIds.flatMap((id) => {
    const target = getTarget(state, id);
    return target?.kind === "monster"
      ? resolveMonsterDestruction(state, target.player, target.monster, context)
      : [];
  });
}

function expireEndOfOwnerTurnStatuses(player: BattlePlayer): BattleEvent[] {
  const events: BattleEvent[] = [];
  for (const monster of player.monsters) {
    const expired = (monster.statuses ?? []).filter((status) =>
      status.type === "lastBreath"
        ? status.expires === "endOfCurrentTurn"
        : (status.type === "shock" || status.type === "freeze") &&
          status.expiresAfterCurrentOwnerTurn,
    );
    if (expired.length === 0) {
      continue;
    }
    monster.statuses = (monster.statuses ?? []).filter((status) => !expired.includes(status));
    events.push(
      ...expired.map((status) => ({
        type: "statusRemoved" as const,
        monsterInstanceId: monster.id,
        status: status.type,
        reason: "expired" as const,
      })),
    );
  }
  return events;
}

function processStartOfOwnerTurnStatuses(state: BattleState, player: BattlePlayer): BattleEvent[] {
  const events: BattleEvent[] = [];
  const monsterIds = player.monsters.map((monster) => monster.id as TargetId);

  for (const monster of player.monsters) {
    const shields = getActiveShields(monster);
    const expired = shields.filter(
      (shield) => shield.source.kind === "temporary" && shield.expires === "startOfOwnerNextTurn",
    );
    if (expired.length === 0) {
      continue;
    }
    monster.shields = shields.filter((shield) => !expired.includes(shield));
    syncShieldActive(monster);
    events.push(
      ...expired.map(() => ({
        type: "shieldExpired" as const,
        monsterInstanceId: monster.id,
      })),
    );
  }

  for (const monsterId of monsterIds) {
    const target = getTarget(state, monsterId);
    if (target?.kind !== "monster") {
      continue;
    }
    const burn = target.monster.statuses?.find(
      (status): status is Extract<TemporaryMonsterStatus, { type: "burn" }> =>
        status.type === "burn",
    );
    if (!burn) {
      continue;
    }

    events.push(
      ...applyDamage(
        state,
        burn.source.playerId,
        burn.source.spellId,
        monsterId,
        burn.damage,
        burn.element,
        { blockFirstTurnHeroDamage: true },
      ),
    );

    const survivingTarget = getTarget(state, monsterId);
    if (survivingTarget?.kind !== "monster") {
      continue;
    }
    const currentBurn = survivingTarget.monster.statuses?.find(
      (status): status is Extract<TemporaryMonsterStatus, { type: "burn" }> =>
        status.type === "burn",
    );
    if (!currentBurn) {
      continue;
    }
    currentBurn.remainingOwnerTurns -= 1;
    if (currentBurn.remainingOwnerTurns === 0) {
      survivingTarget.monster.statuses = (survivingTarget.monster.statuses ?? []).filter(
        (status) => status !== currentBurn,
      );
      events.push({
        type: "statusRemoved",
        monsterInstanceId: survivingTarget.monster.id,
        status: "burn",
        reason: "expired",
      });
    }
  }

  for (const monster of player.monsters) {
    for (const status of monster.statuses ?? []) {
      if (status.type !== "shock" && status.type !== "freeze") {
        continue;
      }
      status.remainingOwnerTurns -= 1;
      status.expiresAfterCurrentOwnerTurn = status.remainingOwnerTurns === 0;
    }
  }

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

  const instanceNumber = getNextMonsterInstanceNumber(state, player.id, monsterId);
  const monsterInstance: MonsterCombatInstance = {
    id: `${player.id}.monster.${monsterId}.${instanceNumber}`,
    definitionId: monsterId,
    ownerId: player.id,
    nameKey: definition.nameKey,
    element: definition.element,
    rarity: definition.rarity,
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

function copyMonsterForPlayer(
  state: BattleState,
  player: BattlePlayer,
  sourceTargetId: TargetId,
  spellId: string,
  gemId: string,
  temporary: boolean,
): BattleEvent[] {
  if (player.monsters.length >= 3) return [];
  const sourceTarget = getTarget(state, sourceTargetId);
  if (sourceTarget?.kind !== "monster") return [];
  const source = sourceTarget.monster;
  const instanceNumber = getNextMonsterInstanceNumber(state, player.id, source.definitionId);
  const grantedSkills = temporary ? undefined : structuredClone(source.grantedSkills);
  const grantedShield = grantedSkills?.find((grant) => grant.skill === "shield");
  const copied: MonsterCombatInstance = {
    id: `${player.id}.monster.${source.definitionId}.${instanceNumber}`,
    definitionId: source.definitionId,
    ownerId: player.id,
    nameKey: source.nameKey,
    element: source.element,
    rarity: source.rarity,
    health: temporary ? 1 : source.health,
    maxHealth: temporary ? 1 : source.maxHealth,
    baseDamage: source.baseDamage,
    damage: source.damage,
    cooldown: source.cooldown,
    currentCooldown: temporary ? 0 : 1,
    speed: source.speed,
    ...(!temporary && source.skill ? { skill: source.skill } : {}),
    ...(!temporary && grantedSkills ? { grantedSkills } : {}),
    shieldActive: temporary ? false : hasMonsterSkill(source, "shield"),
    ...(grantedShield
      ? { shields: [{ source: { kind: "grantedSkill" as const, ...grantedShield.source } }] }
      : {}),
    rageActive: false,
    ...(temporary
      ? {
          temporary: {
            source: { playerId: player.id, spellId, gemId },
            expires: "endOfCurrentTurn" as const,
          },
        }
      : {}),
  };
  player.monsters.push(copied);
  return [
    {
      type: "monsterCopied",
      sourceMonsterInstanceId: source.id,
      monsterInstanceId: copied.id,
      playerId: player.id,
      temporary,
    },
  ];
}

function transformMonster(
  monster: MonsterCombatInstance,
  result: Extract<SpellEffect, { type: "transformMonster" }>["result"],
): void {
  monster.definitionId = "transmutedElectric";
  monster.nameKey = "monster.transmutedElectric.name";
  monster.element = result.element;
  monster.rarity = "common";
  monster.health = result.currentHealth;
  monster.maxHealth = result.maxHealth;
  monster.baseDamage = result.damage;
  monster.damage = result.damage;
  monster.cooldown = result.baseCooldown;
  monster.currentCooldown = result.currentCooldown;
  monster.speed = 0;
  delete monster.skill;
  delete monster.grantedSkills;
  monster.shieldActive = false;
  delete monster.shields;
  monster.rageActive = false;
  delete monster.statuses;
  delete monster.temporary;
}

function getNextMonsterInstanceNumber(
  state: BattleState,
  playerId: string,
  monsterId: string,
): number {
  const prefix = `${playerId}.monster.${monsterId}.`;
  let maxInstanceNumber = 0;

  const trackInstanceId = (instanceId: string): void => {
    if (!instanceId.startsWith(prefix)) {
      return;
    }

    const suffix = instanceId.slice(prefix.length);
    const instanceNumber = /^\d+$/.test(suffix) ? Number.parseInt(suffix, 10) : Number.NaN;
    if (Number.isFinite(instanceNumber) && instanceNumber > 0) {
      maxInstanceNumber = Math.max(maxInstanceNumber, instanceNumber);
    }
  };

  for (const player of state.initialSetup.players) {
    for (const monster of player.monsters) {
      trackInstanceId(monster.id);
    }
  }

  for (const player of state.players) {
    for (const monster of player.monsters) {
      trackInstanceId(monster.id);
    }
  }

  for (const event of state.log) {
    if (event.type === "monsterSummoned") {
      trackInstanceId(event.monsterInstanceId);
    }
    if (event.type === "monsterCopied") {
      trackInstanceId(event.monsterInstanceId);
    }
  }

  return maxInstanceNumber + 1;
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
    isRingAndGemDamage?: boolean;
    actionContext?: RingActionResolutionContext;
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

  const shields = getActiveShields(target.monster);
  if (shields.length > 0) {
    if (target.monster.shields) {
      target.monster.shields = shields.slice(1);
      syncShieldActive(target.monster);
    } else {
      target.monster.shieldActive = false;
    }
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

  if (options.isRingAndGemDamage && overflowAmount > 0) {
    for (const actionPierce of options.actionContext?.actionPierces ?? []) {
      if (actionPierce.targetId !== target.monster.id) {
        continue;
      }
      const heroTargetId = `${target.player.id}.hero` as TargetId;
      const overflowEvents = applyDamage(
        state,
        sourcePlayerId,
        actionPierce.sourceSpellId,
        heroTargetId,
        overflowAmount,
        element,
        { blockFirstTurnHeroDamage: options.blockFirstTurnHeroDamage },
      );
      const heroDamageEvent = overflowEvents.find((event) => event.type === "damageDealt");
      if (heroDamageEvent) {
        events.push({
          type: "actionPierceOverflow",
          sourceSpellId: actionPierce.sourceSpellId,
          targetMonsterInstanceId: target.monster.id,
          targetHeroId: heroTargetId,
          amount: heroDamageEvent.amount,
        });
        events.push(...overflowEvents);
      }
    }
  }

  if (
    target.monster.health > 0 &&
    hasMonsterSkill(target.monster, "rage") &&
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
    events.push(
      ...resolveMonsterDestruction(state, target.player, target.monster, options.actionContext),
    );
  }

  return events;
}

function resolveMonsterDestruction(
  state: BattleState,
  owner: BattlePlayer,
  monster: MonsterCombatInstance,
  actionContext?: RingActionResolutionContext,
): BattleEvent[] {
  const events: BattleEvent[] = [];
  actionContext?.destroyingMonsterIds.add(monster.id);
  const destroyedDamage = monster.damage;
  const lastBreath = monster.statuses?.find(
    (status): status is Extract<TemporaryMonsterStatus, { type: "lastBreath" }> =>
      status.type === "lastBreath" && !status.triggered,
  );

  if (lastBreath) {
    lastBreath.triggered = true;
    const legalTargets = legalEnemyTargets(state, owner.id, actionContext);
    if (legalTargets.length > 0) {
      const chosen = chooseDeterministicRandomTarget(state, legalTargets, "lastBreathLegalEnemies");
      events.push({
        type: "randomTargetSelected",
        sourceSpellId: lastBreath.source.spellId,
        targetId: chosen.id,
      });
      events.push({
        type: "lastBreathTriggered",
        monsterInstanceId: monster.id,
        targetId: chosen.id,
      });
      events.push(...resolveTriggeredMonsterAttack(state, monster, chosen.id, actionContext));
    } else {
      events.push({ type: "lastBreathTriggered", monsterInstanceId: monster.id });
    }
  }

  for (const brand of actionContext?.funeralBrands ?? []) {
    if (brand.activated || brand.targetId !== monster.id) {
      continue;
    }
    brand.activated = true;
    const heroTargetId = `${owner.id}.hero` as TargetId;
    events.push({
      type: "triggerActivated",
      sourceSpellId: brand.sourceSpellId,
      sourceId: actionContext!.ringInstanceId,
      targetId: monster.id,
    });
    events.push(
      ...applyDamage(
        state,
        brand.sourcePlayerId,
        brand.sourceSpellId,
        heroTargetId,
        destroyedDamage,
        "fire",
        { blockFirstTurnHeroDamage: true },
      ),
    );
  }

  owner.monsters = owner.monsters.filter((candidate) => candidate.id !== monster.id);
  actionContext?.destroyingMonsterIds.delete(monster.id);
  events.push({ type: "monsterDestroyed", monsterInstanceId: monster.id });
  return events;
}

function legalEnemyTargets(
  state: BattleState,
  sourcePlayerId: string,
  actionContext?: RingActionResolutionContext,
): Array<{ id: TargetId }> {
  const opponent = getOpponent(state, sourcePlayerId);
  const livingMonsters = opponent.monsters.filter(
    (monster) => monster.health > 0 && !actionContext?.destroyingMonsterIds.has(monster.id),
  );
  const taunts = livingMonsters.filter(hasTaunt);
  if (taunts.length > 0) {
    return taunts.map((monster) => ({ id: monster.id as TargetId }));
  }
  return [
    ...(opponent.hero.health > 0 ? [{ id: `${opponent.id}.hero` as TargetId }] : []),
    ...livingMonsters.map((monster) => ({ id: monster.id as TargetId })),
  ];
}

function createEmptyRingActionContext(ringInstanceId: string): RingActionResolutionContext {
  return {
    ringInstanceId,
    actionPierces: [],
    funeralBrands: [],
    capturedCurrentDamage: new Map(),
    destroyedTargetCurrentDamage: new Map(),
    selectedTargetOwnerIds: new Map(),
    destroyingMonsterIds: new Set(),
  };
}

function resolveTriggeredMonsterAttack(
  state: BattleState,
  monster: MonsterCombatInstance,
  targetId: TargetId,
  actionContext?: RingActionResolutionContext,
): BattleEvent[] {
  const target = getTarget(state, targetId);
  if (hasMonsterSkill(monster, "multiHit") && target?.kind === "monster") {
    const targetIds = target.player.monsters
      .filter((candidate) => candidate.health > 0)
      .map((candidate) => candidate.id as TargetId);
    return [
      { type: "multiHitResolved", monsterInstanceId: monster.id, targetIds },
      ...targetIds.flatMap((candidateId) =>
        applyDamage(
          state,
          monster.ownerId,
          monster.id,
          candidateId,
          monster.damage,
          monster.element,
          { blockFirstTurnHeroDamage: true, actionContext },
        ),
      ),
    ];
  }
  return applyDamage(
    state,
    monster.ownerId,
    monster.id,
    targetId,
    monster.damage,
    monster.element,
    {
      blockFirstTurnHeroDamage: true,
      pierceMonsterInstanceId: hasMonsterSkill(monster, "pierce") ? monster.id : undefined,
      actionContext,
    },
  );
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
  return (
    hasMonsterSkill(monster, "taunt") &&
    !monster.statuses?.some((status) => status.type === "freeze")
  );
}

function hasMonsterSkill(
  monster: MonsterCombatInstance,
  skill: MonsterCombatInstance["skill"],
): boolean {
  return (
    monster.skill === skill ||
    monster.grantedSkills?.some((grant) => grant.skill === skill) === true
  );
}

function getActiveShields(monster: MonsterCombatInstance) {
  if (monster.shields) {
    return monster.shields;
  }
  return monster.shieldActive ? [{ source: { kind: "natural" as const } }] : [];
}

function syncShieldActive(monster: MonsterCombatInstance): void {
  monster.shieldActive = (monster.shields?.length ?? 0) > 0;
}

function activateRageIfEligible(monster: MonsterCombatInstance): BattleEvent[] {
  if (
    !hasMonsterSkill(monster, "rage") ||
    monster.rageActive ||
    monster.health * 2 >= monster.maxHealth
  ) {
    return [];
  }
  const previousDamage = monster.damage;
  monster.rageActive = true;
  monster.damage = Math.floor(monster.baseDamage * 1.2);
  return [
    {
      type: "rageActivated",
      monsterInstanceId: monster.id,
      previousDamage,
      damage: monster.damage,
    },
  ];
}

function setCurrentCooldown(
  targetId: string,
  target: { currentCooldown: number },
  value: number,
): BattleEvent[] {
  const from = target.currentCooldown;
  target.currentCooldown = value;
  return from === value ? [] : [{ type: "cooldownChanged", targetId, from, to: value }];
}

function chooseDeterministicRandomTarget<T extends { id: string }>(
  state: BattleState,
  candidates: T[],
  scope: string,
): T {
  const cursor = state.randomCursor ?? 0;
  const input = `${state.seed}:spell-random:${cursor}:${scope}`;
  let hash = 0x811c9dc5;
  for (let index = 0; index < input.length; index += 1) {
    hash ^= input.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193);
  }
  state.randomCursor = cursor + 1;
  return candidates[(hash >>> 0) % candidates.length]!;
}

function hasElementalAdvantage(attacker: ElementType, defender: ElementType): boolean {
  return (
    (attacker === "electric" && defender === "fire") ||
    (attacker === "fire" && defender === "ice") ||
    (attacker === "ice" && defender === "electric")
  );
}
