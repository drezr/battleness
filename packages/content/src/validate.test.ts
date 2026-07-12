import { applyBattleAction, createBattleState, type BattleAction } from "@battleness/engine";
import { describe, expect, it } from "vitest";
import {
  createBattleSetupFromFixture,
  craftRecipe,
  createMaterialStock,
  definitions,
  fixtures,
  improveCraftedItemQuality,
  improveRingSocketCount,
  locales,
  materialDefinitionSchema,
  monsterDefinitionSchema,
  playerFixtureSchema,
  recipeDefinitionSchema,
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
    expect(definitions.recipes).toHaveLength(48);

    const collectibleRings = definitions.rings.filter((ring) => ring.id !== "trainingFlameBand");
    const collectibleGems = definitions.gems.filter((gem) => gem.id !== "plainQuartz");
    const elementRarityPairs = (items: readonly { element: string; rarity: string }[]) =>
      new Set(items.map((item) => `${item.element}:${item.rarity}`));

    expect(elementRarityPairs(collectibleRings)).toHaveLength(12);
    expect(elementRarityPairs(collectibleGems)).toHaveLength(12);
  });

  it("defines one three-material recipe for every collectible item", () => {
    const recipeOutputIds = new Set(
      definitions.recipes.map((recipe) => `${recipe.outputType}:${recipe.outputDefinitionId}`),
    );

    expect(recipeOutputIds.has("ring:trainingFlameBand")).toBe(false);
    expect(recipeOutputIds.has("gem:plainQuartz")).toBe(false);
    expect(definitions.recipes.every((recipe) => recipe.ingredients.length === 3)).toBe(true);
    expect(
      definitions.recipes.every((recipe) =>
        recipe.ingredients.every((item) => item.quantity === 1),
      ),
    ).toBe(true);
    expect(recipeOutputIds).toEqual(
      new Set([
        ...definitions.rings
          .filter((ring) => ring.id !== "trainingFlameBand")
          .map((ring) => `ring:${ring.id}`),
        ...definitions.gems.filter((gem) => gem.id !== "plainQuartz").map((gem) => `gem:${gem.id}`),
        ...definitions.monsters.map((monster) => `monster:${monster.id}`),
        ...definitions.spells.map((spell) => `spell:${spell.id}`),
      ]),
    );
  });

  it("requires ring-only socket counts in recipes", () => {
    expect(() =>
      recipeDefinitionSchema.parse({
        ...definitions.recipes.find((recipe) => recipe.outputType === "gem"),
        ringSocketCount: 1,
      }),
    ).toThrow();
  });

  it("crafts an item instance and consumes material stock", () => {
    const recipe = definitions.recipes.find((candidate) => candidate.id === "craftRingEmberLoop");
    if (!recipe) {
      throw new Error("Expected craftRingEmberLoop to exist.");
    }
    const result = craftRecipe({
      recipe,
      ownerId: "playerOne",
      stock: createMaterialStock(definitions.materials, 2),
      instanceSequence: 1,
    });

    expect(result.crafted).toEqual({
      type: "ring",
      item: {
        id: "playerOne.ring.emberLoop.crafted.1",
        definitionId: "emberLoop",
        ownerId: "playerOne",
        experience: 100,
        quality: 0,
        socketCount: 1,
        socketedGemInstanceIds: [],
        equipped: false,
      },
    });
    expect(result.stock.aluminium).toBe(1);
    expect(result.stock.iron).toBe(1);
    expect(result.stock.sodium).toBe(1);
  });

  it("improves crafted item quality and ring sockets by spending credits", () => {
    const recipe = definitions.recipes.find((candidate) => candidate.id === "craftRingEmberLoop");
    if (!recipe) {
      throw new Error("Expected craftRingEmberLoop to exist.");
    }
    const crafted = craftRecipe({
      recipe,
      ownerId: "playerOne",
      stock: createMaterialStock(definitions.materials, 2),
      instanceSequence: 1,
    }).crafted;
    if (crafted.type !== "ring") {
      throw new Error("Expected crafted item to be a ring.");
    }

    const qualityResult = improveCraftedItemQuality(crafted, "common", 1000);

    expect(qualityResult.cost).toBe(25);
    expect(qualityResult.credits).toBe(975);
    expect(qualityResult.crafted.item.quality).toBe(5);

    const socketResult = improveRingSocketCount(qualityResult.crafted, "common", 975);

    expect(socketResult.cost).toBe(250);
    expect(socketResult.credits).toBe(725);
    expect(socketResult.crafted.item.socketCount).toBe(2);

    expect(() =>
      improveCraftedItemQuality(
        {
          ...socketResult.crafted,
          item: { ...socketResult.crafted.item, quality: 100 },
        },
        "common",
        1000,
      ),
    ).toThrow("maximum");
    expect(() =>
      improveRingSocketCount(
        {
          ...socketResult.crafted,
          item: { ...socketResult.crafted.item, socketCount: 3 },
        },
        "common",
        1000,
      ),
    ).toThrow("maximum");
  });

  it("uses common and refined instead of the previous rarity names", () => {
    const rarities = [
      ...definitions.rings,
      ...definitions.gems,
      ...definitions.monsters,
      ...definitions.spells,
      ...definitions.materials,
    ].map((definition) => definition.rarity);

    expect(new Set(rarities)).toEqual(new Set(["common", "refined", "rare", "epic"]));
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

