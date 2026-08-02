import type {
  BattlePlayer,
  BattleSetup,
  GemCombatInstance,
  GemEnchantment,
  MonsterDefinition,
  RingCombatInstance,
  SpellDefinition,
} from "@battleness/engine";
import gemsJson from "./definitions/gems.json";
import monstersJson from "./definitions/monsters.json";
import ringsJson from "./definitions/rings.json";
import spellsJson from "./definitions/spells.json";
import inventoriesJson from "./fixtures/inventories.json";
import basicDuelJson from "./fixtures/battleSetups/basicDuel.json";
import elementDuelStartJson from "./fixtures/battleSetups/elementDuelStart.json";
import lowerLevelStartJson from "./fixtures/battleSetups/lowerLevelStart.json";
import skillShowcaseJson from "./fixtures/battleSetups/skillShowcase.json";
import playersJson from "./fixtures/players.json";
import type {
  BattleSetupFixture,
  GemDefinition,
  GemInstance,
  InventoryFixture,
  MonsterDefinition as ContentMonsterDefinition,
  MonsterInstance,
  PlayerFixture,
  RingDefinition,
  RingInstance,
  SpellDefinition as ContentSpellDefinition,
  SpellInstance,
} from "./schemas";
import {
  battleSetupFixtureSchema,
  gemDefinitionSchema,
  inventoryFixtureSchema,
  monsterDefinitionSchema,
  playerFixtureSchema,
  ringDefinitionSchema,
  spellDefinitionSchema,
} from "./schemas";
import { levelFromExperience, resolveHeroMaxHealth, resolveItemStat } from "./progression";
import { resolveItemPenaltyIncrease, sumItemPenalties } from "./penalties";

const definitionData = {
  gems: gemDefinitionSchema.array().parse(gemsJson),
  monsters: monsterDefinitionSchema.array().parse(monstersJson),
  rings: ringDefinitionSchema.array().parse(ringsJson),
  spells: spellDefinitionSchema.array().parse(spellsJson),
};

const fixtureData = {
  players: playerFixtureSchema.array().parse(playersJson),
  inventories: inventoryFixtureSchema.parse(inventoriesJson),
  battleSetups: [
    battleSetupFixtureSchema.parse(basicDuelJson),
    battleSetupFixtureSchema.parse(lowerLevelStartJson),
    battleSetupFixtureSchema.parse(elementDuelStartJson),
    battleSetupFixtureSchema.parse(skillShowcaseJson),
  ],
};

export function createBattleSetupFromFixture(setupId: string): BattleSetup {
  const setup = fixtureData.battleSetups.find((candidate) => candidate.id === setupId);
  if (!setup) {
    throw new Error(`Battle setup fixture ${setupId} was not found.`);
  }

  return createBattleSetup(setup, fixtureData.players, fixtureData.inventories);
}

export function createBattleSetup(
  setup: BattleSetupFixture,
  players: readonly PlayerFixture[],
  inventory: InventoryFixture,
): BattleSetup {
  const resolvedDefinitions: BattleSetup["definitions"] = {
    monsters: Object.fromEntries(
      definitionData.monsters.map((monster) => [monster.id, toEngineMonsterDefinition(monster)]),
    ),
    spells: Object.fromEntries(
      definitionData.spells.map((spell) => [spell.id, toEngineSpellDefinition(spell)]),
    ),
  };
  const battlePlayers = setup.playerIds.map((playerId) => {
    const player = players.find((candidate) => candidate.id === playerId);
    if (!player) {
      throw new Error(`Player fixture ${playerId} was not found.`);
    }

    return createBattlePlayer(player, inventory, resolvedDefinitions);
  }) as [BattlePlayer, BattlePlayer];

  for (const initialMonster of setup.initialMonsters ?? []) {
    const player = battlePlayers.find((candidate) => candidate.id === initialMonster.playerId);
    if (!player) {
      throw new Error(
        `Initial monster player ${initialMonster.playerId} is not part of setup ${setup.id}.`,
      );
    }

    const definition = findMonsterDefinition(initialMonster.monsterId);
    const instanceNumber =
      player.monsters.filter((monster) => monster.definitionId === definition.id).length + 1;
    player.monsters.push({
      id: `${player.id}.monster.${definition.id}.${instanceNumber}`,
      definitionId: definition.id,
      ownerId: player.id,
      nameKey: definition.nameKey,
      element: definition.element,
      rarity: definition.rarity,
      health: definition.baseHealth,
      maxHealth: definition.baseHealth,
      baseDamage: definition.baseDamage,
      damage: definition.baseDamage,
      cooldown: definition.baseCooldown,
      currentCooldown: 0,
      speed: definition.baseSpeed,
      skill: definition.skill,
      shieldActive: definition.skill === "shield",
      rageActive: false,
    });
  }

  return {
    id: setup.id,
    seed: setup.seed,
    status: "choosingFirstPlayer",
    activePlayerId: null,
    startingPlayerId: null,
    firstPlayerChoices: {},
    definitions: resolvedDefinitions,
    players: battlePlayers,
  };
}

