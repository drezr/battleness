import { describe, expect, it } from "vitest";
import {
  applyBattleAction,
  createBattleState,
  type BattleEvent,
  type BattleSetup,
  type MonsterCombatInstance,
  type SpellDefinition,
  type TargetId,
} from "@battleness/engine";
import { definitions } from "./index";

const playerTwoHero = "playerTwo.hero" as TargetId;
const alliedMonsterId = "playerOne.monster.acceptance.1" as TargetId;
const alliedSupportId = "playerOne.monster.acceptance.2" as TargetId;
const enemyMonsterId = "playerTwo.monster.acceptance.1" as TargetId;
const enemySupportId = "playerTwo.monster.acceptance.2" as TargetId;

const expectedEffectEvent: Record<string, BattleEvent["type"]> = {
  burnI: "statusApplied",
  burnII: "statusApplied",
  burnIII: "statusApplied",
  carbonize: "statusApplied",
  giftPierce: "skillGranted",
  damageOnKill: "triggerRegistered",
  devotion: "monsterDestroyed",
  pierceLegacy: "actionPierceOverflow",
  destruction: "monsterDestroyed",
  giftRage: "skillGranted",
  bloodflame: "damageDealt",
  chainExplosion: "monsterDestroyed",
  funeralBrand: "triggerActivated",
  lastBreath: "statusApplied",
  shockI: "statusApplied",
  shockII: "statusApplied",
  shockIII: "statusApplied",
  electroshock: "statusApplied",
  energyOnKill: "triggerRegistered",
  sacrifice: "monsterDestroyed",
  copy: "monsterCopied",
  transmute: "monsterTransformed",
  arcRelay: "damageDealt",
  quickPulse: "cooldownChanged",
  shortCircuit: "cooldownChanged",
  zerakaiProtocol: "monsterCopied",
  zeroInterval: "cooldownChanged",
  giftMultiHit: "skillGranted",
  freezeI: "statusApplied",
  freezeII: "statusApplied",
  freezeIII: "statusApplied",
  stompI: "damageDealt",
  stompII: "damageDealt",
  stompIII: "damageDealt",
  deepFreezing: "statusApplied",
  giftTaunt: "skillGranted",
  cooldownOnKill: "triggerRegistered",
  cleanse: "statusRemoved",
  refresh: "randomTargetSelected",
  rimeLock: "cooldownChanged",
  crystalSkin: "shieldGranted",
  giftShield: "skillGranted",
};

function monster(
  id: TargetId,
  overrides: Partial<MonsterCombatInstance> = {},
): MonsterCombatInstance {
  return {
    id,
    definitionId: "acceptanceMonster",
    ownerId: id.startsWith("playerOne.") ? "playerOne" : "playerTwo",
    nameKey: "monster.acceptance.name",
    element: "fire",
    rarity: "common",
    health: 12,
    maxHealth: 12,
    baseDamage: 2,
    damage: 2,
    cooldown: 2,
    currentCooldown: 1,
    speed: 0,
    shieldActive: false,
    rageActive: false,
    ...overrides,
  };
}

function setupFor(spell: SpellDefinition): BattleSetup {
  const ringDamage = ["pierceLegacy", "funeralBrand"].includes(spell.id) ? 13 : 0;
  const enemy = monster(enemyMonsterId, {
    ...(spell.id === "cleanse"
      ? {
          statuses: [
            {
              type: "burn" as const,
              source: { playerId: "playerOne", spellId: "burnI", gemId: "sourceGem" },
              remainingOwnerTurns: 1,
              damage: 3,
              element: "fire" as const,
            },
          ],
        }
      : {}),
  });

  return {
    id: `production-spell-acceptance-${spell.id}`,
    seed: `production-spell-acceptance-${spell.id}`,
    status: "active",
    activePlayerId: "playerOne",
    startingPlayerId: "playerOne",
    definitions: {
      monsters: {},
      spells: { [spell.id]: spell },
    },
    players: [
      {
        id: "playerOne",
        username: "Player One",
        level: 1,
        hero: { health: 30, maxHealth: 30, speed: 2 },
        energy: { current: 10, maxForTurn: 10, turnCount: 1 },
        rings: [
          {
            id: `playerOne.ring.${spell.id}`,
            definitionId: `ring.${spell.id}`,
            ownerId: "playerOne",
            nameKey: `ring.${spell.id}.name`,
            element: spell.element,
            rarity: spell.rarity,
            damage: ringDamage,
            energyCost: 1,
            cooldown: 1,
            currentCooldown: 0,
            speed: 0,
            socketCount: 1,
            gems: [
              {
                id: `playerOne.gem.${spell.id}`,
                definitionId: `gem.${spell.id}`,
                ownerId: "playerOne",
                nameKey: `gem.${spell.id}.name`,
                element: spell.element,
                rarity: spell.rarity,
                damage: 0,
                energyPenalty: 0,
                cooldownPenalty: 0,
                speed: 0,
                enchantment: { type: "spell", spellId: spell.id },
              },
            ],
          },
        ],
        monsters: [monster(alliedMonsterId), monster(alliedSupportId)],
      },
      {
        id: "playerTwo",
        username: "Player Two",
        level: 1,
        hero: { health: 30, maxHealth: 30, speed: 1 },
        energy: { current: 0, maxForTurn: 0, turnCount: 0 },
        rings: [],
        monsters: [enemy, monster(enemySupportId)],
      },
    ],
  };
}

function selectedTarget(spell: SpellDefinition): TargetId | undefined {
  const allowedTarget = spell.targeting?.allowedTargets[0];
  if (allowedTarget === "alliedMonster") return alliedMonsterId;
  if (allowedTarget === "enemyMonster" || allowedTarget === "anyMonster") return enemyMonsterId;
  if (allowedTarget === "anyCombatant") return enemyMonsterId;
  return undefined;
}

describe("active production spell acceptance", () => {
  it("keeps one behavioral expectation for every active production spell", () => {
    expect(Object.keys(expectedEffectEvent).sort()).toEqual(
      definitions.spells.map((spell) => spell.id).sort(),
    );
  });

  it.each(definitions.spells)("executes $id from the active content definition", (spell) => {
    const state = createBattleState(setupFor(spell));
    if (spell.id === "pierceLegacy") state.startingPlayerId = "playerTwo";
    const enchantmentTarget = selectedTarget(spell);
    const primaryTarget = ["pierceLegacy", "funeralBrand"].includes(spell.id)
      ? enemyMonsterId
      : playerTwoHero;
    const result = applyBattleAction(state, {
      type: "useRing",
      playerId: "playerOne",
      ringInstanceId: `playerOne.ring.${spell.id}`,
      targetId: primaryTarget,
      ...(enchantmentTarget
        ? { enchantmentTargets: { [`playerOne.gem.${spell.id}`]: enchantmentTarget } }
        : {}),
    }).state;

    expect(result.log).toContainEqual(
      expect.objectContaining({ type: "spellCast", spellId: spell.id }),
    );
    expect(result.log.some((event) => event.type === expectedEffectEvent[spell.id])).toBe(true);
  });
});
