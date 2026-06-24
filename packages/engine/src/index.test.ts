import { describe, expect, it } from "vitest";
import { applyBattleAction, createBattleState, type BattleSetup } from "./index";

const setup: BattleSetup = {
  id: "testBattle",
  seed: "test-seed",
  status: "active",
  activePlayerId: "playerOne",
  startingPlayerId: "playerOne",
  definitions: {
    monsters: {
      iceGuardian: {
        id: "iceGuardian",
        nameKey: "monster.iceGuardian.name",
        element: "ice",
        baseHealth: 7,
        baseDamage: 2,
        baseCooldown: 1,
        baseSpeed: 0,
        skills: ["taunt"],
      },
    },
    spells: {
      spark: {
        id: "spark",
        nameKey: "spell.spark.name",
        element: "electric",
        baseEnergyPenalty: 0,
        baseCooldownPenalty: 0,
        effects: [{ type: "dealDamage", amount: 2, target: "any" }],
      },
    },
  },
  players: [
    {
      id: "playerOne",
      username: "Player One",
      level: 1,
      hero: { health: 30, maxHealth: 30, speed: 5 },
      energy: { current: 1, maxForTurn: 1, turnCount: 1 },
      rings: [
        {
          id: "playerOne.ring.sparkBand",
          definitionId: "sparkBand",
          ownerId: "playerOne",
          nameKey: "ring.sparkBand.name",
          element: "electric",
          damage: 2,
          energyCost: 1,
          cooldown: 0,
          currentCooldown: 0,
          speed: 3,
          gems: [
            {
              id: "playerOne.gem.sparkPrism",
              definitionId: "sparkPrism",
              ownerId: "playerOne",
              nameKey: "gem.sparkPrism.name",
              element: "electric",
              damage: 1,
              energyPenalty: 0,
              cooldownPenalty: 0,
              enchantment: { type: "spell", spellId: "spark" },
            },
          ],
        },
      ],
      monsters: [],
    },
    {
      id: "playerTwo",
      username: "Player Two",
      level: 1,
      hero: { health: 30, maxHealth: 30, speed: 4 },
      energy: { current: 0, maxForTurn: 0, turnCount: 0 },
      rings: [],
      monsters: [],
    },
  ],
};

describe("createBattleState", () => {
  it("creates a battle state with an initial battleStarted event", () => {
    const state = createBattleState(setup);

    expect(state.id).toBe("testBattle");
    expect(state.result).toBeNull();
    expect(state.log.map((event) => event.type)).toEqual([
      "battleStarted",
      "firstPlayerChosen",
      "turnStarted",
    ]);
  });

  it("applies self-targeted direct spell damage after ring damage", () => {
    const state = createBattleState(setup);
    const result = applyBattleAction(state, {
      type: "useRing",
      playerId: "playerOne",
      ringInstanceId: "playerOne.ring.sparkBand",
      targetId: "playerTwo.hero",
      enchantmentTargets: {
        "playerOne.gem.sparkPrism": "playerOne.hero",
      },
    });

    const playerOne = result.state.players[0];
    const playerTwo = result.state.players[1];

    expect(result.events.map((event) => event.type)).toEqual([
      "ringUsed",
      "energySpent",
      "spellCast",
      "damageDealt",
    ]);
    expect(playerOne.hero.health).toBe(28);
    expect(playerTwo.hero.health).toBe(30);
  });
});
