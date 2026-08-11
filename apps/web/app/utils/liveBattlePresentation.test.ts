import { describe, expect, it } from "vitest";
import type { LiveBattleState } from "./playerState";
import {
  actionAvailability,
  battleResolutionEffects,
  battleTargets,
  cooldownReady,
  presentBattleEvent,
  ringTotalDamage,
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

function ringSource(
  energyCost = 2,
  currentCooldown = 0,
): Extract<LiveBattleActionSource, { kind: "ring" }> {
  return {
    kind: "ring",
    id: "ring",
    item: {
      id: "ring",
      definitionId: "ashenLoop",
      label: "Ember Loop",
      element: "fire",
      rarity: "normal",
      damage: 4,
      energyCost,
      cooldown: 2,
      currentCooldown,
      speed: 2,
      socketCount: 1,
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

  it("presents ring damage with socketed gem damage", () => {
    const source = ringSource();
    source.item.gems = [
      {
        id: "gem",
        definitionId: "emberShard",
        label: "Ember Shard",
        element: "fire",
        rarity: "normal",
        damage: 2,
        energyPenalty: 0,
        cooldownPenalty: 0,
        enchantment: null,
      },
    ];

    expect(ringTotalDamage(source.item)).toBe(6);
  });

  it("marks cooldown zero as ready for compact stats", () => {
    expect(cooldownReady(ringSource(2, 0).item)).toBe(true);
    expect(cooldownReady(ringSource(2, 1).item)).toBe(false);
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
        skills: ["taunt"],
        statuses: [],
        temporary: false,
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
        skills: [],
        statuses: [],
        temporary: false,
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

  it("uses granted skills and Freeze when presenting Taunt target legality", () => {
    const battle = battleState();
    battle.opponent.monsters = [
      {
        id: "opponent.monster.gifted.1",
        definitionId: "emberImp",
        label: "Gifted Imp",
        element: "fire",
        rarity: "normal",
        health: 4,
        maxHealth: 4,
        damage: 3,
        cooldown: 2,
        currentCooldown: 0,
        skill: null,
        skills: ["taunt"],
        statuses: [],
        temporary: false,
        shieldActive: false,
        rageActive: false,
      },
    ];
    expect(
      battleTargets(battle).find((target) => target.id === battle.opponent.heroTargetId)
        ?.blockedByTaunt,
    ).toBe(true);
    battle.opponent.monsters[0]!.statuses = ["freeze"];
    expect(
      battleTargets(battle).find((target) => target.id === battle.opponent.heroTargetId)
        ?.blockedByTaunt,
    ).toBe(false);
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

    expect(
      presentBattleEvent(
        { type: "spellCast", spellId: "stompI", sourceGemId: "gem.1" },
        (id) => ({ stompI: "Stomp I" })[id] ?? id,
      ),
    ).toEqual({
      key: "battle.live.events.spellCastNoTarget",
      tone: "action",
      params: { source: "Stomp I" },
    });

    expect(
      presentBattleEvent(
        {
          type: "skillGranted",
          monsterInstanceId: "viewer.monster.imp.1",
          skill: "pierce",
          sourceSpellId: "giftPierce",
        },
        (id) => ({ "viewer.monster.imp.1": "Ember Imp" })[id] ?? id,
      ),
    ).toEqual({
      key: "battle.live.events.skillGranted",
      tone: "status",
      params: { monster: "Ember Imp", skill: "pierce" },
    });

    expect(
      presentBattleEvent(
        {
          type: "lastBreathTriggered",
          monsterInstanceId: "viewer.monster.imp.1",
          targetId: "opponent.monster.guardian.1",
        },
        (id) =>
          ({
            "viewer.monster.imp.1": "Ember Imp",
            "opponent.monster.guardian.1": "Guardian",
          })[id] ?? id,
      ),
    ).toEqual({
      key: "battle.live.events.lastBreathTriggered",
      tone: "status",
      params: { monster: "Ember Imp", target: "Guardian" },
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

  it("aggregates structured status feedback", () => {
    expect(
      battleResolutionEffects([
        {
          type: "statusApplied",
          monsterInstanceId: "opponent.monster.imp.1",
          status: "burn",
          sourceSpellId: "burnI",
          remainingOwnerTurns: 1,
        },
        {
          type: "statusRemoved",
          monsterInstanceId: "opponent.monster.imp.1",
          status: "burn",
          reason: "expired",
        },
      ]),
    ).toEqual({
      sourceIds: [],
      targets: [
        {
          id: "opponent.monster.imp.1",
          damage: 0,
          statuses: ["burn", "burnRemoved"],
        },
      ],
    });
  });
});
