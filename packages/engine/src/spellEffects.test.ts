import { describe, expect, it } from "vitest";
import { applyBattleAction, createBattleState } from "./index";
import type {
  BattleSetup,
  BattleState,
  MonsterCombatInstance,
  SpellDefinition,
  TargetId,
} from "./types";

const playerOneHero = "playerOne.hero" as TargetId;
const playerTwoHero = "playerTwo.hero" as TargetId;

function monster(
  id: string,
  overrides: Partial<MonsterCombatInstance> = {},
): MonsterCombatInstance {
  return {
    id,
    definitionId: "testMonster",
    ownerId: id.startsWith("playerOne.") ? "playerOne" : "playerTwo",
    nameKey: "monster.test.name",
    element: "fire",
    rarity: "common",
    health: 6,
    maxHealth: 6,
    baseDamage: 2,
    damage: 2,
    cooldown: 2,
    currentCooldown: 0,
    speed: 0,
    shieldActive: false,
    rageActive: false,
    ...overrides,
  };
}

function setupWithSpells(
  spells: SpellDefinition[],
  playerTwoMonsters: MonsterCombatInstance[],
): BattleSetup {
  return {
    id: "spell-effects",
    seed: "spell-effects-seed",
    status: "active",
    activePlayerId: "playerOne",
    startingPlayerId: "playerOne",
    definitions: {
      monsters: {},
      spells: Object.fromEntries(spells.map((spell) => [spell.id, spell])),
    },
    players: [
      {
        id: "playerOne",
        username: "Player One",
        level: 1,
        hero: { health: 30, maxHealth: 30, speed: 2 },
        energy: { current: 1, maxForTurn: 1, turnCount: 1 },
        rings: spells.map((spell) => ({
          id: `playerOne.ring.${spell.id}`,
          definitionId: `ring.${spell.id}`,
          ownerId: "playerOne",
          nameKey: `ring.${spell.id}.name`,
          element: spell.element,
          rarity: spell.rarity,
          damage: 0,
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
        })),
        monsters: [],
      },
      {
        id: "playerTwo",
        username: "Player Two",
        level: 1,
        hero: { health: 30, maxHealth: 30, speed: 1 },
        energy: { current: 0, maxForTurn: 0, turnCount: 0 },
        rings: [],
        monsters: playerTwoMonsters,
      },
    ],
  };
}

function readyState(setup: BattleSetup): BattleState {
  const state = createBattleState(setup);
  state.players[0].energy.current = 10;
  state.players[0].energy.maxForTurn = 10;
  return state;
}

function cast(
  state: BattleState,
  spellId: string,
  targetId: TargetId,
  enchantmentTarget = targetId,
): BattleState {
  return applyBattleAction(state, {
    type: "useRing",
    playerId: "playerOne",
    ringInstanceId: `playerOne.ring.${spellId}`,
    targetId,
    enchantmentTargets: { [`playerOne.gem.${spellId}`]: enchantmentTarget },
  }).state;
}

