import gems from "./definitions/gems.json";
import materials from "./definitions/materials.json";
import monsters from "./definitions/monsters.json";
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
  gemDefinitionSchema,
  inventoryFixtureSchema,
  localeSchema,
  materialDefinitionSchema,
  monsterDefinitionSchema,
  playerFixtureSchema,
  ringDefinitionSchema,
  scenarioFixtureSchema,
  spellDefinitionSchema,
} from "./schemas";
import { validateContentReferences } from "./references";

export const contentVersion = "prototype-3";

export const definitions = {
  gems,
  materials,
  monsters,
  rings,
  spells,
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
  const validatedRings = ringDefinitionSchema.array().parse(rings);
  const validatedGems = gemDefinitionSchema.array().parse(gems);
  const validatedMonsters = monsterDefinitionSchema.array().parse(monsters);
  const validatedSpells = spellDefinitionSchema.array().parse(spells);
  const validatedMaterials = materialDefinitionSchema.array().parse(materials);
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
    },
    locales: { en: validatedEn, fr: validatedFr },
    players: validatedPlayers,
    inventory: validatedInventory,
    battleSetups: validatedBattleSetups,
  });
}

export * from "./battleSetup";
export * from "./progression";
export * from "./references";
export * from "./schemas";
