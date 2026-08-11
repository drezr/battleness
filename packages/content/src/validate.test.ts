import { applyBattleAction, createBattleState, type BattleAction } from "@battleness/engine";
import { describe, expect, it } from "vitest";
import {
  createBattleSetupFromFixture,
  createCampaignOpponentBattlePlayer,
  campaignOpponentSchema,
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
  validateCampaignReferences,
} from "./index";

describe("content package", () => {
  it("validates all prototype content and fixtures", () => {
    expect(() => validateContent()).not.toThrow();
  });

  it("localizes the runtime monster created by Transmute", () => {
    expect(locales.en["monster.transmutedElectric.name"]).toBe("Transmuted Electric");
    expect(locales.fr["monster.transmutedElectric.name"]).toBe("Monstre électrique transmuté");
  });

  it("defines a validated linear campaign with fixed rewards", () => {
    expect(definitions.campaignOpponents.map((opponent) => opponent.id)).toEqual([
      "emberTrial",
      "stormInitiate",
      "frostGate",
    ]);
    expect(
      definitions.campaignOpponents.map((opponent) => opponent.prerequisiteOpponentId),
    ).toEqual([undefined, "emberTrial", "stormInitiate"]);
    expect(
      definitions.campaignOpponents.every(
        (opponent) =>
          opponent.repeatable &&
          opponent.firstClearReward.credits > opponent.repeatVictoryReward.credits,
      ),
    ).toBe(true);
  });

  it("converts a campaign opponent loadout into deterministic engine instances", () => {
    const baseSetup = createBattleSetupFromFixture("basicDuel");
    const opponent = definitions.campaignOpponents[0]!;
    const player = createCampaignOpponentBattlePlayer({
      opponent,
      username: (locales.en as Record<string, string>)[opponent.nameKey]!,
      resolvedDefinitions: structuredClone(baseSetup.definitions),
    });

    expect(player).toMatchObject({
      id: "campaign.emberTrial",
      username: "Ember Trial",
      level: 1,
      rings: [
        {
          id: "campaign.emberTrial.ring.ashenLoop.1",
          definitionId: "ashenLoop",
          ownerId: "campaign.emberTrial",
          gems: [
            {
              id: "campaign.emberTrial.gem.emberShard.1.1",
              definitionId: "emberShard",
              enchantment: {
                type: "monster",
                monsterId: "emberImp",
                resolvedDefinitionId: "campaign.emberTrial.monster.emberImp.1.1",
              },
            },
          ],
        },
      ],
    });
  });

  it("rejects campaign rings with more gems than sockets", () => {
    expect(() =>
      campaignOpponentSchema.parse({
        ...definitions.campaignOpponents[0],
        rings: [
          {
            ...definitions.campaignOpponents[0]?.rings[0],
            socketCount: 1,
            gems: [
              definitions.campaignOpponents[0]?.rings[0]?.gems[0],
              definitions.campaignOpponents[0]?.rings[0]?.gems[0],
            ],
          },
        ],
      }),
    ).toThrow();
  });

  it("rejects broken campaign progression and item references", () => {
    const opponents = definitions.campaignOpponents.map((opponent) => structuredClone(opponent));
    opponents[1] = {
      ...opponents[1]!,
      prerequisiteOpponentId: "missingOpponent",
      rings: [{ ...opponents[1]!.rings[0]!, definitionId: "missingRing" }],
    };

    expect(() =>
      validateCampaignReferences({
        opponents,
        rings: definitions.rings,
        gems: definitions.gems,
        monsters: definitions.monsters,
        spells: definitions.spells,
        materials: definitions.materials,
        locales,
      }),
    ).toThrow(/missingOpponent[\s\S]*missingRing/);
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

  it("includes the approved production spell collection", () => {
    const spellIds = definitions.spells.map((spell) => spell.id);

    expect(spellIds).toEqual(expect.arrayContaining(["burnI", "arcRelay", "freezeIII"]));
  });

  it("implements the production-items-v2 collection", () => {
    expect(definitions.rings).toHaveLength(54);
    expect(definitions.gems).toHaveLength(54);
    expect(definitions.monsters).toHaveLength(69);
    expect(definitions.spells).toHaveLength(42);
    expect(definitions.materials).toHaveLength(70);
    expect(definitions.recipes).toHaveLength(219);

    const elementRarityPairs = (items: readonly { element: string; rarity: string }[]) =>
      new Set(items.map((item) => `${item.element}:${item.rarity}`));

    expect(elementRarityPairs(definitions.rings)).toHaveLength(12);
    expect(elementRarityPairs(definitions.gems)).toHaveLength(12);
    expect(elementRarityPairs(definitions.monsters)).toHaveLength(12);
  });

  it("defines one three-material recipe for every collectible item", () => {
    const recipeOutputIds = new Set(
      definitions.recipes.map((recipe) => `${recipe.outputType}:${recipe.outputDefinitionId}`),
    );

    expect(
      definitions.recipes.every(
        (recipe) => recipe.ingredients.reduce((total, item) => total + item.quantity, 0) === 3,
      ),
    ).toBe(true);
    expect(recipeOutputIds).toEqual(
      new Set([
        ...definitions.rings.map((ring) => `ring:${ring.id}`),
        ...definitions.gems.map((gem) => `gem:${gem.id}`),
        ...definitions.monsters.map((monster) => `monster:${monster.id}`),
        ...definitions.spells.map((spell) => `spell:${spell.id}`),
      ]),
    );

    for (const outputType of ["ring", "gem", "monster"] as const) {
      const fingerprints = definitions.recipes
        .filter((recipe) => recipe.outputType === outputType)
        .map((recipe) =>
          recipe.ingredients
            .map((ingredient) => `${ingredient.materialId}:${ingredient.quantity}`)
            .sort()
            .join("|"),
        );
      expect(new Set(fingerprints).size).toBe(fingerprints.length);
    }
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
    const recipe = definitions.recipes.find((candidate) => candidate.id === "craftRingAshenLoop");
    if (!recipe) {
      throw new Error("Expected craftRingAshenLoop to exist.");
    }
    const result = craftRecipe({
      recipe,
      ownerId: "playerOne",
      stock: createMaterialStock(definitions.materials, 4),
      instanceSequence: 1,
    });

    expect(result.crafted).toEqual({
      type: "ring",
      item: {
        id: "playerOne.ring.ashenLoop.crafted.1",
        definitionId: "ashenLoop",
        ownerId: "playerOne",
        experience: 100,
        quality: 0,
        socketCount: 1,
        socketedGemInstanceIds: [],
        equipped: false,
      },
    });
    expect(result.stock.aluminium).toBe(1);
    expect(result.stock.iron).toBe(4);
    expect(result.stock.sodium).toBe(4);
  });

  it("improves crafted item quality and ring sockets by spending credits", () => {
    const recipe = definitions.recipes.find((candidate) => candidate.id === "craftRingAshenLoop");
    if (!recipe) {
      throw new Error("Expected craftRingAshenLoop to exist.");
    }
    const crafted = craftRecipe({
      recipe,
      ownerId: "playerOne",
      stock: createMaterialStock(definitions.materials, 4),
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
    expect(locales.en["spell.burnI.name"]).toBe("Burn I");
    expect(locales.fr["spell.burnI.description"]).toContain("BRULURE");
  });

  it("creates a validated BattleSetup from prototype fixtures", () => {
    const setup = createBattleSetupFromFixture("basicDuel");
    const staticLoop = setup.players[0].rings.find((ring) => ring.definitionId === "staticLoop");

    expect(setup.players).toHaveLength(2);
    expect(setup.activePlayerId).toBeNull();
    expect(staticLoop?.gems.length).toBe(2);
    expect(staticLoop?.rarity).toBe("common");
    expect(staticLoop?.gems[1]?.rarity).toBe("common");
    expect(Object.keys(setup.definitions.spells)).toEqual(
      expect.arrayContaining(["carbonize", "electroshock", "deepFreezing"]),
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
    expect(monsters.find((monster) => monster.definitionId === "cinderJackal")?.rageActive).toBe(
      false,
    );
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