describe("production spell slice A engine effects", () => {
  it.each([
    ["burnI", "burn", 1],
    ["burnII", "burn", 2],
    ["burnIII", "burn", 3],
    ["shockI", "shock", 1],
    ["shockII", "shock", 2],
    ["shockIII", "shock", 3],
    ["freezeI", "freeze", 1],
    ["freezeII", "freeze", 2],
    ["freezeIII", "freeze", 3],
  ] as const)("resolves the %s production scenario", (id, status, durationOwnerTurns) => {
    const spell: SpellDefinition = {
      id,
      nameKey: `spell.${id}.name`,
      element: status === "burn" ? "fire" : status === "shock" ? "electric" : "ice",
      rarity: "common",
      baseEnergyPenalty: 0.5,
      baseCooldownPenalty: 0.5,
      targeting: { selection: "one", allowedTargets: ["anyMonster"] },
      effects: [
        status === "burn"
          ? { type: "applyStatus", status, damage: 3, durationOwnerTurns }
          : { type: "applyStatus", status, durationOwnerTurns },
      ],
    };
    const targetId = `playerTwo.monster.${id}.1` as TargetId;
    const state = readyState(setupWithSpells([spell], [monster(targetId)]));

    const result = cast(state, id, targetId);
    expect(result.players[1].monsters[0]?.statuses?.[0]).toMatchObject({
      type: status,
      remainingOwnerTurns: durationOwnerTurns,
      ...(status === "burn" ? { damage: 3 } : {}),
    });
  });

  it.each([
    ["stompI", 2],
    ["stompII", 3],
    ["stompIII", 4],
  ] as const)("resolves the %s production scenario", (id, amount) => {
    const spell: SpellDefinition = {
      id,
      nameKey: `spell.${id}.name`,
      element: "ice",
      rarity: "common",
      baseEnergyPenalty: 0.8,
      baseCooldownPenalty: 0.3,
      targeting: { selection: "none", allowedTargets: [] },
      effects: [{ type: "dealDamageToAll", scope: "enemyMonsters", amount, element: "ice" }],
    };
    const targetId = `playerTwo.monster.${id}.1` as TargetId;
    const state = readyState(setupWithSpells([spell], [monster(targetId)]));

    const result = cast(state, id, playerOneHero);
    expect(result.players[1].monsters[0]?.health).toBe(6 - amount);
  });

  it.each([
    ["carbonize", "burn"],
    ["electroshock", "shock"],
    ["deepFreezing", "freeze"],
  ] as const)("resolves the %s production scenario", (id, status) => {
    const nestedEffect =
      status === "burn"
        ? ({ type: "applyStatus", status, damage: 3, durationOwnerTurns: 1 } as const)
        : ({ type: "applyStatus", status, durationOwnerTurns: 1 } as const);
    const spell: SpellDefinition = {
      id,
      nameKey: `spell.${id}.name`,
      element: status === "burn" ? "fire" : status === "shock" ? "electric" : "ice",
      rarity: "refined",
      baseEnergyPenalty: 0.7,
      baseCooldownPenalty: 0.5,
      targeting: { selection: "none", allowedTargets: [] },
      effects: [{ type: "forEachMonster", scope: "allMonsters", effect: nestedEffect }],
    };
    const alliedId = `playerOne.monster.${id}.1` as TargetId;
    const enemyId = `playerTwo.monster.${id}.1` as TargetId;
    const state = readyState(setupWithSpells([spell], [monster(enemyId)]));
    state.players[0].monsters.push(monster(alliedId));

    const result = cast(state, id, playerOneHero);
    expect(result.players[0].monsters[0]?.statuses?.[0]?.type).toBe(status);
    expect(result.players[1].monsters[0]?.statuses?.[0]?.type).toBe(status);
  });

  it("ticks Burn before cooldowns, lets Shield negate the hit, and expires it", () => {
    const burn: SpellDefinition = {
      id: "burnI",
      nameKey: "spell.burnI.name",
      element: "fire",
      rarity: "common",
      baseEnergyPenalty: 0.3,
      baseCooldownPenalty: 0.4,
      targeting: { selection: "one", allowedTargets: ["anyMonster"] },
      effects: [{ type: "applyStatus", status: "burn", damage: 3, durationOwnerTurns: 1 }],
    };
    const targetId = "playerTwo.monster.guard.1" as TargetId;
    let state = readyState(
      setupWithSpells([burn], [monster(targetId, { shieldActive: true, currentCooldown: 1 })]),
    );

    state = cast(state, burn.id, targetId);
    expect(state.players[1].monsters[0]?.statuses).toMatchObject([
      { type: "burn", remainingOwnerTurns: 1, damage: 3 },
    ]);

    const turn = applyBattleAction(state, { type: "endTurn", playerId: "playerOne" });
    const target = turn.state.players[1].monsters[0]!;
    expect(target.health).toBe(6);
    expect(target.shieldActive).toBe(false);
    expect(target.statuses).toEqual([]);
    expect(turn.events.map((event) => event.type)).toEqual([
      "turnEnded",
      "shieldBroken",
      "statusRemoved",
      "cooldownChanged",
      "turnStarted",
    ]);
  });

  it("replaces a status only when the new remaining duration is longer", () => {
    const burnI: SpellDefinition = {
      id: "burnI",
      nameKey: "spell.burnI.name",
      element: "fire",
      rarity: "common",
      baseEnergyPenalty: 0.3,
      baseCooldownPenalty: 0.4,
      targeting: { selection: "one", allowedTargets: ["anyMonster"] },
      effects: [{ type: "applyStatus", status: "burn", damage: 3, durationOwnerTurns: 1 }],
    };
    const burnIII: SpellDefinition = {
      ...burnI,
      id: "burnIII",
      nameKey: "spell.burnIII.name",
      rarity: "rare",
      effects: [{ type: "applyStatus", status: "burn", damage: 3, durationOwnerTurns: 3 }],
    };
    const targetId = "playerTwo.monster.burning.1" as TargetId;
    const existingBurn = {
      type: "burn" as const,
      source: { playerId: "playerOne", spellId: "existingBurn", gemId: "existingGem" },
      remainingOwnerTurns: 2,
      damage: 3,
      element: "fire" as const,
    };

    let state = readyState(
      setupWithSpells(
        [burnI, burnIII],
        [monster(targetId, { statuses: [structuredClone(existingBurn)] })],
      ),
    );
    state = cast(state, burnI.id, targetId);
    expect(state.players[1].monsters[0]?.statuses?.[0]).toMatchObject({
      source: { spellId: "existingBurn" },
      remainingOwnerTurns: 2,
    });

    state = cast(state, burnIII.id, targetId);
    expect(state.players[1].monsters[0]?.statuses?.[0]).toMatchObject({
      source: { spellId: "burnIII" },
      remainingOwnerTurns: 3,
    });
  });

  it("lets Freeze disable Taunt, blocks attacks for a full owner turn, then expires", () => {
    const freeze: SpellDefinition = {
      id: "freezeI",
      nameKey: "spell.freezeI.name",
      element: "ice",
      rarity: "common",
      baseEnergyPenalty: 0.5,
      baseCooldownPenalty: 0.2,
      targeting: { selection: "one", allowedTargets: ["anyMonster"] },
      effects: [{ type: "applyStatus", status: "freeze", durationOwnerTurns: 1 }],
    };
    const damage: SpellDefinition = {
      id: "legacyDamage",
      nameKey: "spell.legacyDamage.name",
      element: "fire",
      rarity: "common",
      baseEnergyPenalty: 0,
      baseCooldownPenalty: 0,
      effects: [{ type: "dealDamage", amount: 1, target: "any" }],
    };
    const targetId = "playerTwo.monster.taunt.1" as TargetId;
    let state = readyState(
      setupWithSpells([freeze, damage], [monster(targetId, { skill: "taunt" })]),
    );

    state = cast(state, freeze.id, targetId);
    expect(() => cast(state, damage.id, playerTwoHero)).not.toThrow();
    state = cast(state, damage.id, playerTwoHero);
    state = applyBattleAction(state, { type: "endTurn", playerId: "playerOne" }).state;

    expect(() =>
      applyBattleAction(state, {
        type: "useMonster",
        playerId: "playerTwo",
        monsterInstanceId: targetId,
        targetId: playerOneHero,
      }),
    ).toThrow("cannot attack while affected by freeze");

    state = applyBattleAction(state, { type: "endTurn", playerId: "playerTwo" }).state;
    expect(state.players[1].monsters[0]?.statuses).toEqual([]);
  });

  it("keeps Taunt active while Shock prevents the monster from attacking", () => {
    const shock: SpellDefinition = {
      id: "shockI",
      nameKey: "spell.shockI.name",
      element: "electric",
      rarity: "common",
      baseEnergyPenalty: 0.2,
      baseCooldownPenalty: 0.3,
      targeting: { selection: "one", allowedTargets: ["anyMonster"] },
      effects: [{ type: "applyStatus", status: "shock", durationOwnerTurns: 1 }],
    };
    const damage: SpellDefinition = {
      id: "legacyDamage",
      nameKey: "spell.legacyDamage.name",
      element: "fire",
      rarity: "common",
      baseEnergyPenalty: 0,
      baseCooldownPenalty: 0,
      effects: [{ type: "dealDamage", amount: 1, target: "any" }],
    };
    const targetId = "playerTwo.monster.taunt.1" as TargetId;
    let state = readyState(
      setupWithSpells([shock, damage], [monster(targetId, { skill: "taunt" })]),
    );

    state = cast(state, shock.id, targetId);
    expect(() => cast(state, damage.id, playerTwoHero)).toThrow("protected by Taunt");
  });

  it("resolves no-selection area damage from a stable snapshot and ignores explicit entries", () => {
    const stomp: SpellDefinition = {
      id: "stompII",
      nameKey: "spell.stompII.name",
      element: "ice",
      rarity: "refined",
      baseEnergyPenalty: 0.8,
      baseCooldownPenalty: 0.3,
      targeting: { selection: "none", allowedTargets: [] },
      effects: [{ type: "dealDamageToAll", scope: "enemyMonsters", amount: 3, element: "ice" }],
    };
    const shieldedId = "playerTwo.monster.shielded.1" as TargetId;
    const fragileId = "playerTwo.monster.fragile.1" as TargetId;
    const state = readyState(
      setupWithSpells(
        [stomp],
        [
          monster(shieldedId, { shieldActive: true }),
          monster(fragileId, { element: "electric", health: 3, maxHealth: 3 }),
        ],
      ),
    );

    const result = applyBattleAction(state, {
      type: "useRing",
      playerId: "playerOne",
      ringInstanceId: "playerOne.ring.stompII",
      targetId: playerOneHero,
      enchantmentTargets: { "playerOne.gem.stompII": "missing.hero" as TargetId },
    });

    expect(result.state.players[1].monsters.map((candidate) => candidate.id)).toEqual([shieldedId]);
    expect(result.state.players[1].monsters[0]?.shieldActive).toBe(false);
    expect(result.events.find((event) => event.type === "spellCast")).not.toHaveProperty(
      "targetId",
    );
    expect(result.events.map((event) => event.type)).toContain("monsterDestroyed");
  });

  it("cleanses temporary statuses without changing skills or Shield state", () => {
    const cleanse: SpellDefinition = {
      id: "cleanse",
      nameKey: "spell.cleanse.name",
      element: "ice",
      rarity: "rare",
      baseEnergyPenalty: 0.8,
      baseCooldownPenalty: 0.3,
      targeting: { selection: "one", allowedTargets: ["anyMonster"] },
      effects: [
        {
          type: "removeStatuses",
          target: "selected",
          scope: "allTemporaryStatuses",
          removeSkills: false,
        },
      ],
    };
    const targetId = "playerTwo.monster.marked.1" as TargetId;
    const state = readyState(
      setupWithSpells(
        [cleanse],
        [
          monster(targetId, {
            skill: "taunt",
            shieldActive: true,
            statuses: [
              {
                type: "burn",
                source: { playerId: "playerOne", spellId: "burnI", gemId: "sourceGem" },
                remainingOwnerTurns: 2,
                damage: 3,
                element: "fire",
              },
              {
                type: "freeze",
                source: { playerId: "playerOne", spellId: "freezeI", gemId: "sourceGem" },
                remainingOwnerTurns: 1,
              },
            ],
          }),
        ],
      ),
    );

    const result = cast(state, cleanse.id, targetId);
    expect(result.players[1].monsters[0]).toMatchObject({
      skill: "taunt",
      shieldActive: true,
      statuses: [],
    });
  });

  it("caps immediate cooldown increases at the monster's resolved cooldown", () => {
    const rimeLock: SpellDefinition = {
      id: "rimeLock",
      nameKey: "spell.rimeLock.name",
      element: "ice",
      rarity: "common",
      baseEnergyPenalty: 0.5,
      baseCooldownPenalty: 0.2,
      targeting: { selection: "one", allowedTargets: ["anyMonster"] },
      effects: [
        {
          type: "modifyCurrentCooldown",
          target: "selected",
          amount: 1,
          maximumFrom: "resolvedBaseCooldown",
        },
      ],
    };
    const targetId = "playerTwo.monster.cooldown.1" as TargetId;
    const state = readyState(
      setupWithSpells([rimeLock], [monster(targetId, { cooldown: 3, currentCooldown: 2 })]),
    );

    const result = cast(state, rimeLock.id, targetId);
    expect(result.players[1].monsters[0]?.currentCooldown).toBe(3);
  });
});

