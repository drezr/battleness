import { describe, expect, it } from "vitest";
import {
  applyBattleAction,
  createBattleRecord,
  createBattleState,
  parseBattleRecord,
  replayBattleRecord,
  rulesVersion,
  serializeBattleRecord,
  type BattleEvent,
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
        rarity: "common",
        baseHealth: 7,
        baseDamage: 2,
        baseCooldown: 1,
        baseSpeed: 0,
        skill: "taunt",
      },
    },
    spells: {
      spark: {
        id: "spark",
        nameKey: "spell.spark.name",
        element: "electric",
        rarity: "common",
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
          rarity: "common",
          damage: 2,
          energyCost: 1,
          cooldown: 1,
          currentCooldown: 0,
          speed: 3,
          socketCount: 1,
          gems: [
            {
              id: "playerOne.gem.sparkPrism",
              definitionId: "sparkPrism",
              ownerId: "playerOne",
              nameKey: "gem.sparkPrism.name",
              element: "electric",
              rarity: "common",
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
    rarity: "common",
    health: 7,
    maxHealth: 7,
    baseDamage: 2,
    damage: 2,
    cooldown: 1,
    currentCooldown: 0,
    speed: 0,
    skill: "taunt",
    shieldActive: false,
    rageActive: false,
  };
}

function createMonster(
  ownerId: string,
  definitionId: string,
  overrides: Partial<MonsterCombatInstance> = {},
): MonsterCombatInstance {
  const maxHealth = overrides.maxHealth ?? 5;
  const baseDamage = overrides.baseDamage ?? 2;
  const skill = overrides.skill;

  return {
    id: `${ownerId}.monster.${definitionId}.1`,
    definitionId,
    ownerId,
    nameKey: `monster.${definitionId}.name`,
    element: "fire",
    rarity: "common",
    health: maxHealth,
    maxHealth,
    baseDamage,
    damage: baseDamage,
    cooldown: 1,
    currentCooldown: 0,
    speed: 0,
    skill,
    shieldActive: skill === "shield",
    rageActive: false,
    ...overrides,
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

  it("rejects rings with a cooldown below 1", () => {
    const invalidSetup = structuredClone(setup);
    invalidSetup.players[0].rings[0].cooldown = 0;

    expect(() => createBattleState(invalidSetup)).toThrow(
      "Ring playerOne.ring.sparkBand cooldown must be at least 1.",
    );
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

  it("uses a seeded deterministic tiebreaker after three tied element duels", () => {
    const tiedSetup = structuredClone(setup);
    tiedSetup.players[0].hero.speed = 4;
    tiedSetup.players[1].hero.speed = 4;
    tiedSetup.players[0].level = 1;
    tiedSetup.players[1].level = 1;

    const resolveThreeTies = () => {
      let state = createBattleState(tiedSetup);
      let lastEvents: BattleEvent[] = [];
      for (let duel = 0; duel < 3; duel += 1) {
        state = applyBattleAction(state, {
          type: "chooseElement",
          playerId: "playerOne",
          element: "fire",
        }).state;
        const result = applyBattleAction(state, {
          type: "chooseElement",
          playerId: "playerTwo",
          element: "fire",
        });
        state = result.state;
        lastEvents = result.events;
      }
      return { state, lastEvents };
    };

    const firstRun = resolveThreeTies();
    const secondRun = resolveThreeTies();
    expect(firstRun.state.status).toBe("active");
    expect(firstRun.state.activePlayerId).toBe(secondRun.state.activePlayerId);
    expect(firstRun.lastEvents).toContainEqual({
      type: "elementDuelTiebreaker",
      playerId: firstRun.state.activePlayerId,
      tieCount: 3,
    });
    expect(firstRun.lastEvents).toContainEqual({
      type: "firstPlayerChosen",
      playerId: firstRun.state.activePlayerId,
      reason: "elementDuelTiebreaker",
    });
  });

  it("resolves an opening duel timeout as a draw when neither player chose", () => {
    const tiedSetup = structuredClone(setup);
    tiedSetup.players[0].hero.speed = tiedSetup.players[1].hero.speed = 4;
    tiedSetup.players[0].level = tiedSetup.players[1].level = 1;
    const state = createBattleState(tiedSetup);

    const result = applyBattleAction(state, {
      type: "resolveOpeningDuelTimeout",
      timedOutPlayerId: null,
    });

    expect(result.state.status).toBe("finished");
    expect(result.state.result).toEqual({ type: "draw" });
    expect(result.events).toContainEqual({
      type: "openingDuelTimedOut",
      timedOutPlayerId: null,
    });
  });

  it("resolves an opening duel timeout as a concession when one player did not choose", () => {
    const tiedSetup = structuredClone(setup);
    tiedSetup.players[0].hero.speed = tiedSetup.players[1].hero.speed = 4;
    tiedSetup.players[0].level = tiedSetup.players[1].level = 1;
    const chosen = applyBattleAction(createBattleState(tiedSetup), {
      type: "chooseElement",
      playerId: "playerOne",
      element: "electric",
    }).state;

    const result = applyBattleAction(chosen, {
      type: "resolveOpeningDuelTimeout",
      timedOutPlayerId: "playerTwo",
    });

    expect(result.state.result).toEqual({
      type: "winner",
      winnerId: "playerOne",
      loserId: "playerTwo",
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

  it("lets a spell expire when earlier ring damage destroys its valid target", () => {
    const state = createBattleState(setup);
    state.players[1].monsters = [createMonster("playerTwo", "emberImp", { maxHealth: 3 })];

    const result = applyBattleAction(state, {
      type: "useRing",
      playerId: "playerOne",
      ringInstanceId: "playerOne.ring.sparkBand",
      targetId: "playerTwo.monster.emberImp.1",
    });

    expect(result.events.map((event) => event.type)).toEqual([
      "ringUsed",
      "energySpent",
      "damageDealt",
      "monsterDestroyed",
    ]);
    expect(result.state.players[1].monsters).toEqual([]);
  });

  it("prevents using the same ring twice in one turn even when energy remains", () => {
    const state = createBattleState(setup);
    const ringEnergyCost = state.players[0].rings[0].energyCost;
    state.players[0].energy.current = ringEnergyCost * 2;
    state.players[0].energy.maxForTurn = ringEnergyCost * 2;
    const firstUse = applyBattleAction(state, {
      type: "useRing",
      playerId: "playerOne",
      ringInstanceId: "playerOne.ring.sparkBand",
      targetId: "playerOne.hero",
      enchantmentTargets: {
        "playerOne.gem.sparkPrism": "playerOne.hero",
      },
    });

    expect(firstUse.state.players[0].energy.current).toBe(ringEnergyCost);
    expect(firstUse.state.players[0].rings[0].currentCooldown).toBe(1);
    expect(() =>
      applyBattleAction(firstUse.state, {
        type: "useRing",
        playerId: "playerOne",
        ringInstanceId: "playerOne.ring.sparkBand",
        targetId: "playerOne.hero",
        enchantmentTargets: {
          "playerOne.gem.sparkPrism": "playerOne.hero",
        },
      }),
    ).toThrow("Ring playerOne.ring.sparkBand is on cooldown.");
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

  it("breaks Shield and negates the complete first damage instance", () => {
    const shieldSetup = structuredClone(setup);
    shieldSetup.players[0].monsters = [
      createMonster("playerOne", "attacker", { damage: 10, baseDamage: 10 }),
    ];
    shieldSetup.players[1].monsters = [
      createMonster("playerTwo", "shieldWisp", {
        skill: "shield",
        shieldActive: true,
      }),
    ];
    const state = createBattleState(shieldSetup);
    const firstHit = applyBattleAction(state, {
      type: "useMonster",
      playerId: "playerOne",
      monsterInstanceId: "playerOne.monster.attacker.1",
      targetId: "playerTwo.monster.shieldWisp.1",
    });
    const shieldedMonster = firstHit.state.players[1].monsters[0];

    expect(shieldedMonster.health).toBe(5);
    expect(shieldedMonster.shieldActive).toBe(false);
    expect(firstHit.events).toContainEqual({
      type: "shieldBroken",
      monsterInstanceId: "playerTwo.monster.shieldWisp.1",
      sourceId: "playerOne.monster.attacker.1",
    });

    firstHit.state.players[0].monsters[0].currentCooldown = 0;
    const secondHit = applyBattleAction(firstHit.state, {
      type: "useMonster",
      playerId: "playerOne",
      monsterInstanceId: "playerOne.monster.attacker.1",
      targetId: "playerTwo.monster.shieldWisp.1",
    });

    expect(secondHit.state.players[1].monsters).toHaveLength(0);
  });

  it("transfers Pierce overkill damage to the monster controller's hero", () => {
    const pierceSetup = structuredClone(setup);
    pierceSetup.players[0].monsters = [
      createMonster("playerOne", "emberLancer", {
        damage: 7,
        baseDamage: 7,
        skill: "pierce",
      }),
    ];
    pierceSetup.players[1].monsters = [createMonster("playerTwo", "target")];
    const state = createBattleState(pierceSetup);
    state.players[0].energy.turnCount = 2;

    const result = applyBattleAction(state, {
      type: "useMonster",
      playerId: "playerOne",
      monsterInstanceId: "playerOne.monster.emberLancer.1",
      targetId: "playerTwo.monster.target.1",
    });

    expect(result.state.players[1].monsters).toHaveLength(0);
    expect(result.state.players[1].hero.health).toBe(28);
    expect(result.events).toContainEqual({
      type: "pierceOverflow",
      monsterInstanceId: "playerOne.monster.emberLancer.1",
      targetMonsterInstanceId: "playerTwo.monster.target.1",
      targetHeroId: "playerTwo.hero",
      amount: 2,
    });
  });

  it("blocks Pierce overflow against the protected hero on the starting turn", () => {
    const pierceSetup = structuredClone(setup);
    pierceSetup.players[0].monsters = [
      createMonster("playerOne", "emberLancer", {
        damage: 7,
        baseDamage: 7,
        skill: "pierce",
      }),
    ];
    pierceSetup.players[1].monsters = [createMonster("playerTwo", "target")];
    const state = createBattleState(pierceSetup);

    const result = applyBattleAction(state, {
      type: "useMonster",
      playerId: "playerOne",
      monsterInstanceId: "playerOne.monster.emberLancer.1",
      targetId: "playerTwo.monster.target.1",
    });

    expect(result.state.players[1].hero.health).toBe(30);
    expect(result.events.some((event) => event.type === "pierceOverflow")).toBe(false);
  });

  it("summons Haste monsters ready to act immediately", () => {
    const hasteSetup = structuredClone(setup);
    hasteSetup.definitions.monsters.stormHound = {
      id: "stormHound",
      nameKey: "monster.stormHound.name",
      element: "electric",
      rarity: "common",
      baseHealth: 4,
      baseDamage: 2,
      baseCooldown: 1,
      baseSpeed: 3,
      skill: "haste",
    };
    hasteSetup.players[0].rings[0].gems[0].enchantment = {
      type: "monster",
      monsterId: "stormHound",
    };
    const state = createBattleState(hasteSetup);

    const result = applyBattleAction(state, {
      type: "useRing",
      playerId: "playerOne",
      ringInstanceId: "playerOne.ring.sparkBand",
      targetId: "playerOne.hero",
    });

    expect(result.state.players[0].monsters[0].currentCooldown).toBe(0);
    expect(result.events).toContainEqual({
      type: "hasteActivated",
      monsterInstanceId: "playerOne.monster.stormHound.1",
    });
  });

  it("does not reuse a destroyed monster instance ID when a ring summons the same monster", () => {
    const summonSetup = structuredClone(setup);
    summonSetup.definitions.monsters.emberImp = {
      id: "emberImp",
      nameKey: "monster.emberImp.name",
      element: "fire",
      rarity: "common",
      baseHealth: 3,
      baseDamage: 1,
      baseCooldown: 1,
      baseSpeed: 0,
      skill: "rage",
    };
    summonSetup.players[0].rings[0] = {
      ...summonSetup.players[0].rings[0],
      damage: 4,
      energyCost: 2,
      cooldown: 1,
      currentCooldown: 0,
      gems: [
        {
          ...summonSetup.players[0].rings[0].gems[0],
          damage: 2,
          enchantment: { type: "monster", monsterId: "emberImp" },
        },
      ],
    };
    const state = createBattleState(summonSetup);
    state.players[0].energy.current = 2;
    state.players[0].energy.maxForTurn = 2;
    state.players[0].energy.turnCount = 2;

    const firstUse = applyBattleAction(state, {
      type: "useRing",
      playerId: "playerOne",
      ringInstanceId: "playerOne.ring.sparkBand",
      targetId: "playerOne.hero",
    });

    expect(firstUse.state.players[0].monsters).toHaveLength(1);
    expect(firstUse.state.players[0].monsters[0].id).toBe("playerOne.monster.emberImp.1");

    firstUse.state.players[0].rings[0].currentCooldown = 0;
    firstUse.state.players[0].energy.current = 2;

    const secondUse = applyBattleAction(firstUse.state, {
      type: "useRing",
      playerId: "playerOne",
      ringInstanceId: "playerOne.ring.sparkBand",
      targetId: "playerOne.monster.emberImp.1",
    });

    expect(secondUse.events).toContainEqual({
      type: "monsterDestroyed",
      monsterInstanceId: "playerOne.monster.emberImp.1",
    });
    expect(secondUse.events).toContainEqual({
      type: "monsterSummoned",
      playerId: "playerOne",
      monsterInstanceId: "playerOne.monster.emberImp.2",
      monsterId: "emberImp",
    });
    expect(secondUse.state.players[0].monsters).toHaveLength(1);
    expect(secondUse.state.players[0].monsters[0]).toMatchObject({
      id: "playerOne.monster.emberImp.2",
      health: 3,
      maxHealth: 3,
    });
  });

  it("activates Rage below half health and rounds the damage bonus down", () => {
    const rageSetup = structuredClone(setup);
    rageSetup.players[0].monsters = [
      createMonster("playerOne", "attacker", { damage: 6, baseDamage: 6 }),
    ];
    rageSetup.players[1].monsters = [
      createMonster("playerTwo", "emberImp", {
        maxHealth: 10,
        health: 10,
        damage: 5,
        baseDamage: 5,
        skill: "rage",
      }),
    ];
    const state = createBattleState(rageSetup);

    const result = applyBattleAction(state, {
      type: "useMonster",
      playerId: "playerOne",
      monsterInstanceId: "playerOne.monster.attacker.1",
      targetId: "playerTwo.monster.emberImp.1",
    });
    const rageMonster = result.state.players[1].monsters[0];

    expect(rageMonster.health).toBe(4);
    expect(rageMonster.rageActive).toBe(true);
    expect(rageMonster.damage).toBe(6);
    expect(result.events).toContainEqual({
      type: "rageActivated",
      monsterInstanceId: "playerTwo.monster.emberImp.1",
      previousDamage: 5,
      damage: 6,
    });
  });

  it("does not activate Rage at exactly half health", () => {
    const rageSetup = structuredClone(setup);
    rageSetup.players[0].monsters = [
      createMonster("playerOne", "attacker", { damage: 5, baseDamage: 5 }),
    ];
    rageSetup.players[1].monsters = [
      createMonster("playerTwo", "emberImp", {
        maxHealth: 10,
        health: 10,
        damage: 5,
        baseDamage: 5,
        skill: "rage",
      }),
    ];
    const state = createBattleState(rageSetup);

    const result = applyBattleAction(state, {
      type: "useMonster",
      playerId: "playerOne",
      monsterInstanceId: "playerOne.monster.attacker.1",
      targetId: "playerTwo.monster.emberImp.1",
    });

    expect(result.state.players[1].monsters[0].rageActive).toBe(false);
    expect(result.state.players[1].monsters[0].damage).toBe(5);
  });

  it("resolves MultiHit against every monster behind the legal Taunt target", () => {
    const multiHitSetup = structuredClone(setup);
    multiHitSetup.players[0].monsters = [
      createMonster("playerOne", "arcStriker", {
        element: "electric",
        skill: "multiHit",
      }),
    ];
    multiHitSetup.players[1].monsters = [
      createIceGuardian("playerTwo"),
      createMonster("playerTwo", "shieldWisp", {
        element: "electric",
        skill: "shield",
        shieldActive: true,
      }),
      createMonster("playerTwo", "target", { element: "electric" }),
    ];
    const state = createBattleState(multiHitSetup);

    const result = applyBattleAction(state, {
      type: "useMonster",
      playerId: "playerOne",
      monsterInstanceId: "playerOne.monster.arcStriker.1",
      targetId: "playerTwo.monster.iceGuardian.1",
    });

    expect(result.events).toContainEqual({
      type: "multiHitResolved",
      monsterInstanceId: "playerOne.monster.arcStriker.1",
      targetIds: [
        "playerTwo.monster.iceGuardian.1",
        "playerTwo.monster.shieldWisp.1",
        "playerTwo.monster.target.1",
      ],
    });
    expect(result.state.players[1].monsters.map((monster) => monster.health)).toEqual([5, 5, 3]);
    expect(result.state.players[1].monsters[1].shieldActive).toBe(false);
  });

  it("allows MultiHit to damage every monster on the attacker's side", () => {
    const alliedMultiHitSetup = structuredClone(setup);
    alliedMultiHitSetup.players[0].monsters = [
      createMonster("playerOne", "arcStriker", {
        element: "electric",
        skill: "multiHit",
      }),
      createMonster("playerOne", "ally", { element: "electric" }),
    ];
    const state = createBattleState(alliedMultiHitSetup);

    const result = applyBattleAction(state, {
      type: "useMonster",
      playerId: "playerOne",
      monsterInstanceId: "playerOne.monster.arcStriker.1",
      targetId: "playerOne.monster.ally.1",
    });

    expect(result.state.players[0].monsters.map((monster) => monster.health)).toEqual([3, 3]);
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

  it("does not decrement monster cooldown during the opponent turn", () => {
    const cooldownSetup = structuredClone(setup);
    cooldownSetup.players[0].monsters = [createMonster("playerOne", "emberImp")];
    const state = createBattleState(cooldownSetup);

    const afterMonster = applyBattleAction(state, {
      type: "useMonster",
      playerId: "playerOne",
      monsterInstanceId: "playerOne.monster.emberImp.1",
      targetId: "playerTwo.hero",
    }).state;
    expect(afterMonster.players[0].monsters[0].currentCooldown).toBe(1);

    const playerTwoTurn = applyBattleAction(afterMonster, {
      type: "endTurn",
      playerId: "playerOne",
    }).state;
    expect(playerTwoTurn.players[0].monsters[0].currentCooldown).toBe(1);

    const playerOneTurn = applyBattleAction(playerTwoTurn, {
      type: "endTurn",
      playerId: "playerTwo",
    });

    expect(playerOneTurn.events).toContainEqual({
      type: "cooldownChanged",
      targetId: "playerOne.monster.emberImp.1",
      from: 1,
      to: 0,
    });
    expect(playerOneTurn.state.players[0].monsters[0].currentCooldown).toBe(0);
  });
});

describe("battle records", () => {
  it("records only successfully applied actions", () => {
    const state = createBattleState(setup);

    expect(() =>
      applyBattleAction(state, {
        type: "endTurn",
        playerId: "playerTwo",
      }),
    ).toThrow("Player playerTwo is not the active player.");
    expect(state.actionHistory).toEqual([]);

    const result = applyBattleAction(state, {
      type: "endTurn",
      playerId: "playerOne",
    });
    expect(result.state.actionHistory).toEqual([
      {
        type: "endTurn",
        playerId: "playerOne",
      },
    ]);
  });

  it("serializes, parses, and deterministically replays a battle record", () => {
    let state = createBattleState(setup);
    state = applyBattleAction(state, {
      type: "useRing",
      playerId: "playerOne",
      ringInstanceId: "playerOne.ring.sparkBand",
      targetId: "playerOne.hero",
      enchantmentTargets: {
        "playerOne.gem.sparkPrism": "playerOne.hero",
      },
    }).state;
    state = applyBattleAction(state, {
      type: "endTurn",
      playerId: "playerOne",
    }).state;

    const record = createBattleRecord(state, {
      rulesVersion,
      contentVersion: "test-content-1",
    });
    const parsedRecord = parseBattleRecord(serializeBattleRecord(record));
    const replayedState = replayBattleRecord(parsedRecord);

    expect(parsedRecord.actions).toEqual(state.actionHistory);
    expect(replayedState).toEqual(state);
  });

  it("rejects unsupported records and detects tampered results", () => {
    const state = applyBattleAction(createBattleState(setup), {
      type: "concede",
      playerId: "playerOne",
    }).state;
    const record = createBattleRecord(state, {
      rulesVersion,
      contentVersion: "test-content-1",
    });
    const tamperedRecord = structuredClone(record);
    tamperedRecord.result = { type: "draw" };
    const tamperedChecksumRecord = structuredClone(record);
    tamperedChecksumRecord.finalStateChecksum = "fnv1a32:00000000";

    expect(() => replayBattleRecord(tamperedRecord)).toThrow("Battle record result mismatch");
    expect(() => replayBattleRecord(tamperedChecksumRecord)).toThrow(
      "Battle record state mismatch",
    );
    expect(() =>
      parseBattleRecord(
        JSON.stringify({
          ...record,
          formatVersion: 2,
        }),
      ),
    ).toThrow("format or version is not supported");
  });
});
