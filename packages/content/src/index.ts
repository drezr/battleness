import campaignOpponents from "./definitions/campaignOpponents.json";
import gems from "./definitions/gems.json";
import materials from "./definitions/materials.json";
import monsters from "./definitions/monsters.json";
import recipes from "./definitions/recipes.json";
import rings from "./definitions/rings.json";
import spells from "./definitions/spells.json";
import inventories from "./fixtures/inventories.json";
import basicDuel from "./fixtures/battleSetups/basicDuel.json";
import elementDuelStart from "./fixtures/battleSetups/elementDuelStart.json";
import lowerLevelStart from "./fixtures/battleSetups/lowerLevelStart.json";
import skillShowcase from "./fixtures/battleSetups/skillShowcase.json";
import basicRingAttack from "./fixtures/scenarios/basicRingAttack.json";
import elementDuelStartScenario from "./fixtures/scenarios/elementDuelStart.json";
import lowerLevelStartScenario from "./fixtures/scenarios/lowerLevelStart.json";
import spellSelfTargeting from "./fixtures/scenarios/spellSelfTargeting.json";
import skillShowcaseScenario from "./fixtures/scenarios/skillShowcase.json";
import summonAndTaunt from "./fixtures/scenarios/summonAndTaunt.json";
import players from "./fixtures/players.json";
import en from "./locales/en.json";
import fr from "./locales/fr.json";
import {
  battleSetupFixtureSchema,
  campaignOpponentSchema,
  gemDefinitionSchema,
  inventoryFixtureSchema,
  localeSchema,
  materialDefinitionSchema,
  monsterDefinitionSchema,
  playerFixtureSchema,
  recipeDefinitionSchema,
  ringDefinitionSchema,
  scenarioFixtureSchema,
  spellDefinitionSchema,
  type CampaignOpponent,
  type GemDefinition,
  type MaterialDefinition,
  type MonsterDefinition,
  type RecipeDefinition,
  type RingDefinition,
  type SpellDefinition,
} from "./schemas";
import { validateCampaignReferences } from "./campaign";
import { validateContentReferences } from "./references";

export const contentVersion = "production-items-v2";

export const definitions = {
  campaignOpponents: campaignOpponents as readonly CampaignOpponent[],
  gems: gems as readonly GemDefinition[],
  materials: materials as readonly MaterialDefinition[],
  monsters: monsters as readonly MonsterDefinition[],
  recipes: recipes as unknown as readonly RecipeDefinition[],
  rings: rings as readonly RingDefinition[],
  spells: spells as readonly SpellDefinition[],
} as const;

export const fixtures = {
  players,
  inventories,
  battleSetups: [basicDuel, lowerLevelStart, elementDuelStart, skillShowcase],
  scenarios: [
    basicRingAttack,
    summonAndTaunt,
    spellSelfTargeting,
    skillShowcaseScenario,
    lowerLevelStartScenario,
    elementDuelStartScenario,
  ],
} as const;

export const locales = {
  en,
  fr,
} as const;

export function validateContent(): void {
  const validatedCampaignOpponents = campaignOpponentSchema.array().parse(campaignOpponents);
  const validatedRings = ringDefinitionSchema.array().parse(rings);
  const validatedGems = gemDefinitionSchema.array().parse(gems);
  const validatedMonsters = monsterDefinitionSchema.array().parse(monsters);
  const validatedSpells = spellDefinitionSchema.array().parse(spells);
  const validatedMaterials = materialDefinitionSchema.array().parse(materials);
  const validatedRecipes = recipeDefinitionSchema.array().parse(recipes);
  const validatedPlayers = playerFixtureSchema.array().parse(players);
  const validatedInventory = inventoryFixtureSchema.parse(inventories);
  const validatedBattleSetups = battleSetupFixtureSchema
    .array()
    .parse([basicDuel, lowerLevelStart, elementDuelStart, skillShowcase]);
  scenarioFixtureSchema
    .array()
    .parse([
      basicRingAttack,
      summonAndTaunt,
      spellSelfTargeting,
      skillShowcaseScenario,
      lowerLevelStartScenario,
      elementDuelStartScenario,
    ]);
  const validatedEn = localeSchema.parse(en);
  const validatedFr = localeSchema.parse(fr);

  validateContentReferences({
    definitions: {
      rings: validatedRings,
      gems: validatedGems,
      monsters: validatedMonsters,
      spells: validatedSpells,
      materials: validatedMaterials,
      recipes: validatedRecipes,
    },
    locales: { en: validatedEn, fr: validatedFr },
    players: validatedPlayers,
    inventory: validatedInventory,
    battleSetups: validatedBattleSetups,
  });
  validateCampaignReferences({
    opponents: validatedCampaignOpponents,
    rings: validatedRings,
    gems: validatedGems,
    monsters: validatedMonsters,
    spells: validatedSpells,
    materials: validatedMaterials,
    locales: { en: validatedEn, fr: validatedFr },
  });
}

export * from "./battleSetup";
export * from "./battleLab";
export * from "./balanceReport";
export * from "./progression";
export * from "./references";
export * from "./schemas";
export * from "./forge";
export * from "./campaign";
export * from "./penalties";
export * from "./itemAtlases";
