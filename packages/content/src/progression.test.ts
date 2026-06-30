import { applyBattleAction, createBattleState } from "@battleness/engine";
import { describe, expect, it } from "vitest";
import { createBattleSetup } from "./battleSetup";
import {
  experienceForLevel,
  itemBonusPercent,
  levelFromExperience,
  resolveHeroMaxHealth,
  resolveItemStat,
  resolveSpellPenalty,
  spellPenaltyReduction,
} from "./progression";
import type { BattleSetupFixture, InventoryFixture, PlayerFixture } from "./schemas";

describe("progression formulas", () => {
  it("derives capped levels from total experience thresholds", () => {
    expect(experienceForLevel(0)).toBe(0);
    expect(experienceForLevel(1)).toBe(100);
    expect(experienceForLevel(2)).toBe(400);
    expect(experienceForLevel(10)).toBe(10_000);
    expect(experienceForLevel(50)).toBe(250_000);

    expect(levelFromExperience(0)).toBe(0);
    expect(levelFromExperience(99)).toBe(0);
    expect(levelFromExperience(100)).toBe(1);
    expect(levelFromExperience(399)).toBe(1);
    expect(levelFromExperience(400)).toBe(2);
    expect(levelFromExperience(300_000)).toBe(50);
  });

  it("adds level and quality bonuses before applying floor rounding", () => {
    expect(itemBonusPercent(10, 60)).toBe(35);
    expect(resolveItemStat(4, 10, 60)).toBe(5);
    expect(resolveItemStat(8, 10, 60)).toBe(10);
    expect(resolveItemStat(4, 50, 100)).toBe(9);
  });

  it("resolves hero health and spell penalties at their boundaries", () => {
    expect(resolveHeroMaxHealth(0)).toBe(30);
    expect(resolveHeroMaxHealth(25)).toBe(45);
    expect(resolveHeroMaxHealth(50)).toBe(60);

    expect(spellPenaltyReduction(10, 60)).toBe(1);
    expect(resolveSpellPenalty(3, 10, 60)).toBe(2);
    expect(resolveSpellPenalty(2, 50, 100)).toBe(0);
  });

  it("rejects invalid progression inputs", () => {
    expect(() => experienceForLevel(51)).toThrow(RangeError);
    expect(() => levelFromExperience(-1)).toThrow(RangeError);
    expect(() => resolveItemStat(4, 1, 101)).toThrow(RangeError);
    expect(() => resolveSpellPenalty(-1, 1, 50)).toThrow(RangeError);
  });
});

describe("battle setup stat resolution", () => {
  it("resolves player and owned item progression before combat", () => {
    const setupFixture: BattleSetupFixture = {
      id: "progressionTest",
      seed: "progression-test-seed",
      playerIds: ["progressedPlayer", "basePlayer"],
    };
    const players: PlayerFixture[] = [
      {
        id: "progressedPlayer",
        username: "Progressed Player",
        experience: 10_000,
        equippedRingInstanceIds: ["progressedPlayer.ring.emberLoop"],
      },
      {
        id: "basePlayer",
        username: "Base Player",
        experience: 0,
        equippedRingInstanceIds: ["basePlayer.ring.frostSeal"],
      },
    ];
    const inventory: InventoryFixture = {
      rings: [
        {
          id: "progressedPlayer.ring.emberLoop",
          definitionId: "emberLoop",
          ownerId: "progressedPlayer",
          experience: 10_000,
          quality: 60,
          socketCount: 2,
          socketedGemInstanceIds: [
            "progressedPlayer.gem.rubyShard",
            "progressedPlayer.gem.frostChip",
          ],
          equipped: true,
        },
        {
          id: "basePlayer.ring.frostSeal",
          definitionId: "frostSeal",
          ownerId: "basePlayer",
          experience: 0,
          quality: 0,
          socketCount: 1,
          socketedGemInstanceIds: [],
          equipped: true,
        },
      ],
      gems: [
        {
          id: "progressedPlayer.gem.rubyShard",
          definitionId: "rubyShard",
          ownerId: "progressedPlayer",
          experience: 10_000,
          quality: 60,
          enchantment: {
            type: "spell",
            spellInstanceId: "progressedPlayer.spell.firebolt",
          },
        },
        {
          id: "progressedPlayer.gem.frostChip",
          definitionId: "frostChip",
          ownerId: "progressedPlayer",
          experience: 10_000,
          quality: 60,
          enchantment: {
            type: "monster",
            monsterInstanceId: "progressedPlayer.monster.iceGuardian",
          },
        },
      ],
      monsters: [
        {
          id: "progressedPlayer.monster.iceGuardian",
          definitionId: "iceGuardian",
          ownerId: "progressedPlayer",
          experience: 10_000,
          quality: 60,
        },
      ],
      spells: [
        {
          id: "progressedPlayer.spell.firebolt",
          definitionId: "firebolt",
          ownerId: "progressedPlayer",
          experience: 10_000,
          quality: 60,
        },
      ],
    };

    const setup = createBattleSetup(setupFixture, players, inventory);
    const player = setup.players[0];
    const ring = player.rings[0];
    const spellGem = ring.gems[0];
    const monsterGem = ring.gems[1];
    const spell = setup.definitions.spells["progressedPlayer.spell.firebolt"];
    const monster = setup.definitions.monsters["progressedPlayer.monster.iceGuardian"];

    expect(player.level).toBe(10);
    expect(player.hero).toEqual({ health: 36, maxHealth: 36, speed: 1 });
    expect(ring.damage).toBe(5);
    expect(ring.speed).toBe(1);
    expect(spellGem.damage).toBe(2);
    expect(spellGem.enchantment).toEqual({
      type: "spell",
      spellId: "firebolt",
      resolvedDefinitionId: "progressedPlayer.spell.firebolt",
    });
    expect(monsterGem.enchantment).toEqual({
      type: "monster",
      monsterId: "iceGuardian",
      resolvedDefinitionId: "progressedPlayer.monster.iceGuardian",
    });
    expect(spell.baseEnergyPenalty).toBe(0);
    expect(monster.baseHealth).toBe(9);
    expect(monster.baseDamage).toBe(2);

    const initialState = createBattleState(setup);
    const result = applyBattleAction(initialState, {
      type: "useRing",
      playerId: "progressedPlayer",
      ringInstanceId: ring.id,
      targetId: "progressedPlayer.hero",
      enchantmentTargets: {
        "progressedPlayer.gem.rubyShard": "progressedPlayer.hero",
      },
    });
    const summonedMonster = result.state.players[0].monsters[0];

    expect(summonedMonster.definitionId).toBe("iceGuardian");
    expect(summonedMonster.maxHealth).toBe(9);
    expect(summonedMonster.damage).toBe(2);
  });
});