describe("production spell slice B engine effects", () => {
  function productionSpell(
    id: string,
    element: SpellDefinition["element"],
    targeting: NonNullable<SpellDefinition["targeting"]>,
    effects: SpellDefinition["effects"],
  ): SpellDefinition {
    return {
      id,
      nameKey: `spell.${id}.name`,
      element,
      rarity: "refined",
      baseEnergyPenalty: 0.5,
      baseCooldownPenalty: 0.5,
      targeting,
      effects,
    };
  }

  function stateWithAlliedMonster(
    spells: SpellDefinition[],
    alliedMonster: MonsterCombatInstance,
    enemies: MonsterCombatInstance[] = [],
  ): BattleState {
    const setup = setupWithSpells(spells, enemies);
    setup.players[0].monsters.push(alliedMonster);
    return readyState(setup);
  }

  it.each([
    ["giftPierce", "pierce"],
    ["giftRage", "rage"],
    ["giftMultiHit", "multiHit"],
    ["giftTaunt", "taunt"],
    ["giftShield", "shield"],
  ] as const)("resolves the %s production scenario", (id, skill) => {
    const spell = productionSpell(
      id,
      skill === "pierce" || skill === "rage" ? "fire" : skill === "multiHit" ? "electric" : "ice",
      { selection: "one", allowedTargets: ["anyMonster"] },
      [
        {
          type: "grantSkill",
          skill,
          duration: "untilMonsterDestroyed",
          ...(skill === "shield" ? { activateImmediately: true as const } : {}),
          duplicateBehavior: "noEffect",
        },
      ],
    );
    const targetId = "playerOne.monster.gifted.1" as TargetId;
    const result = cast(stateWithAlliedMonster([spell], monster(targetId)), id, targetId);
    const target = result.players[0].monsters[0]!;

    expect(target.grantedSkills).toEqual([
      { skill, source: { playerId: "playerOne", spellId: id, gemId: `playerOne.gem.${id}` } },
    ]);
    expect(result.log.filter((event) => event.type === "skillGranted")).toHaveLength(1);
    if (skill === "shield") {
      expect(target.shieldActive).toBe(true);
      expect(target.shields?.[0]?.source.kind).toBe("grantedSkill");
    }
  });

  it("does not duplicate a natural or previously granted skill and activates granted Rage immediately", () => {
    const giftRage = productionSpell(
      "giftRage",
      "fire",
      { selection: "one", allowedTargets: ["anyMonster"] },
      [
        {
          type: "grantSkill",
          skill: "rage",
          duration: "untilMonsterDestroyed",
          duplicateBehavior: "noEffect",
        },
      ],
    );
    const targetId = "playerOne.monster.rager.1" as TargetId;
    let state = cast(
      stateWithAlliedMonster(
        [giftRage],
        monster(targetId, { health: 2, maxHealth: 6, baseDamage: 5, damage: 5 }),
      ),
      giftRage.id,
      targetId,
    );
    expect(state.players[0].monsters[0]).toMatchObject({ rageActive: true, damage: 6 });
    state.players[0].rings[0]!.currentCooldown = 0;
    state.players[0].energy.current = 1;
    state = cast(state, giftRage.id, targetId);
    expect(state.players[0].monsters[0]?.grantedSkills).toHaveLength(1);
    expect(state.log.filter((event) => event.type === "skillGranted")).toHaveLength(1);
  });

  it("makes granted MultiHit functional on the same turn", () => {
    const gift = productionSpell(
      "giftMultiHit",
      "electric",
      { selection: "one", allowedTargets: ["anyMonster"] },
      [
        {
          type: "grantSkill",
          skill: "multiHit",
          duration: "untilMonsterDestroyed",
          duplicateBehavior: "noEffect",
        },
      ],
    );
    const allyId = "playerOne.monster.attacker.1" as TargetId;
    const enemyOne = "playerTwo.monster.one.1" as TargetId;
    const enemyTwo = "playerTwo.monster.two.1" as TargetId;
    let state = cast(
      stateWithAlliedMonster([gift], monster(allyId), [monster(enemyOne), monster(enemyTwo)]),
      gift.id,
      allyId,
    );
    state = applyBattleAction(state, {
      type: "useMonster",
      playerId: "playerOne",
      monsterInstanceId: allyId,
      targetId: enemyOne,
    }).state;
    expect(state.players[1].monsters.map((candidate) => candidate.health)).toEqual([4, 4]);
  });

  it("makes granted Pierce functional without changing the natural skill", () => {
    const gift = productionSpell(
      "giftPierce",
      "fire",
      { selection: "one", allowedTargets: ["anyMonster"] },
      [
        {
          type: "grantSkill",
          skill: "pierce",
          duration: "untilMonsterDestroyed",
          duplicateBehavior: "noEffect",
        },
      ],
    );
    const allyId = "playerOne.monster.piercer.1" as TargetId;
    const enemyId = "playerTwo.monster.fragile.1" as TargetId;
    let state = cast(
      stateWithAlliedMonster([gift], monster(allyId, { skill: "haste", damage: 4 }), [
        monster(enemyId, { health: 1, maxHealth: 1 }),
      ]),
      gift.id,
      allyId,
    );
    state.startingPlayerId = "playerTwo";
    state = applyBattleAction(state, {
      type: "useMonster",
      playerId: "playerOne",
      monsterInstanceId: allyId,
      targetId: enemyId,
    }).state;
    expect(state.players[0].monsters[0]?.skill).toBe("haste");
    expect(state.players[1].hero.health).toBe(27);
  });

  it("enforces granted Taunt immediately and lets Freeze suppress it", () => {
    const gift = productionSpell(
      "giftTaunt",
      "ice",
      { selection: "one", allowedTargets: ["anyMonster"] },
      [
        {
          type: "grantSkill",
          skill: "taunt",
          duration: "untilMonsterDestroyed",
          duplicateBehavior: "noEffect",
        },
      ],
    );
    const tauntId = "playerTwo.monster.taunt.1" as TargetId;
    const state = cast(readyState(setupWithSpells([gift], [monster(tauntId)])), gift.id, tauntId);
    state.players[0].rings[0]!.currentCooldown = 0;
    state.players[0].energy.current = 1;
    expect(() => cast(state, gift.id, playerTwoHero, tauntId)).toThrow(/protected by Taunt/);
    state.players[1].monsters[0]!.statuses = [
      {
        type: "freeze",
        source: { playerId: "playerOne", spellId: "freezeI", gemId: "freezeGem" },
        remainingOwnerTurns: 1,
      },
    ];
    expect(() => cast(state, gift.id, playerTwoHero, tauntId)).not.toThrow();
  });

  it("resolves Crystal Skin, expires it before Burn, and preserves a different Shield source", () => {
    const crystalSkin = productionSpell(
      "crystalSkin",
      "ice",
      { selection: "one", allowedTargets: ["alliedMonster"] },
      [
        {
          type: "grantTemporaryShield",
          target: "selected",
          expires: "startOfTargetControllerNextTurn",
          duplicateBehavior: "noEffect",
        },
      ],
    );
    const targetId = "playerOne.monster.crystal.1" as TargetId;
    let state = cast(
      stateWithAlliedMonster([crystalSkin], monster(targetId)),
      crystalSkin.id,
      targetId,
    );
    const target = state.players[0].monsters[0]!;
    expect(target.shieldActive).toBe(true);
    target.statuses = [
      {
        type: "burn",
        source: { playerId: "playerTwo", spellId: "burnI", gemId: "enemyGem" },
        remainingOwnerTurns: 1,
        damage: 2,
        element: "fire",
      },
    ];
    state = applyBattleAction(state, { type: "endTurn", playerId: "playerOne" }).state;
    state = applyBattleAction(state, { type: "endTurn", playerId: "playerTwo" }).state;
    expect(state.players[0].monsters[0]).toMatchObject({ health: 4, shieldActive: false });
    const startEvents = state.log.slice(-5).map((event) => event.type);
    expect(startEvents.indexOf("shieldExpired")).toBeLessThan(startEvents.indexOf("damageDealt"));
  });

  it("consumes at most one source-aware Shield per damage instance", () => {
    const targetId = "playerOne.monster.doubleShield.1" as TargetId;
    const attackerOne = "playerTwo.monster.attackerOne.1" as TargetId;
    const attackerTwo = "playerTwo.monster.attackerTwo.1" as TargetId;
    const state = readyState(setupWithSpells([], [monster(attackerOne), monster(attackerTwo)]));
    state.players[0].monsters.push(
      monster(targetId, {
        shieldActive: true,
        shields: [
          {
            source: {
              kind: "grantedSkill",
              playerId: "playerOne",
              spellId: "giftShield",
              gemId: "giftGem",
            },
          },
          {
            source: {
              kind: "temporary",
              playerId: "playerOne",
              spellId: "crystalSkin",
              gemId: "crystalGem",
            },
          },
        ],
      }),
    );
    state.activePlayerId = "playerTwo";
    let result = applyBattleAction(state, {
      type: "useMonster",
      playerId: "playerTwo",
      monsterInstanceId: attackerOne,
      targetId,
    });
    expect(result.state.players[0].monsters[0]).toMatchObject({ health: 6, shieldActive: true });
    result = applyBattleAction(result.state, {
      type: "useMonster",
      playerId: "playerTwo",
      monsterInstanceId: attackerTwo,
      targetId,
    });
    expect(result.state.players[0].monsters[0]).toMatchObject({ health: 6, shieldActive: false });
  });

  it("resolves Quick Pulse and permits an immediate same-turn attack", () => {
    const quickPulse = productionSpell(
      "quickPulse",
      "electric",
      { selection: "one", allowedTargets: ["alliedMonster"] },
      [{ type: "setCurrentCooldown", target: "selected", value: 0 }],
    );
    const targetId = "playerOne.monster.quick.1" as TargetId;
    const enemyId = "playerTwo.monster.target.1" as TargetId;
    let state = cast(
      stateWithAlliedMonster([quickPulse], monster(targetId, { currentCooldown: 2 }), [
        monster(enemyId),
      ]),
      quickPulse.id,
      targetId,
    );
    expect(state.players[0].monsters[0]?.currentCooldown).toBe(0);
    state = applyBattleAction(state, {
      type: "useMonster",
      playerId: "playerOne",
      monsterInstanceId: targetId,
      targetId: enemyId,
    }).state;
    expect(state.players[1].monsters[0]?.health).toBe(4);
  });

  it("resolves Short Circuit at the full resolved cooldown", () => {
    const spell = productionSpell(
      "shortCircuit",
      "electric",
      { selection: "one", allowedTargets: ["enemyMonster"] },
      [{ type: "setCurrentCooldown", target: "selected", valueFrom: "resolvedBaseCooldown" }],
    );
    const targetId = "playerTwo.monster.short.1" as TargetId;
    const state = cast(
      readyState(
        setupWithSpells([spell], [monster(targetId, { cooldown: 4, currentCooldown: 1 })]),
      ),
      spell.id,
      targetId,
    );
    expect(state.players[1].monsters[0]?.currentCooldown).toBe(4);
  });

  it("resolves Zero Interval for the current allied board snapshot", () => {
    const spell = productionSpell(
      "zeroInterval",
      "electric",
      { selection: "one", allowedTargets: ["alliedMonster"] },
      [{ type: "setCurrentCooldownForAll", scope: "alliedMonsters", value: 0 }],
    );
    const firstId = "playerOne.monster.first.1" as TargetId;
    const secondId = "playerOne.monster.second.1" as TargetId;
    const setup = setupWithSpells([spell], []);
    setup.players[0].monsters.push(
      monster(firstId, { currentCooldown: 1 }),
      monster(secondId, { currentCooldown: 2 }),
    );
    const state = cast(readyState(setup), spell.id, firstId);
    expect(state.players[0].monsters.map((candidate) => candidate.currentCooldown)).toEqual([0, 0]);
  });

  it("resolves Refresh deterministically and can ready its own ring for same-turn reuse", () => {
    const refresh = productionSpell("refresh", "ice", { selection: "none", allowedTargets: [] }, [
      {
        type: "randomTarget",
        scope: "alliedRingsWithCooldownAboveZero",
        onSuccess: { type: "modifyRingCurrentCooldown", amount: -1, minimum: 0 },
      },
    ]);
    const initial = readyState(setupWithSpells([refresh], []));
    const first = cast(initial, refresh.id, playerTwoHero);
    expect(first.players[0].rings[0]?.currentCooldown).toBe(0);
    expect(first.randomCursor).toBe(1);
    expect(first.log.find((event) => event.type === "randomTargetSelected")).toMatchObject({
      targetId: "playerOne.ring.refresh",
    });
    first.players[0].energy.current = 1;
    const second = cast(first, refresh.id, playerTwoHero);
    expect(second.randomCursor).toBe(2);
    expect(second.players[0].rings[0]?.currentCooldown).toBe(0);
  });
});

