import { describe, expect, it } from "vitest";
import type { LiveBattleState } from "./playerState";
import {
  actionAvailability,
  battleResolutionEffects,
  battleTargets,
  presentBattleEvent,
  shouldShowInitialBattleLoading,
  type LiveBattleActionSource,
} from "./liveBattlePresentation";

function battleState(): LiveBattleState {
  return {
    id: "battle",
    mode: "training",
    status: "active",
    activePlayerId: "viewer",
    startingPlayerId: "viewer",
    rulesVersion: "1",
    contentVersion: "1",
    actionCount: 0,
    turnCount: 1,
    turnPlayerId: "viewer",
    turnDeadlineAt: null,
    openingDuelDeadlineAt: null,
    openingDuelChoiceSubmitted: false,
    openingDuelRound: 1,
    viewer: {
      id: "viewer",
      username: "Viewer",
      level: 1,
      hero: { health: 30, maxHealth: 30, speed: 4 },
      energy: { current: 2, maxForTurn: 2, turnCount: 1 },
      heroTargetId: "viewer.hero",
      monsters: [],
      rings: [],
    },
    opponent: {
      id: "opponent",
      username: "Opponent",
      level: 1,
      hero: { health: 30, maxHealth: 30, speed: 2 },
      energy: { current: 0, maxForTurn: 0, turnCount: 0 },
      heroTargetId: "opponent.hero",
      monsters: [],
    },
    result: null,
    reward: null,
    summary: null,
  };
}

function ringSource(energyCost = 2, currentCooldown = 0): LiveBattleActionSource {
  return {
    kind: "ring",
    id: "ring",
    item: {
      id: "ring",
      definitionId: "emberLoop",
      label: "Ember Loop",
      element: "fire",
      rarity: "normal",
      damage: 4,
      energyCost,
      cooldown: 2,
      currentCooldown,
      speed: 2,
      gems: [],
    },
  };
}

describe("live battle presentation", () => {
  it("keeps the battle visible during a background refresh", () => {
    const battle = battleState();

    expect(shouldShowInitialBattleLoading(true, null)).toBe(true);
    expect(shouldShowInitialBattleLoading(true, battle)).toBe(false);
    expect(shouldShowInitialBattleLoading(false, battle)).toBe(false);
  });

  it("reports why a source cannot be prepared", () => {
    const battle = battleState();
    expect(actionAvailability(battle, ringSource())).toEqual({ available: true, reason: "ready" });
    expect(actionAvailability(battle, ringSource(3))).toEqual({
      available: false,
      reason: "energy",
    });
    expect(actionAvailability(battle, ringSource(1, 1))).toEqual({
      available: false,
      reason: "cooldown",
    });

    battle.activePlayerId = "opponent";
    expect(actionAvailability(battle, ringSource()).reason).toBe("opponentTurn");
  });

  it("only exposes Taunt monsters as legal opponent targets", () => {
    const battle = battleState();
    battle.opponent.monsters = [
      {
        id: "opponent.monster.guardian.1",
        definitionId: "iceGuardian",
        label: "Ice Guardian",
        element: "ice",
        rarity: "normal",
        health: 8,
        maxHealth: 8,
        damage: 2,
        cooldown: 2,
        currentCooldown: 0,
        skill: "taunt",
        shieldActive: false,
        rageActive: false,
      },
      {
        id: "opponent.monster.imp.1",
        definitionId: "emberImp",
        label: "Ember Imp",
        element: "fire",
        rarity: "normal",
        health: 4,
        maxHealth: 4,
        damage: 3,
        cooldown: 2,
        currentCooldown: 0,
        skill: null,
        shieldActive: false,
        rageActive: false,
      },
    ];

    const targets = battleTargets(battle);
    expect(
      targets.find((target) => target.id === battle.opponent.heroTargetId)?.blockedByTaunt,
    ).toBe(true);
    expect(
      targets.find((target) => target.id === "opponent.monster.guardian.1")?.blockedByTaunt,
    ).toBe(false);
    expect(targets.find((target) => target.id === "opponent.monster.imp.1")?.blockedByTaunt).toBe(
      true,
    );
    expect(targets.find((target) => target.id === battle.viewer.heroTargetId)?.blockedByTaunt).toBe(
      false,
    );
  });

  it("marks first-turn hero protection without making the target illegal", () => {
    const battle = battleState();
    const hero = battleTargets(battle).find((target) => target.id === battle.opponent.heroTargetId);
    expect(hero).toMatchObject({ blockedByTaunt: false, firstTurnProtected: true });

    battle.viewer.energy.turnCount = 2;
    expect(
      battleTargets(battle).find((target) => target.id === battle.opponent.heroTargetId),
    ).toMatchObject({ blockedByTaunt: false, firstTurnProtected: false });
  });

  it("presents combat events with player-facing parameters", () => {
    expect(
      presentBattleEvent(
        {
          type: "damageDealt",
          sourceId: "ring.1",
          targetId: "opponent.hero",
          amount: 6,
          element: "fire",
        },
        (id) => ({ "ring.1": "Ember Loop", "opponent.hero": "Opponent Hero" })[id] ?? id,
      ),
    ).toEqual({
      key: "battle.live.events.damageDealt",
      tone: "damage",
      params: { source: "Ember Loop", target: "Opponent Hero", amount: 6 },
    });
  });

  it("aggregates source and target feedback for one resolution", () => {
    expect(
      battleResolutionEffects([
        {
          type: "ringUsed",
          playerId: "viewer",
          ringInstanceId: "ring.1",
          targetId: "opponent.monster.imp.1",
        },
        {
          type: "damageDealt",
          sourceId: "ring.1",
          targetId: "opponent.monster.imp.1",
          amount: 4,
        },
        {
          type: "damageDealt",
          sourceId: "spell.1",
          targetId: "opponent.monster.imp.1",
          amount: 2,
        },
        {
          type: "shieldBroken",
          monsterInstanceId: "opponent.monster.imp.1",
          sourceId: "ring.1",
        },
      ]),
    ).toEqual({
      sourceIds: ["ring.1", "spell.1"],
      targets: [{ id: "opponent.monster.imp.1", damage: 6, statuses: ["shieldBroken"] }],
    });
  });
});
