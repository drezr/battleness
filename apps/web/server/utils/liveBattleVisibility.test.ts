import { describe, expect, it } from "vitest";
import type { BattleState, GemCombatInstance, RingCombatInstance } from "@battleness/engine";
import { liveBattleRevealState } from "./liveBattleVisibility";

const spellGem: GemCombatInstance = {
  id: "opponent.gem.spell",
  definitionId: "emberShard",
  ownerId: "opponent",
  nameKey: "gem.emberShard.name",
  element: "fire",
  rarity: "common",
  damage: 1,
  energyPenalty: 1,
  cooldownPenalty: 0,
  enchantment: { type: "spell", spellId: "firebolt" },
};

const monsterGem = (id: string): GemCombatInstance => ({
  id,
  definitionId: "emberShard",
  ownerId: "opponent",
  nameKey: "gem.emberShard.name",
  element: "fire",
  rarity: "common",
  damage: 1,
  energyPenalty: 0,
  cooldownPenalty: 0,
  enchantment: { type: "monster", monsterId: "emberImp" },
});

const ring: RingCombatInstance = {
  id: "opponent.ring.ashenLoop",
  definitionId: "ashenLoop",
  ownerId: "opponent",
  nameKey: "ring.ashenLoop.name",
  element: "fire",
  rarity: "common",
  damage: 4,
  energyCost: 3,
  cooldown: 2,
  currentCooldown: 0,
  speed: 2,
  socketCount: 3,
  gems: [spellGem, monsterGem("opponent.gem.monster.1"), monsterGem("opponent.gem.monster.2")],
};

function state(log: BattleState["log"]): Pick<BattleState, "players" | "log"> {
  return {
    players: [
      {
        id: "viewer",
        username: "Viewer",
        level: 0,
        hero: { health: 30, maxHealth: 30, speed: 4 },
        energy: { current: 1, maxForTurn: 1, turnCount: 1 },
        rings: [],
        monsters: [],
      },
      {
        id: "opponent",
        username: "Opponent",
        level: 0,
        hero: { health: 30, maxHealth: 30, speed: 2 },
        energy: { current: 1, maxForTurn: 1, turnCount: 1 },
        rings: [ring],
        monsters: [],
      },
    ],
    log,
  };
}

describe("live battle visibility", () => {
  it("keeps the complete opponent loadout hidden before use", () => {
    const reveal = liveBattleRevealState(state([]), "opponent");
    expect([...reveal.ringIds]).toEqual([]);
    expect([...reveal.gemIds]).toEqual([]);
    expect([...reveal.enchantmentGemIds]).toEqual([]);
  });

  it("permanently reveals a used ring and its contributing gems", () => {
    const reveal = liveBattleRevealState(
      state([
        {
          type: "ringUsed",
          playerId: "opponent",
          ringInstanceId: ring.id,
          targetId: "viewer.hero",
        },
        { type: "turnEnded", playerId: "opponent" },
      ]),
      "opponent",
    );

    expect([...reveal.ringIds]).toEqual([ring.id]);
    expect([...reveal.gemIds]).toEqual(ring.gems.map((gem) => gem.id));
    expect([...reveal.enchantmentGemIds]).toEqual([]);
  });

  it("reveals only enchantments that actually cast or summon", () => {
    const reveal = liveBattleRevealState(
      state([
        {
          type: "ringUsed",
          playerId: "opponent",
          ringInstanceId: ring.id,
          targetId: "viewer.hero",
        },
        {
          type: "monsterSummoned",
          playerId: "opponent",
          monsterInstanceId: "opponent.monster.emberImp.1",
          monsterId: "emberImp",
        },
        {
          type: "spellCast",
          spellId: "firebolt",
          sourceGemId: spellGem.id,
          targetId: "viewer.hero",
        },
      ]),
      "opponent",
    );

    expect([...reveal.enchantmentGemIds]).toEqual(["opponent.gem.monster.1", spellGem.id]);
  });
});