describe("production spell slice C engine effects", () => {
  function sliceCSpell(
    id: string,
    element: SpellDefinition["element"],
    targeting: NonNullable<SpellDefinition["targeting"]>,
    effects: SpellDefinition["effects"],
  ): SpellDefinition {
    return {
      id,
      nameKey: `spell.${id}.name`,
      element,
      rarity: "rare",
      baseEnergyPenalty: 0.5,
      baseCooldownPenalty: 0.5,
      targeting,
      effects,
    };
  }

  it.each([
    ["damageOnKill", "fire", { type: "modifySupportedRingDamage", amount: 2, duration: "battle" }],
    [
      "energyOnKill",
      "electric",
      { type: "restoreCurrentTurnEnergy", amount: 1, cap: "currentTurnMaximum" },
    ],
    [
      "cooldownOnKill",
      "ice",
      { type: "modifySupportedRingCurrentCooldown", amount: -1, minimum: 0 },
    ],
  ] as const)("resolves the %s persistent trigger scenario", (id, element, triggerEffect) => {
    const spell = sliceCSpell(id, element, { selection: "none", allowedTargets: [] }, [
      { type: "registerTrigger", event: "supportedRingKilledMonster", effect: triggerEffect },
    ]);
    let state = cast(readyState(setupWithSpells([spell], [])), id, playerTwoHero);
    const ring = state.players[0].rings[0]!;
    expect(ring.triggers).toHaveLength(1);

    ring.currentCooldown = 0;
    ring.damage = 6;
    state.players[0].energy.current = 10;
    const targetId = `playerTwo.monster.${id}.1` as TargetId;
    state.players[1].monsters.push(monster(targetId, { health: 5, maxHealth: 5 }));
    const beforeEnergy = state.players[0].energy.current;
    state = cast(state, id, targetId);

    expect(state.log.filter((event) => event.type === "triggerActivated")).toHaveLength(1);
    expect(state.players[0].rings[0]?.triggers).toHaveLength(1);
    if (id === "damageOnKill") expect(state.players[0].rings[0]?.damage).toBe(8);
    if (id === "energyOnKill") expect(state.players[0].energy.current).toBe(beforeEnergy);
    if (id === "cooldownOnKill") expect(state.players[0].rings[0]?.currentCooldown).toBe(0);
  });

  it("does not activate a supported-ring trigger for a later spell kill", () => {
    const trigger = sliceCSpell("damageOnKill", "fire", { selection: "none", allowedTargets: [] }, [
      {
        type: "registerTrigger",
        event: "supportedRingKilledMonster",
        effect: { type: "modifySupportedRingDamage", amount: 2, duration: "battle" },
      },
    ]);
    const blast = sliceCSpell(
      "blast",
      "fire",
      { selection: "one", allowedTargets: ["anyMonster"] },
      [{ type: "dealDamage", amount: 8, target: "selected" }],
    );
    let state = cast(readyState(setupWithSpells([trigger, blast], [])), trigger.id, playerTwoHero);
    const ring = state.players[0].rings[0]!;
    ring.currentCooldown = 0;
    ring.gems[0] = structuredClone(state.players[0].rings[1]!.gems[0]!);
    state.players[0].energy.current = 1;
    const targetId = "playerTwo.monster.spellVictim.1" as TargetId;
    state.players[1].monsters.push(monster(targetId));
    state = applyBattleAction(state, {
      type: "useRing",
      playerId: "playerOne",
      ringInstanceId: ring.id,
      targetId,
      enchantmentTargets: { [ring.gems[0]!.id]: targetId },
    }).state;
    expect(state.players[0].rings[0]?.damage).toBe(0);
    expect(state.log.filter((event) => event.type === "triggerActivated")).toHaveLength(0);
  });

  it("resolves pierceLegacy from the pre-damage preparation phase", () => {
    const spell = sliceCSpell(
      "pierceLegacy",
      "fire",
      { selection: "one", allowedTargets: ["enemyMonster"] },
      [
        {
          type: "conditionalPierceForAction",
          target: "selectedEnemyMonster",
          source: "ringAndGemDamage",
        },
      ],
    );
    const targetId = "playerTwo.monster.pierced.1" as TargetId;
    const state = readyState(
      setupWithSpells([spell], [monster(targetId, { health: 3, maxHealth: 3 })]),
    );
    state.startingPlayerId = "playerTwo";
    state.players[0].rings[0]!.damage = 7;
    const result = cast(state, spell.id, targetId);
    expect(result.players[1].hero.health).toBe(26);
    expect(result.log.some((event) => event.type === "actionPierceOverflow")).toBe(true);
    expect(
      result.log.some((event) => event.type === "spellCast" && event.spellId === spell.id),
    ).toBe(true);
  });

  it("resolves Bloodflame after Shield and Rage, then applies its permanent bonus", () => {
    const spell = sliceCSpell(
      "bloodflame",
      "fire",
      { selection: "one", allowedTargets: ["alliedMonster"] },
      [
        { type: "dealDamage", amount: 2, element: "fire", target: "selected" },
        {
          type: "ifTargetSurvives",
          effect: { type: "modifyMonsterDamage", amount: 2, duration: "battle" },
        },
      ],
    );
    const targetId = "playerOne.monster.bloodflame.1" as TargetId;
    const setup = setupWithSpells([spell], []);
    setup.players[0].monsters.push(
      monster(targetId, { skill: "rage", health: 3, maxHealth: 6, baseDamage: 5, damage: 5 }),
    );
    const result = cast(readyState(setup), spell.id, playerOneHero, targetId);
    expect(result.players[0].monsters[0]).toMatchObject({ health: 1, rageActive: true, damage: 8 });
    const eventTypes = result.log.map((event) => event.type);
    expect(eventTypes.indexOf("rageActivated")).toBeLessThan(
      eventTypes.indexOf("monsterDamageChanged"),
    );
  });

  it("lets Shield block Bloodflame damage while still granting the bonus", () => {
    const spell = sliceCSpell(
      "bloodflame",
      "fire",
      { selection: "one", allowedTargets: ["alliedMonster"] },
      [
        { type: "dealDamage", amount: 2, element: "fire", target: "selected" },
        {
          type: "ifTargetSurvives",
          effect: { type: "modifyMonsterDamage", amount: 2, duration: "battle" },
        },
      ],
    );
    const targetId = "playerOne.monster.shieldedBloodflame.1" as TargetId;
    const setup = setupWithSpells([spell], []);
    setup.players[0].monsters.push(monster(targetId, { shieldActive: true }));
    const result = cast(readyState(setup), spell.id, playerOneHero, targetId);
    expect(result.players[0].monsters[0]).toMatchObject({
      health: 6,
      shieldActive: false,
      damage: 4,
    });
  });

  it("resolves Funeral Brand when ring damage destroys its prepared target", () => {
    const spell = sliceCSpell(
      "funeralBrand",
      "fire",
      { selection: "one", allowedTargets: ["enemyMonster"] },
      [
        {
          type: "registerActionScopedTrigger",
          event: "selectedMonsterDestroyedDuringCurrentRingAction",
          effect: {
            type: "dealDamageToControllingHero",
            amountFrom: "destroyedMonsterCurrentDamage",
            element: "fire",
          },
        },
      ],
    );
    const targetId = "playerTwo.monster.branded.1" as TargetId;
    const state = readyState(
      setupWithSpells([spell], [monster(targetId, { health: 2, maxHealth: 2, damage: 4 })]),
    );
    state.startingPlayerId = "playerTwo";
    state.players[0].rings[0]!.damage = 3;
    const result = cast(state, spell.id, targetId);
    expect(result.players[1].hero.health).toBe(26);
    expect(result.log.filter((event) => event.type === "triggerActivated")).toHaveLength(1);
  });

  it("keeps Funeral Brand armed for destruction by a later socket", () => {
    const funeralBrand = sliceCSpell(
      "funeralBrand",
      "fire",
      { selection: "one", allowedTargets: ["enemyMonster"] },
      [
        {
          type: "registerActionScopedTrigger",
          event: "selectedMonsterDestroyedDuringCurrentRingAction",
          effect: {
            type: "dealDamageToControllingHero",
            amountFrom: "destroyedMonsterCurrentDamage",
            element: "fire",
          },
        },
      ],
    );
    const blast = sliceCSpell(
      "brandBlast",
      "fire",
      { selection: "one", allowedTargets: ["anyMonster"] },
      [{ type: "dealDamage", amount: 10, target: "selected" }],
    );
    const targetId = "playerTwo.monster.lateBrand.1" as TargetId;
    const setup = setupWithSpells([funeralBrand, blast], [monster(targetId, { damage: 5 })]);
    const ring = setup.players[0].rings[0]!;
    ring.gems.push(structuredClone(setup.players[0].rings[1]!.gems[0]!));
    ring.socketCount = 2;
    const state = readyState(setup);
    state.startingPlayerId = "playerTwo";
    const result = applyBattleAction(state, {
      type: "useRing",
      playerId: "playerOne",
      ringInstanceId: ring.id,
      targetId: playerTwoHero,
      enchantmentTargets: {
        "playerOne.gem.funeralBrand": targetId,
        "playerOne.gem.brandBlast": targetId,
      },
    }).state;
    expect(result.players[1].hero.health).toBe(25);
    expect(result.players[1].monsters).toHaveLength(0);
  });

  it("lets first-turn hero protection block prepared Pierce and Funeral Brand damage", () => {
    const pierce = sliceCSpell(
      "pierceLegacy",
      "fire",
      { selection: "one", allowedTargets: ["enemyMonster"] },
      [
        {
          type: "conditionalPierceForAction",
          target: "selectedEnemyMonster",
          source: "ringAndGemDamage",
        },
      ],
    );
    const funeral = sliceCSpell(
      "funeralBrand",
      "fire",
      { selection: "one", allowedTargets: ["enemyMonster"] },
      [
        {
          type: "registerActionScopedTrigger",
          event: "selectedMonsterDestroyedDuringCurrentRingAction",
          effect: {
            type: "dealDamageToControllingHero",
            amountFrom: "destroyedMonsterCurrentDamage",
            element: "fire",
          },
        },
      ],
    );
    const targetId = "playerTwo.monster.protected.1" as TargetId;
    const setup = setupWithSpells(
      [pierce, funeral],
      [monster(targetId, { health: 2, maxHealth: 2, damage: 5 })],
    );
    const ring = setup.players[0].rings[0]!;
    ring.damage = 8;
    ring.gems.push(structuredClone(setup.players[0].rings[1]!.gems[0]!));
    ring.socketCount = 2;
    const result = applyBattleAction(readyState(setup), {
      type: "useRing",
      playerId: "playerOne",
      ringInstanceId: ring.id,
      targetId,
      enchantmentTargets: {
        "playerOne.gem.pierceLegacy": targetId,
        "playerOne.gem.funeralBrand": targetId,
      },
    }).state;
    expect(result.players[1].hero.health).toBe(30);
    expect(result.log.some((event) => event.type === "actionPierceOverflow")).toBe(false);
  });

  it("resolves Last Breath once before removal and respects Taunt", () => {
    const lastBreath = sliceCSpell(
      "lastBreath",
      "fire",
      { selection: "one", allowedTargets: ["alliedMonster"] },
      [
        {
          type: "applyStatus",
          status: "lastBreath",
          duration: "endOfCurrentTurn",
          onDestroy: { type: "attackRandomLegalEnemyBeforeRemoval", ignoreCurrentCooldown: true },
        },
      ],
    );
    const blast = sliceCSpell(
      "selfBlast",
      "fire",
      { selection: "one", allowedTargets: ["anyMonster"] },
      [{ type: "dealDamage", amount: 10, target: "selected" }],
    );
    const doomedId = "playerOne.monster.doomed.1" as TargetId;
    const tauntId = "playerTwo.monster.taunt.1" as TargetId;
    const otherId = "playerTwo.monster.other.1" as TargetId;
    const setup = setupWithSpells(
      [lastBreath, blast],
      [monster(tauntId, { skill: "taunt" }), monster(otherId)],
    );
    setup.players[0].monsters.push(monster(doomedId, { damage: 4 }));
    const ring = setup.players[0].rings[0]!;
    ring.gems.push(structuredClone(setup.players[0].rings[1]!.gems[0]!));
    ring.socketCount = 2;
    const state = readyState(setup);
    const result = applyBattleAction(state, {
      type: "useRing",
      playerId: "playerOne",
      ringInstanceId: ring.id,
      targetId: playerOneHero,
      enchantmentTargets: {
        "playerOne.gem.lastBreath": doomedId,
        "playerOne.gem.selfBlast": doomedId,
      },
    }).state;
    expect(result.players[0].monsters).toHaveLength(0);
    expect(result.players[1].monsters.find((candidate) => candidate.id === tauntId)?.health).toBe(
      2,
    );
    expect(result.players[1].monsters.find((candidate) => candidate.id === otherId)?.health).toBe(
      6,
    );
    expect(result.log.filter((event) => event.type === "lastBreathTriggered")).toHaveLength(1);
  });

  it("expires unused Last Breath at the end of the current turn", () => {
    const spell = sliceCSpell(
      "lastBreath",
      "fire",
      { selection: "one", allowedTargets: ["alliedMonster"] },
      [
        {
          type: "applyStatus",
          status: "lastBreath",
          duration: "endOfCurrentTurn",
          onDestroy: { type: "attackRandomLegalEnemyBeforeRemoval", ignoreCurrentCooldown: true },
        },
      ],
    );
    const targetId = "playerOne.monster.survivor.1" as TargetId;
    const setup = setupWithSpells([spell], []);
    setup.players[0].monsters.push(monster(targetId));
    let state = cast(readyState(setup), spell.id, playerOneHero, targetId);
    state = applyBattleAction(state, { type: "endTurn", playerId: "playerOne" }).state;
    expect(state.players[0].monsters[0]?.statuses).toEqual([]);
  });
});