export function createBattlePlayerFromInventory(
  player: PlayerFixture,
  inventory: InventoryFixture,
  resolvedDefinitions: BattleSetup["definitions"],
): BattlePlayer {
  return createBattlePlayer(
    playerFixtureSchema.parse(player),
    inventoryFixtureSchema.parse(inventory),
    resolvedDefinitions,
  );
}

function createBattlePlayer(
  player: PlayerFixture,
  inventory: InventoryFixture,
  resolvedDefinitions: BattleSetup["definitions"],
): BattlePlayer {
  const level = levelFromExperience(player.experience);
  const rings = player.equippedRingInstanceIds.map((ringInstanceId) =>
    createRingCombatInstance(player.id, ringInstanceId, inventory, resolvedDefinitions),
  );
  const speed = rings.reduce((sum, ring) => sum + ring.speed, 0);
  const maxHealth = resolveHeroMaxHealth(level);

  return {
    id: player.id,
    username: player.username,
    level,
    hero: {
      health: maxHealth,
      maxHealth,
      speed,
    },
    energy: {
      current: 0,
      maxForTurn: 0,
      turnCount: 0,
    },
    rings,
    monsters: [],
  };
}

function createRingCombatInstance(
  ownerId: string,
  ringInstanceId: string,
  inventory: InventoryFixture,
  resolvedDefinitions: BattleSetup["definitions"],
): RingCombatInstance {
  const instance = findRingInstance(inventory, ringInstanceId);
  if (instance.ownerId !== ownerId) {
    throw new Error(`Ring instance ${ringInstanceId} does not belong to player ${ownerId}.`);
  }

  const definition = findRingDefinition(instance.definitionId);
  const level = levelFromExperience(instance.experience);
  const gems = instance.socketedGemInstanceIds.map((gemInstanceId) =>
    createGemCombatInstance(ownerId, gemInstanceId, inventory, resolvedDefinitions),
  );
  const speed = definition.baseSpeed + gems.reduce((sum, gem) => sum + gem.speed, 0);

  return {
    id: instance.id,
    definitionId: definition.id,
    ownerId: instance.ownerId,
    nameKey: definition.nameKey,
    element: definition.element,
    rarity: definition.rarity,
    damage: resolveItemStat(definition.baseDamage, level, instance.quality),
    energyCost: Math.max(
      1,
      definition.baseEnergyCost + resolveItemPenaltyIncrease(gems.map((gem) => gem.energyPenalty)),
    ),
    cooldown:
      definition.baseCooldown + resolveItemPenaltyIncrease(gems.map((gem) => gem.cooldownPenalty)),
    currentCooldown: 0,
    speed,
    socketCount: instance.socketCount,
    gems,
  };
}

function createGemCombatInstance(
  ownerId: string,
  gemInstanceId: string,
  inventory: InventoryFixture,
  resolvedDefinitions: BattleSetup["definitions"],
): GemCombatInstance {
  const instance = findGemInstance(inventory, gemInstanceId);
  if (instance.ownerId !== ownerId) {
    throw new Error(`Gem instance ${gemInstanceId} does not belong to player ${ownerId}.`);
  }

  const definition = findGemDefinition(instance.definitionId);
  const level = levelFromExperience(instance.experience);
  const enchantment = resolveGemEnchantment(ownerId, instance, inventory, resolvedDefinitions);
  let energyPenalty = definition.baseEnergyPenalty;
  let cooldownPenalty = definition.baseCooldownPenalty;
  let speed = definition.baseSpeed;

  if (enchantment?.type === "spell") {
    const spell =
      resolvedDefinitions.spells[enchantment.resolvedDefinitionId ?? enchantment.spellId];
    if (!spell) {
      throw new Error(`Resolved spell definition ${enchantment.spellId} was not found.`);
    }
    energyPenalty = sumItemPenalties([energyPenalty, spell.baseEnergyPenalty]);
    cooldownPenalty = sumItemPenalties([cooldownPenalty, spell.baseCooldownPenalty]);
    speed += spell.baseSpeed ?? 0;
  }

  if (enchantment?.type === "monster") {
    const monster =
      resolvedDefinitions.monsters[enchantment.resolvedDefinitionId ?? enchantment.monsterId];
    if (!monster) {
      throw new Error(`Resolved monster definition ${enchantment.monsterId} was not found.`);
    }
    energyPenalty = sumItemPenalties([energyPenalty, monster.baseEnergyPenalty ?? 0]);
    cooldownPenalty = sumItemPenalties([cooldownPenalty, monster.baseCooldownPenalty ?? 0]);
    speed += monster.baseSpeed;
  }

  return {
    id: instance.id,
    definitionId: definition.id,
    ownerId: instance.ownerId,
    nameKey: definition.nameKey,
    element: definition.element,
    rarity: definition.rarity,
    damage: resolveItemStat(definition.baseDamage, level, instance.quality),
    energyPenalty,
    cooldownPenalty,
    speed,
    enchantment,
  };
}

