import gems from "./definitions/gems.json";
import materials from "./definitions/materials.json";
import monsters from "./definitions/monsters.json";
import rings from "./definitions/rings.json";
import spells from "./definitions/spells.json";
import inventories from "./fixtures/inventories.json";
import basicDuel from "./fixtures/battleSetups/basicDuel.json";
import elementDuelStart from "./fixtures/battleSetups/elementDuelStart.json";
import lowerLevelStart from "./fixtures/battleSetups/lowerLevelStart.json";
import basicRingAttack from "./fixtures/scenarios/basicRingAttack.json";
import elementDuelStartScenario from "./fixtures/scenarios/elementDuelStart.json";
import lowerLevelStartScenario from "./fixtures/scenarios/lowerLevelStart.json";
import spellSelfTargeting from "./fixtures/scenarios/spellSelfTargeting.json";
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
  battleSetups: [basicDuel, lowerLevelStart, elementDuelStart],
  scenarios: [
    basicRingAttack,
    summonAndTaunt,
    spellSelfTargeting,
    lowerLevelStartScenario,
    elementDuelStartScenario,
  ],
} as const;

export const locales = {
  en,
  fr,
} as const;

export function validateContent(): void {
  ringDefinitionSchema.array().parse(rings);
  gemDefinitionSchema.array().parse(gems);
  monsterDefinitionSchema.array().parse(monsters);
  spellDefinitionSchema.array().parse(spells);
  materialDefinitionSchema.array().parse(materials);
  playerFixtureSchema.array().parse(players);
  inventoryFixtureSchema.parse(inventories);
  battleSetupFixtureSchema.array().parse([basicDuel, lowerLevelStart, elementDuelStart]);
  scenarioFixtureSchema
    .array()
    .parse([
      basicRingAttack,
      summonAndTaunt,
      spellSelfTargeting,
      lowerLevelStartScenario,
      elementDuelStartScenario,
    ]);
  localeSchema.parse(en);
  localeSchema.parse(fr);
}

export * from "./battleSetup";
export * from "./schemas";
