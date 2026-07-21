import type { BattleEvent } from "@battleness/engine";
import type { LiveBattleMonsterView, LiveBattleRingView, LiveBattleState } from "./playerState";

export type LiveBattleEventPresentation = {
  key: string;
  tone: "neutral" | "action" | "damage" | "status" | "result";
  params: Record<string, string | number>;
};

export type LiveBattleResolutionEffects = {
  sourceIds: string[];
  targets: { id: string; damage: number; statuses: string[] }[];
};

export type LiveBattleActionSource =
  | { kind: "ring"; id: string; item: LiveBattleRingView }
  | { kind: "monster"; id: string; item: LiveBattleMonsterView };

export type LiveBattleActionAvailability = {
  available: boolean;
  reason: "ready" | "battleInactive" | "opponentTurn" | "cooldown" | "energy";
};

export type LiveBattleTarget = {
  id: string;
  side: "viewer" | "opponent";
  kind: "hero" | "monster";
  blockedByTaunt: boolean;
  firstTurnProtected: boolean;
};

export function shouldShowInitialBattleLoading(
  pending: boolean,
  battle: LiveBattleState | null | undefined,
): boolean {
  return pending && !battle;
}

export function actionAvailability(
  battle: LiveBattleState,
  source: LiveBattleActionSource,
): LiveBattleActionAvailability {
  if (battle.status !== "active") {
    return { available: false, reason: "battleInactive" };
  }
  if (battle.activePlayerId !== battle.viewer.id) {
    return { available: false, reason: "opponentTurn" };
  }
  if (source.item.currentCooldown > 0) {
    return { available: false, reason: "cooldown" };
  }
  if (source.kind === "ring" && battle.viewer.energy.current < source.item.energyCost) {
    return { available: false, reason: "energy" };
  }
  return { available: true, reason: "ready" };
}

export function battleTargets(battle: LiveBattleState): LiveBattleTarget[] {
  const opponentTaunts = new Set(
    battle.opponent.monsters
      .filter((monster) => monster.skill === "taunt")
      .map((monster) => monster.id),
  );
  const hasOpponentTaunt = opponentTaunts.size > 0;
  const firstTurnProtected =
    battle.viewer.id === battle.startingPlayerId && battle.viewer.energy.turnCount === 1;

  return [
    {
      id: battle.opponent.heroTargetId,
      side: "opponent",
      kind: "hero",
      blockedByTaunt: hasOpponentTaunt,
      firstTurnProtected,
    },
    ...battle.opponent.monsters.map((monster) => ({
      id: monster.id,
      side: "opponent" as const,
      kind: "monster" as const,
      blockedByTaunt: hasOpponentTaunt && !opponentTaunts.has(monster.id),
      firstTurnProtected: false,
    })),
    {
      id: battle.viewer.heroTargetId,
      side: "viewer",
      kind: "hero",
      blockedByTaunt: false,
      firstTurnProtected: false,
    },
    ...battle.viewer.monsters.map((monster) => ({
      id: monster.id,
      side: "viewer" as const,
      kind: "monster" as const,
      blockedByTaunt: false,
      firstTurnProtected: false,
    })),
  ];
}