function resolveGemEnchantment(
  ownerId: string,
  gemInstance: GemInstance,
  inventory: InventoryFixture,
  resolvedDefinitions: BattleSetup["definitions"],
): GemEnchantment | undefined {
  const enchantment = gemInstance.enchantment;
  if (!enchantment) {
    return undefined;
  }

  if (enchantment.type === "monster") {
    const instance = findMonsterInstance(inventory, enchantment.monsterInstanceId);
    assertOwnedBy(instance, ownerId, "Monster");
    const definition = findMonsterDefinition(instance.definitionId);
    const level = levelFromExperience(instance.experience);

    resolvedDefinitions.monsters[instance.id] = {
      ...toEngineMonsterDefinition(definition),
      id: instance.id,
      baseHealth: resolveItemStat(definition.baseHealth, level, instance.quality),
      baseDamage: resolveItemStat(definition.baseDamage, level, instance.quality),
    };

    return {
      type: "monster",
      monsterId: definition.id,
      resolvedDefinitionId: instance.id,
    };
  }

  const instance = findSpellInstance(inventory, enchantment.spellInstanceId);
  assertOwnedBy(instance, ownerId, "Spell");
  const definition = findSpellDefinition(instance.definitionId);
  const level = levelFromExperience(instance.experience);

  resolvedDefinitions.spells[instance.id] = {
    ...toEngineSpellDefinition(definition),
    id: instance.id,
    baseEnergyPenalty: definition.baseEnergyPenalty,
    baseCooldownPenalty: definition.baseCooldownPenalty,
    effects: definition.effects.map((effect) =>
      effect.type === "dealDamage"
        ? {
            ...effect,
            amount: resolveItemStat(effect.amount, level, instance.quality),
          }
        : effect,
    ),
  };

  return {
    type: "spell",
    spellId: definition.id,
    resolvedDefinitionId: instance.id,
  };
}

function findRingDefinition(id: string): RingDefinition {
  const definition = definitionData.rings.find((candidate) => candidate.id === id);
  if (!definition) {
    throw new Error(`Ring definition ${id} was not found.`);
  }

  return definition;
}

function findGemDefinition(id: string): GemDefinition {
  const definition = definitionData.gems.find((candidate) => candidate.id === id);
  if (!definition) {
    throw new Error(`Gem definition ${id} was not found.`);
  }

  return definition;
}

function findMonsterDefinition(id: string): ContentMonsterDefinition {
  const definition = definitionData.monsters.find((candidate) => candidate.id === id);
  if (!definition) {
    throw new Error(`Monster definition ${id} was not found.`);
  }

  return definition;
}

function findSpellDefinition(id: string): SpellDefinitionFromContent {
  const definition = definitionData.spells.find((candidate) => candidate.id === id);
  if (!definition) {
    throw new Error(`Spell definition ${id} was not found.`);
  }

  return definition;
}

function findRingInstance(inventory: InventoryFixture, id: string): RingInstance {
  const instance = inventory.rings.find((candidate) => candidate.id === id);
  if (!instance) {
    throw new Error(`Ring instance ${id} was not found.`);
  }

  return instance;
}

function findGemInstance(inventory: InventoryFixture, id: string): GemInstance {
  const instance = inventory.gems.find((candidate) => candidate.id === id);
  if (!instance) {
    throw new Error(`Gem instance ${id} was not found.`);
  }

  return instance;
}

function findMonsterInstance(inventory: InventoryFixture, id: string): MonsterInstance {
  const instance = inventory.monsters.find((candidate) => candidate.id === id);
  if (!instance) {
    throw new Error(`Monster instance ${id} was not found.`);
  }

  return instance;
}

function findSpellInstance(inventory: InventoryFixture, id: string): SpellInstance {
  const instance = inventory.spells.find((candidate) => candidate.id === id);
  if (!instance) {
    throw new Error(`Spell instance ${id} was not found.`);
  }

  return instance;
}

function assertOwnedBy(
  instance: MonsterInstance | SpellInstance,
  ownerId: string,
  label: string,
): void {
  if (instance.ownerId !== ownerId) {
    throw new Error(`${label} instance ${instance.id} does not belong to player ${ownerId}.`);
  }
}

function toEngineMonsterDefinition(definition: ContentMonsterDefinition): MonsterDefinition {
  return {
    id: definition.id,
    nameKey: definition.nameKey,
    element: definition.element,
    rarity: definition.rarity,
    baseHealth: definition.baseHealth,
    baseDamage: definition.baseDamage,
    baseCooldown: definition.baseCooldown,
    baseSpeed: definition.baseSpeed,
    baseEnergyPenalty: definition.baseEnergyPenalty,
    baseCooldownPenalty: definition.baseCooldownPenalty,
    skill: definition.skill,
  };
}

function toEngineSpellDefinition(definition: ContentSpellDefinition): SpellDefinition {
  return {
    id: definition.id,
    nameKey: definition.nameKey,
    element: definition.element,
    rarity: definition.rarity,
    baseSpeed: definition.baseSpeed,
    baseEnergyPenalty: definition.baseEnergyPenalty,
    baseCooldownPenalty: definition.baseCooldownPenalty,
    effects: definition.effects,
  };
}

type SpellDefinitionFromContent = ContentSpellDefinition;
