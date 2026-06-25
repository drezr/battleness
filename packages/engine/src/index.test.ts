import { describe, expect, it } from "vitest";
import {
  applyBattleAction,
  createBattleState,
  type BattleSetup,
  type MonsterCombatInstance,
} from "./index";

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

function createIceGuardian(ownerId: string, instanceNumber = 1): MonsterCombatInstance {
  return {
    id: `${ownerId}.monster.iceGuardian.${instanceNumber}`,
    definitionId: "iceGuardian",
    ownerId,
    nameKey: "monster.iceGuardian.name",
    element: "ice",
    health: 7,
    maxHealth: 7,
    damage: 2,
    cooldown: 1,
    currentCooldown: 0,
    speed: 0,
    skills: ["taunt"],
  };
}

describe("createBattleState", () => {
  it("creates a battle state with an initial battleStarted event", () => {
    const state = createBattleState(setup);

    expect(state.id).toBe("testBattle");
    expect(state.result).toBeNull();
    expect(state.activePlayerId).toBe("playerOne");
    expect(state.startingPlayerId).toBe("playerOne");
    expect(state.players[0].energy).toEqual({ current: 1, maxForTurn: 1, turnCount: 1 });
    expect(state.log.map((event) => event.type)).toEqual([
      "battleStarted",
      "firstPlayerChosen",
      "turnStarted",
    ]);
  });

  it("chooses the lower-level player when hero speed is tied", () => {
    const tiedSpeedSetup = structuredClone(setup);
    tiedSpeedSetup.players[0].level = 2;
    tiedSpeedSetup.players[0].hero.speed = 4;
    tiedSpeedSetup.players[1].level = 1;
    tiedSpeedSetup.players[1].hero.speed = 4;

    const state = createBattleState(tiedSpeedSetup);

    expect(state.activePlayerId).toBe("playerTwo");
    expect(state.startingPlayerId).toBe("playerTwo");
    expect(state.log).toContainEqual({
      type: "firstPlayerChosen",
      playerId: "playerTwo",
      reason: "level",
    });
  });

  it("uses repeated element duels when speed and level are tied", () => {
    const tiedSetup = structuredClone(setup);
    tiedSetup.players[0].hero.speed = 4;
    tiedSetup.players[1].hero.speed = 4;
    tiedSetup.players[0].level = 1;
    tiedSetup.players[1].level = 1;
    let state = createBattleState(tiedSetup);

    expect(state.status).toBe("choosingFirstPlayer");
    expect(state.activePlayerId).toBeNull();
    expect(state.log.at(-1)).toEqual({
      type: "firstPlayerChoiceRequested",
      playerIds: ["playerOne", "playerTwo"],
      reason: "speedAndLevelTie",
    });

    state = applyBattleAction(state, {
      type: "chooseElement",
      playerId: "playerOne",
      element: "fire",
    }).state;
    const tiedDuel = applyBattleAction(state, {
      type: "chooseElement",
      playerId: "playerTwo",
      element: "fire",
    });

    expect(tiedDuel.events.at(-1)).toEqual({ type: "elementDuelTied", element: "fire" });
    expect(tiedDuel.state.status).toBe("choosingFirstPlayer");
    expect(tiedDuel.state.firstPlayerChoices).toEqual({});

    state = applyBattleAction(tiedDuel.state, {
      type: "chooseElement",
      playerId: "playerOne",
      element: "electric",
    }).state;
    const resolvedDuel = applyBattleAction(state, {
      type: "chooseElement",
      playerId: "playerTwo",
      element: "fire",
    });

    expect(resolvedDuel.state.status).toBe("active");
    expect(resolvedDuel.state.activePlayerId).toBe("playerOne");
    expect(resolvedDuel.events).toContainEqual({
      type: "firstPlayerChosen",
      playerId: "playerOne",
      reason: "elementDuel",
    });
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

  it("prevents targeting an enemy hero while that enemy controls a Taunt monster", () => {
    const tauntSetup = structuredClone(setup);
    tauntSetup.players[1].monsters = [createIceGuardian("playerTwo")];
    const state = createBattleState(tauntSetup);

    expect(() =>
      applyBattleAction(state, {
        type: "useRing",
        playerId: "playerOne",
        ringInstanceId: "playerOne.ring.sparkBand",
        targetId: "playerTwo.hero",
      }),
    ).toThrow("protected by Taunt");
  });

  it("blocks first-turn damage to the opposing hero from both ring and spell effects", () => {
    const state = createBattleState(setup);
    const result = applyBattleAction(state, {
      type: "useRing",
      playerId: "playerOne",
      ringInstanceId: "playerOne.ring.sparkBand",
      targetId: "playerTwo.hero",
      enchantmentTargets: {
        "playerOne.gem.sparkPrism": "playerTwo.hero",
      },
    });

    expect(result.events.map((event) => event.type)).toEqual([
      "ringUsed",
      "energySpent",
      "spellCast",
    ]);
    expect(result.state.players[1].hero.health).toBe(30);
  });

  it("does not summon a monster when the active player's board is already full", () => {
    const fullBoardSetup = structuredClone(setup);
    fullBoardSetup.players[0].monsters = [
      createIceGuardian("playerOne", 1),
      createIceGuardian("playerOne", 2),
      createIceGuardian("playerOne", 3),
    ];
    fullBoardSetup.players[0].rings[0].gems[0].enchantment = {
      type: "monster",
      monsterId: "iceGuardian",
    };
    const state = createBattleState(fullBoardSetup);

    const result = applyBattleAction(state, {
      type: "useRing",
      playerId: "playerOne",
      ringInstanceId: "playerOne.ring.sparkBand",
      targetId: "playerTwo.hero",
    });

    expect(result.events.some((event) => event.type === "monsterSummoned")).toBe(false);
    expect(result.state.players[0].monsters).toHaveLength(3);
  });

  it("ends the battle as a draw when both heroes reach zero during one action resolution", () => {
    const drawSetup = structuredClone(setup);
    const state = createBattleState(drawSetup);
    state.players[0].hero.health = 2;
    state.players[0].hero.maxHealth = 2;
    state.players[0].energy.current = 2;
    state.players[0].energy.maxForTurn = 2;
    state.players[0].energy.turnCount = 2;
    state.players[1].hero.health = 3;
    state.players[1].hero.maxHealth = 3;

    const result = applyBattleAction(state, {
      type: "useRing",
      playerId: "playerOne",
      ringInstanceId: "playerOne.ring.sparkBand",
      targetId: "playerTwo.hero",
      enchantmentTargets: {
        "playerOne.gem.sparkPrism": "playerOne.hero",
      },
    });

    expect(result.state.status).toBe("finished");
    expect(result.state.result).toEqual({ type: "draw" });
    expect(result.events.at(-1)).toEqual({ type: "battleEnded", result: { type: "draw" } });
  });

  it("decrements a used ring cooldown when its controller starts their next turn", () => {
    const cooldownSetup = structuredClone(setup);
    cooldownSetup.players[0].rings[0].cooldown = 1;
    const state = createBattleState(cooldownSetup);

    const afterRing = applyBattleAction(state, {
      type: "useRing",
      playerId: "playerOne",
      ringInstanceId: "playerOne.ring.sparkBand",
      targetId: "playerTwo.hero",
    }).state;
    const playerTwoTurn = applyBattleAction(afterRing, {
      type: "endTurn",
      playerId: "playerOne",
    }).state;
    const playerOneTurn = applyBattleAction(playerTwoTurn, {
      type: "endTurn",
      playerId: "playerTwo",
    });

    expect(playerOneTurn.events).toContainEqual({
      type: "cooldownChanged",
      targetId: "playerOne.ring.sparkBand",
      from: 1,
      to: 0,
    });
    expect(playerOneTurn.state.players[0].rings[0].currentCooldown).toBe(0);
  });
});