export function presentBattleEvent(
  event: BattleEvent,
  label: (id: string) => string,
): LiveBattleEventPresentation {
  switch (event.type) {
    case "battleStarted":
      return presentation("battleStarted", "neutral");
    case "firstPlayerChoiceRequested":
      return presentation("firstPlayerChoiceRequested", "neutral");
    case "elementChosen":
      return presentation("elementChosen", "action", {
        player: label(event.playerId),
        element: event.element,
      });
    case "elementDuelTied":
      return presentation("elementDuelTied", "status", { element: event.element });
    case "elementDuelTiebreaker":
      return presentation("elementDuelTiebreaker", "status", {
        player: label(event.playerId),
        count: event.tieCount,
      });
    case "openingDuelTimedOut":
      return presentation("openingDuelTimedOut", "result", {
        player: event.timedOutPlayerId ? label(event.timedOutPlayerId) : label("draw"),
      });
    case "firstPlayerChosen":
      return presentation("firstPlayerChosen", "status", { player: label(event.playerId) });
    case "turnStarted":
      return presentation("turnStarted", "neutral", {
        player: label(event.playerId),
        turn: event.turnCount,
        energy: event.energy,
      });
    case "cooldownChanged":
      return presentation("cooldownChanged", "neutral", {
        target: label(event.targetId),
        from: event.from,
        to: event.to,
      });
    case "ringUsed":
      return presentation("ringUsed", "action", {
        player: label(event.playerId),
        source: label(event.ringInstanceId),
        target: label(event.targetId),
      });
    case "energySpent":
      return presentation("energySpent", "neutral", {
        player: label(event.playerId),
        amount: event.amount,
        remaining: event.remaining,
      });
    case "damageDealt":
      return presentation("damageDealt", "damage", {
        source: label(event.sourceId),
        target: label(event.targetId),
        amount: event.amount,
      });
    case "spellCast":
      return presentation("spellCast", "action", {
        source: label(event.spellId),
        target: label(event.targetId),
      });
    case "monsterSummoned":
      return presentation("monsterSummoned", "action", {
        player: label(event.playerId),
        monster: label(event.monsterInstanceId),
      });
    case "monsterUsed":
      return presentation("monsterUsed", "action", {
        source: label(event.monsterInstanceId),
        target: label(event.targetId),
      });
    case "shieldBroken":
      return presentation("shieldBroken", "status", {
        monster: label(event.monsterInstanceId),
      });
    case "pierceOverflow":
      return presentation("pierceOverflow", "damage", {
        source: label(event.monsterInstanceId),
        target: label(event.targetHeroId),
        amount: event.amount,
      });
    case "hasteActivated":
      return presentation("hasteActivated", "status", {
        monster: label(event.monsterInstanceId),
      });
    case "rageActivated":
      return presentation("rageActivated", "status", {
        monster: label(event.monsterInstanceId),
        damage: event.damage,
      });
    case "multiHitResolved":
      return presentation("multiHitResolved", "status", {
        monster: label(event.monsterInstanceId),
        count: event.targetIds.length,
      });
    case "monsterDestroyed":
      return presentation("monsterDestroyed", "result", {
        monster: label(event.monsterInstanceId),
      });
    case "turnEnded":
      return presentation("turnEnded", "neutral", { player: label(event.playerId) });
    case "battleEnded":
      return event.result.type === "draw"
        ? presentation("battleDraw", "result")
        : presentation("battleWon", "result", { player: label(event.result.winnerId) });
  }
}

export function battleResolutionEffects(events: BattleEvent[]): LiveBattleResolutionEffects {
  const sourceIds = new Set<string>();
  const targets = new Map<string, { damage: number; statuses: Set<string> }>();

  for (const event of events) {
    switch (event.type) {
      case "ringUsed":
        sourceIds.add(event.ringInstanceId);
        break;
      case "monsterUsed":
        sourceIds.add(event.monsterInstanceId);
        break;
      case "damageDealt":
        sourceIds.add(event.sourceId);
        targetEffect(targets, event.targetId).damage += event.amount;
        break;
      case "shieldBroken":
        targetEffect(targets, event.monsterInstanceId).statuses.add("shieldBroken");
        break;
      case "rageActivated":
        targetEffect(targets, event.monsterInstanceId).statuses.add("rageActivated");
        break;
      case "hasteActivated":
        targetEffect(targets, event.monsterInstanceId).statuses.add("hasteActivated");
        break;
      case "monsterDestroyed":
        targetEffect(targets, event.monsterInstanceId).statuses.add("monsterDestroyed");
        break;
      default:
        break;
    }
  }

  return {
    sourceIds: [...sourceIds],
    targets: [...targets].map(([id, effect]) => ({
      id,
      damage: effect.damage,
      statuses: [...effect.statuses],
    })),
  };
}

function presentation(
  name: string,
  tone: LiveBattleEventPresentation["tone"],
  params: Record<string, string | number> = {},
): LiveBattleEventPresentation {
  return { key: `battle.live.events.${name}`, tone, params };
}

function targetEffect(
  targets: Map<string, { damage: number; statuses: Set<string> }>,
  id: string,
): { damage: number; statuses: Set<string> } {
  const existing = targets.get(id);
  if (existing) return existing;
  const created = { damage: 0, statuses: new Set<string>() };
  targets.set(id, created);
  return created;
}
