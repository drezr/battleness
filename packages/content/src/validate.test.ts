import { applyBattleAction, createBattleState, type BattleAction } from "@battleness/engine";
import { describe, expect, it } from "vitest";
import {
  createBattleSetupFromFixture,
  definitions,
  fixtures,
  locales,
  materialDefinitionSchema,
  monsterDefinitionSchema,
  playerFixtureSchema,
  ringDefinitionSchema,
  validateContent,
} from "./index";

describe("content package", () => {
  it("validates all prototype content and fixtures", () => {
    expect(() => validateContent()).not.toThrow();
  });

  it("rejects ring definitions with a cooldown below 1", () => {
    expect(() =>
      ringDefinitionSchema.parse({
        ...definitions.rings[0],
        baseCooldown: 0,
      }),
    ).toThrow();
  });

  it("rejects fixture levels because total experience is the progression source of truth", () => {
    expect(() =>
      playerFixtureSchema.parse({
        ...fixtures.players[0],
        level: 1,
      }),
    ).toThrow();
  });

  it("includes the initial direct-damage spells", () => {
    const spellIds = definitions.spells.map((spell) => spell.id);

    expect(spellIds).toEqual(expect.arrayContaining(["spark", "firebolt", "iceShard"]));
  });

  it("implements the confirmed prototype collection", () => {
    expect(definitions.rings).toHaveLength(13);
    expect(definitions.gems).toHaveLength(13);
    expect(definitions.monsters).toHaveLength(18);
    expect(definitions.spells).toHaveLength(6);
    expect(definitions.materials).toHaveLength(70);

    const collectibleRings = definitions.rings.filter((ring) => ring.id !== "trainingFlameBand");
    const collectibleGems = definitions.gems.filter((gem) => gem.id !== "plainQuartz");
    const elementRarityPairs = (items: readonly { element: string; rarity: string }[]) =>
      new Set(items.map((item) => `${item.element}:${item.rarity}`));

    expect(elementRarityPairs(collectibleRings)).toHaveLength(12);
    expect(elementRarityPairs(collectibleGems)).toHaveLength(12);
  });

  it("uses common and refined instead of the previous rarity names", () => {
    const rarities = [
      ...definitions.rings,
      ...definitions.gems,
      ...definitions.monsters,
      ...definitions.spells,
      ...definitions.materials,
    ].map((definition) => definition.rarity);

    expect(new Set(rarities)).toEqual(new Set(["common", "refined", "rare", "legendary"]));
    expect(rarities).not.toContain("normal");
    expect(rarities).not.toContain("magic");
  });

  it("preserves the historical material families with scientific metadata", () => {
    const chemicalElements = definitions.materials.filter(
      (material) => material.realWorldType === "chemicalElement",
    );
    const nickel = definitions.materials.find((material) => material.id === "nickel");

    expect(
      definitions.materials.filter((material) => material.craftingFamily === "ring"),
    ).toHaveLength(23);
    expect(
      definitions.materials.filter((material) => material.craftingFamily === "spell"),
    ).toHaveLength(14);
    expect(
      definitions.materials.filter((material) => material.craftingFamily === "gem"),
    ).toHaveLength(17);
    expect(
      definitions.materials.filter((material) => material.craftingFamily === "monster"),
    ).toHaveLength(16);
    expect(chemicalElements).toHaveLength(41);
    expect(nickel).toMatchObject({
      rarity: "refined",
      basePrice: 400,
      atomicNumber: 28,
      chemicalSymbol: "Ni",
    });
  });

  it("requires atomic metadata only for chemical materials", () => {
    const iron = definitions.materials.find((material) => material.id === "iron");
    const pearl = definitions.materials.find((material) => material.id === "pearl");

    expect(() =>
      materialDefinitionSchema.parse({
        ...iron,
        atomicNumber: undefined,
      }),
    ).toThrow();
    expect(() =>
      materialDefinitionSchema.parse({
        ...pearl,
        chemicalSymbol: "Pe",
      }),
    ).toThrow();
  });

  it("defines every monster skill with one optional skill and positive cooldowns", () => {
    expect(definitions.monsters.map((monster) => monster.skill)).toEqual(
      expect.arrayContaining(["haste", "multiHit", "pierce", "rage", "shield", "taunt"]),
    );
    expect(definitions.monsters.every((monster) => monster.baseCooldown >= 1)).toBe(true);
    expect(() =>
      monsterDefinitionSchema.parse({
        id: "legacyMonster",
        nameKey: "monster.legacyMonster.name",
        element: "ice",
        rarity: "common",
        baseHealth: 5,
        baseDamage: 1,
        baseCooldown: 1,
        baseSpeed: 0,
        skills: ["shield"],
      }),
    ).toThrow();
  });

  it("includes the initial scenario fixtures and locale files", () => {
    expect(fixtures.scenarios.map((scenario) => scenario.id)).toEqual(
      expect.arrayContaining([
        "basicRingAttack",
        "summonAndTaunt",
        "spellSelfTargeting",
        "skillShowcase",
        "lowerLevelStart",
        "elementDuelStart",
      ]),
    );
    expect(locales.en["spell.firebolt.name"]).toBe("Firebolt");
    expect(locales.fr["spell.firebolt.name"]).toBe("Boule de feu");
  });

  it("creates a validated BattleSetup from prototype fixtures", () => {
    const setup = createBattleSetupFromFixture("basicDuel");
    const sparkBand = setup.players[0].rings.find((ring) => ring.definitionId === "sparkBand");

    expect(setup.players).toHaveLength(2);
    expect(setup.activePlayerId).toBeNull();
    expect(sparkBand?.gems.length).toBe(2);
    expect(sparkBand?.rarity).toBe("common");
    expect(sparkBand?.gems[1]?.rarity).toBe("refined");
    expect(Object.keys(setup.definitions.spells)).toEqual(
      expect.arrayContaining(["spark", "firebolt", "iceShard"]),
    );

    const state = createBattleState(setup);
    expect(state.activePlayerId).toBe("playerOne");
    expect(state.log).toContainEqual({
      type: "firstPlayerChosen",
      playerId: "playerOne",
      reason: "speed",
    });
  });

  it("creates battle setup fixtures for level and element-duel start rules", () => {
    const lowerLevelState = createBattleState(createBattleSetupFromFixture("lowerLevelStart"));
    expect(lowerLevelState.activePlayerId).toBe("playerLowLevel");
    expect(lowerLevelState.log).toContainEqual({
      type: "firstPlayerChosen",
      playerId: "playerLowLevel",
      reason: "level",
    });

    const elementDuelState = createBattleState(createBattleSetupFromFixture("elementDuelStart"));
    expect(elementDuelState.status).toBe("choosingFirstPlayer");
    expect(elementDuelState.activePlayerId).toBeNull();
    expect(elementDuelState.log).toContainEqual({
      type: "firstPlayerChoiceRequested",
      playerIds: ["playerElectric", "playerFire"],
      reason: "speedAndLevelTie",
    });
  });

  it("creates the development skill showcase with ready runtime skill states", () => {
    const setup = createBattleSetupFromFixture("skillShowcase");
    const monsters = setup.players.flatMap((player) => player.monsters);

    expect(monsters).toHaveLength(6);
    expect(monsters.every((monster) => monster.currentCooldown === 0)).toBe(true);
    expect(monsters.find((monster) => monster.definitionId === "shieldWisp")?.shieldActive).toBe(
      true,
    );
    expect(monsters.find((monster) => monster.definitionId === "emberImp")?.rageActive).toBe(false);
  });

  it("executes the initial JSON scenario fixtures through the engine", () => {
    for (const scenario of fixtures.scenarios) {
      let state = createBattleState(
        createBattleSetupFromFixture(scenario.battleSetupId ?? "basicDuel"),
      );

      for (const action of scenario.actions) {
        state = applyBattleAction(state, action as BattleAction).state;
      }

      const eventTypes = state.log.map((event) => event.type);
      expect(eventTypes).toEqual(expect.arrayContaining(scenario.expect.eventTypes ?? []));

      const expectedHealthByTarget =
        "health" in scenario.expect ? (scenario.expect.health ?? {}) : {};

      for (const [targetId, expectedHealth] of Object.entries(expectedHealthByTarget)) {
        const playerId = targetId.replace(".hero", "");
        const player = state.players.find((candidate) => candidate.id === playerId);
        expect(player?.hero.health).toBe(expectedHealth);
      }
    }
  });
});