describe("production spell slice D engine effects", () => {
  function sliceDSpell(
    id: string,
    element: SpellDefinition["element"],
    targeting: NonNullable<SpellDefinition["targeting"]>,
    effects: SpellDefinition["effects"],
  ): SpellDefinition {
    return {
      id,
      nameKey: `spell.${id}.name`,
      element,
      rarity: "rare",
      baseEnergyPenalty: 0.5,
      baseCooldownPenalty: 0.5,
      targeting,
      effects,
    };
  }

  it("resolves Devotion with captured damage and deterministic recipient selection", () => {
    const spell = sliceDSpell(
      "devotion",
      "fire",
      { selection: "one", allowedTargets: ["alliedMonster"] },
      [
        { type: "destroyMonster", target: "selected" },
        {
          type: "randomTarget",
          scope: "otherAlliedMonsters",
          onSuccess: {
            type: "modifyMonsterDamage",
            amountFrom: "destroyedTargetCurrentDamage",
            duration: "battle",
          },
        },
      ],
    );
    const sacrificedId = "playerOne.monster.devotionSource.1" as TargetId;
    const recipientId = "playerOne.monster.devotionTarget.1" as TargetId;
    const setup = setupWithSpells([spell], []);
    setup.players[0].monsters.push(
      monster(sacrificedId, { damage: 5, shieldActive: true }),
      monster(recipientId, { damage: 2 }),
    );
    const result = cast(readyState(setup), spell.id, playerOneHero, sacrificedId);
    expect(result.players[0].monsters).toHaveLength(1);
    expect(result.players[0].monsters[0]).toMatchObject({ id: recipientId, damage: 7 });
    expect(result.log.some((event) => event.type === "shieldBroken")).toBe(false);
    expect(result.log.some((event) => event.type === "randomTargetSelected")).toBe(true);
  });

  it("resolves Sacrifice as two direct destructions that bypass Shield and Taunt", () => {
    const spell = sliceDSpell(
      "sacrifice",
      "electric",
      { selection: "one", allowedTargets: ["alliedMonster"] },
      [
        { type: "destroyMonster", target: "selected" },
        {
          type: "randomTarget",
          scope: "enemyMonsters",
          onSuccess: { type: "destroyMonster", target: "random" },
        },
      ],
    );
    const allyId = "playerOne.monster.sacrifice.1" as TargetId;
    const enemyId = "playerTwo.monster.sacrifice.1" as TargetId;
    const setup = setupWithSpells(
      [spell],
      [monster(enemyId, { shieldActive: true, skill: "taunt" })],
    );
    setup.players[0].monsters.push(monster(allyId, { shieldActive: true }));
    const result = cast(readyState(setup), spell.id, playerOneHero, allyId);
    expect(result.players[0].monsters).toHaveLength(0);
    expect(result.players[1].monsters).toHaveLength(0);
    expect(result.log.filter((event) => event.type === "monsterDestroyed")).toHaveLength(2);
    expect(result.log.some((event) => event.type === "shieldBroken")).toBe(false);
  });

  it("replays Slice D random selection deterministically from the battle seed", () => {
    const spell = sliceDSpell(
      "sacrifice",
      "electric",
      { selection: "one", allowedTargets: ["alliedMonster"] },
      [
        { type: "destroyMonster", target: "selected" },
        {
          type: "randomTarget",
          scope: "enemyMonsters",
          onSuccess: { type: "destroyMonster", target: "random" },
        },
      ],
    );
    const allyId = "playerOne.monster.seedSacrifice.1" as TargetId;
    const firstEnemyId = "playerTwo.monster.seedOne.1" as TargetId;
    const secondEnemyId = "playerTwo.monster.seedTwo.1" as TargetId;
    const makeState = () => {
      const setup = setupWithSpells([spell], [monster(firstEnemyId), monster(secondEnemyId)]);
      setup.players[0].monsters.push(monster(allyId));
      return readyState(setup);
    };
    const first = cast(makeState(), spell.id, playerOneHero, allyId);
    const second = cast(makeState(), spell.id, playerOneHero, allyId);
    const selected = (state: BattleState) =>
      state.log.find((event) => event.type === "randomTargetSelected")?.targetId;
    expect(selected(first)).toBe(selected(second));
    expect(first.randomCursor).toBe(1);
    expect(second.randomCursor).toBe(1);
  });

  it("resolves Destruction simultaneously and lets Last Breath observe direct destruction", () => {
    const spell = sliceDSpell("destruction", "fire", { selection: "none", allowedTargets: [] }, [
      { type: "destroyAllMonsters", scope: "allMonsters" },
    ]);
    const allyId = "playerOne.monster.lastBreathDoomed.1" as TargetId;
    const enemyId = "playerTwo.monster.destruction.1" as TargetId;
    const setup = setupWithSpells([spell], [monster(enemyId, { shieldActive: true })]);
    setup.players[0].monsters.push(
      monster(allyId, {
        damage: 4,
        statuses: [
          {
            type: "lastBreath",
            source: { playerId: "playerOne", spellId: "lastBreath", gemId: "lastBreathGem" },
            expires: "endOfCurrentTurn",
          },
        ],
      }),
    );
    const state = readyState(setup);
    state.startingPlayerId = "playerTwo";
    const result = cast(state, spell.id, playerTwoHero);
    expect(result.players[0].monsters).toHaveLength(0);
    expect(result.players[1].monsters).toHaveLength(0);
    expect(result.players[1].hero.health).toBe(26);
    expect(result.log.filter((event) => event.type === "lastBreathTriggered")).toHaveLength(1);
    expect(
      result.log.some((event) => event.type === "damageDealt" && event.targetId === enemyId),
    ).toBe(false);
  });

  it("resolves Chain Explosion from the captured pre-destruction damage", () => {
    const spell = sliceDSpell(
      "chainExplosion",
      "fire",
      { selection: "one", allowedTargets: ["alliedMonster"] },
      [
        { type: "captureStat", source: "selected", stat: "currentDamage" },
        { type: "destroyMonster", target: "selected" },
        {
          type: "dealDamageToAll",
          scope: "enemyMonsters",
          amountFromCapturedStat: "currentDamage",
          element: "fire",
        },
      ],
    );
    const sourceId = "playerOne.monster.explosion.1" as TargetId;
    const shieldedId = "playerTwo.monster.shielded.1" as TargetId;
    const hitId = "playerTwo.monster.hit.1" as TargetId;
    const setup = setupWithSpells(
      [spell],
      [monster(shieldedId, { shieldActive: true }), monster(hitId)],
    );
    setup.players[0].monsters.push(monster(sourceId, { damage: 4 }));
    const result = cast(readyState(setup), spell.id, playerOneHero, sourceId);
    expect(result.players[0].monsters).toHaveLength(0);
    expect(result.players[1].monsters).toEqual([
      expect.objectContaining({ id: shieldedId, health: 6, shieldActive: false }),
      expect.objectContaining({ id: hitId, health: 2 }),
    ]);
  });

  it("resolves Copy with current stats and permanent skills but fresh consumed state", () => {
    const spell = sliceDSpell(
      "copy",
      "electric",
      { selection: "one", allowedTargets: ["anyMonster"] },
      [
        {
          type: "copyMonster",
          source: "selected",
          copyMode: "currentCombatStats",
          initialCooldown: 1,
          copyStatuses: false,
        },
      ],
    );
    const sourceId = "playerTwo.monster.copySource.1" as TargetId;
    const source = monster(sourceId, {
      element: "ice",
      health: 3,
      maxHealth: 8,
      baseDamage: 2,
      damage: 7,
      cooldown: 4,
      currentCooldown: 3,
      skill: "shield",
      grantedSkills: [
        {
          skill: "pierce",
          source: { playerId: "playerTwo", spellId: "giftPierce", gemId: "giftGem" },
        },
      ],
      shieldActive: false,
      rageActive: true,
      statuses: [
        {
          type: "freeze",
          source: { playerId: "playerOne", spellId: "freezeI", gemId: "freezeGem" },
          remainingOwnerTurns: 1,
        },
      ],
    });
    const result = cast(
      readyState(setupWithSpells([spell], [source])),
      spell.id,
      playerOneHero,
      sourceId,
    );
    expect(result.players[0].monsters[0]).toMatchObject({
      ownerId: "playerOne",
      element: "ice",
      health: 3,
      maxHealth: 8,
      baseDamage: 2,
      damage: 7,
      cooldown: 4,
      currentCooldown: 1,
      skill: "shield",
      shieldActive: true,
      rageActive: false,
      grantedSkills: [expect.objectContaining({ skill: "pierce" })],
    });
    expect(result.players[0].monsters[0]?.statuses).toBeUndefined();
    expect(result.players[0].monsters[0]?.id).not.toBe(sourceId);
  });

  it("does not create Copy when all three allied board slots are occupied", () => {
    const spell = sliceDSpell(
      "copy",
      "electric",
      { selection: "one", allowedTargets: ["anyMonster"] },
      [
        {
          type: "copyMonster",
          source: "selected",
          copyMode: "currentCombatStats",
          initialCooldown: 1,
          copyStatuses: false,
        },
      ],
    );
    const sourceId = "playerTwo.monster.fullCopySource.1" as TargetId;
    const setup = setupWithSpells([spell], [monster(sourceId)]);
    setup.players[0].monsters.push(
      monster("playerOne.monster.one.1"),
      monster("playerOne.monster.two.1"),
      monster("playerOne.monster.three.1"),
    );
    const result = cast(readyState(setup), spell.id, playerOneHero, sourceId);
    expect(result.players[0].monsters).toHaveLength(3);
    expect(result.log.some((event) => event.type === "monsterCopied")).toBe(false);
  });

  it("resolves Transmute by preserving only controller and runtime slot identity", () => {
    const spell = sliceDSpell(
      "transmute",
      "electric",
      { selection: "one", allowedTargets: ["anyMonster"] },
      [
        {
          type: "transformMonster",
          target: "selected",
          result: {
            element: "electric",
            damage: 2,
            maxHealth: 2,
            currentHealth: 2,
            baseCooldown: 1,
            currentCooldown: 1,
            skill: null,
          },
        },
      ],
    );
    const targetId = "playerTwo.monster.transmute.1" as TargetId;
    const target = monster(targetId, {
      skill: "taunt",
      grantedSkills: [
        {
          skill: "rage",
          source: { playerId: "playerOne", spellId: "giftRage", gemId: "giftGem" },
        },
      ],
      shieldActive: true,
      rageActive: true,
      statuses: [
        {
          type: "shock",
          source: { playerId: "playerOne", spellId: "shockI", gemId: "shockGem" },
          remainingOwnerTurns: 1,
        },
      ],
      temporary: {
        source: { playerId: "playerTwo", spellId: "zerakaiProtocol", gemId: "zeroGem" },
        expires: "endOfCurrentTurn",
      },
    });
    const result = cast(
      readyState(setupWithSpells([spell], [target])),
      spell.id,
      playerOneHero,
      targetId,
    );
    expect(result.players[1].monsters[0]).toEqual({
      id: targetId,
      definitionId: "transmutedElectric",
      ownerId: "playerTwo",
      nameKey: "monster.transmutedElectric.name",
      element: "electric",
      rarity: "common",
      health: 2,
      maxHealth: 2,
      baseDamage: 2,
      damage: 2,
      cooldown: 1,
      currentCooldown: 1,
      speed: 0,
      shieldActive: false,
      rageActive: false,
    });
  });

  it("resolves Arc Relay against a living secondary target after the primary dies", () => {
    const spell = sliceDSpell(
      "arcRelay",
      "electric",
      { selection: "one", allowedTargets: ["anyMonster"] },
      [
        { type: "dealDamage", amount: 2, element: "electric", target: "selected" },
        {
          type: "randomTarget",
          scope: "otherMonstersControlledBySelectedTargetOwner",
          onSuccess: { type: "dealDamage", amount: 1, element: "electric" },
        },
      ],
    );
    const primaryId = "playerTwo.monster.arcPrimary.1" as TargetId;
    const secondaryId = "playerTwo.monster.arcSecondary.1" as TargetId;
    const result = cast(
      readyState(
        setupWithSpells(
          [spell],
          [monster(primaryId, { health: 1, maxHealth: 1 }), monster(secondaryId)],
        ),
      ),
      spell.id,
      playerOneHero,
      primaryId,
    );
    expect(result.players[1].monsters).toEqual([
      expect.objectContaining({ id: secondaryId, health: 5 }),
    ]);
    expect(result.log.find((event) => event.type === "randomTargetSelected")).toMatchObject({
      targetId: secondaryId,
    });
  });

  it("resolves Zerakai Protocol as a ready one-health skillless copy that expires", () => {
    const spell = sliceDSpell(
      "zerakaiProtocol",
      "electric",
      { selection: "one", allowedTargets: ["alliedMonster"] },
      [
        {
          type: "createTemporaryMonsterCopy",
          source: "selected",
          copyDamage: true,
          copyElement: true,
          maxHealth: 1,
          skill: null,
          initialCooldown: 0,
          expires: "endOfCurrentTurn",
        },
      ],
    );
    const sourceId = "playerOne.monster.zerakai.1" as TargetId;
    const enemyId = "playerTwo.monster.zerakaiTarget.1" as TargetId;
    const setup = setupWithSpells([spell], [monster(enemyId)]);
    setup.players[0].monsters.push(
      monster(sourceId, { element: "ice", damage: 5, cooldown: 3, skill: "taunt" }),
    );
    let state = cast(readyState(setup), spell.id, playerOneHero, sourceId);
    const clone = state.players[0].monsters[1]!;
    expect(clone).toMatchObject({
      health: 1,
      maxHealth: 1,
      damage: 5,
      element: "ice",
      cooldown: 3,
      currentCooldown: 0,
      shieldActive: false,
      rageActive: false,
      temporary: { expires: "endOfCurrentTurn" },
    });
    expect(clone.skill).toBeUndefined();
    state = applyBattleAction(state, {
      type: "useMonster",
      playerId: "playerOne",
      monsterInstanceId: clone.id,
      targetId: enemyId,
    }).state;
    state = applyBattleAction(state, { type: "endTurn", playerId: "playerOne" }).state;
    expect(state.players[0].monsters.map((candidate) => candidate.id)).toEqual([sourceId]);
    state = applyBattleAction(state, { type: "endTurn", playerId: "playerTwo" }).state;
    const secondCast = cast(state, spell.id, playerOneHero, sourceId);
    const secondClone = secondCast.players[0].monsters[1]!;
    expect(secondClone.id).not.toBe(clone.id);
  });

  it("lets Funeral Brand observe random direct destruction from Sacrifice", () => {
    const funeral = sliceDSpell(
      "funeralBrand",
      "fire",
      { selection: "one", allowedTargets: ["enemyMonster"] },
      [
        {
          type: "registerActionScopedTrigger",
          event: "selectedMonsterDestroyedDuringCurrentRingAction",
          effect: {
            type: "dealDamageToControllingHero",
            amountFrom: "destroyedMonsterCurrentDamage",
            element: "fire",
          },
        },
      ],
    );
    const sacrifice = sliceDSpell(
      "sacrifice",
      "electric",
      { selection: "one", allowedTargets: ["alliedMonster"] },
      [
        { type: "destroyMonster", target: "selected" },
        {
          type: "randomTarget",
          scope: "enemyMonsters",
          onSuccess: { type: "destroyMonster", target: "random" },
        },
      ],
    );
    const allyId = "playerOne.monster.funeralSacrifice.1" as TargetId;
    const enemyId = "playerTwo.monster.funeralVictim.1" as TargetId;
    const setup = setupWithSpells([funeral, sacrifice], [monster(enemyId, { damage: 4 })]);
    setup.players[0].monsters.push(monster(allyId));
    const ring = setup.players[0].rings[0]!;
    ring.gems.push(structuredClone(setup.players[0].rings[1]!.gems[0]!));
    ring.socketCount = 2;
    const state = readyState(setup);
    state.startingPlayerId = "playerTwo";
    const result = applyBattleAction(state, {
      type: "useRing",
      playerId: "playerOne",
      ringInstanceId: ring.id,
      targetId: playerOneHero,
      enchantmentTargets: {
        "playerOne.gem.funeralBrand": enemyId,
        "playerOne.gem.sacrifice": allyId,
      },
    }).state;
    expect(result.players[1].hero.health).toBe(26);
    expect(result.players[1].monsters).toHaveLength(0);
  });
});
