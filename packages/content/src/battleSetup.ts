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
import playersJson from "./fixtures/players.json";
import type {
  BattleSetupFixture,
  GemDefinition,
  GemInstance,
  InventoryFixture,
  MonsterDefinition as ContentMonsterDefinition,
  PlayerFixture,
  RingDefinition,
  RingInstance,
  SpellDefinition as ContentSpellDefinition,
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

const definitionData = {
  gems: gemDefinitionSchema.array().parse(gemsJson),
  monsters: monsterDefinitionSchema.array().parse(monstersJson),
  rings: ringDefinitionSchema.array().parse(ringsJson),
  spells: spellDefinitionSchema.array().parse(spellsJson),
};

const fixtureData = {
  players: playerFixtureSchema.array().parse(playersJson),
  inventories: inventoryFixtureSchema.parse(inventoriesJson),
  battleSetups: [battleSetupFixtureSchema.parse(basicDuelJson)],
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
  const battlePlayers = setup.playerIds.map((playerId) => {
    const player = players.find((candidate) => candidate.id === playerId);
    if (!player) {
      throw new Error(`Player fixture ${playerId} was not found.`);
    }

    return createBattlePlayer(player, inventory);
  }) as [BattlePlayer, BattlePlayer];

  const startingPlayer = chooseStartingPlayer(battlePlayers);

  return {
    id: setup.id,
    seed: setup.seed,
    status: "active",
    activePlayerId: startingPlayer.id,
    startingPlayerId: startingPlayer.id,
    definitions: {
      monsters: Object.fromEntries(
        definitionData.monsters.map((monster) => [monster.id, toEngineMonsterDefinition(monster)]),
      ),
      spells: Object.fromEntries(
        definitionData.spells.map((spell) => [spell.id, toEngineSpellDefinition(spell)]),
      ),
    },
    players: battlePlayers.map((player) => ({
      ...player,
      energy:
        player.id === startingPlayer.id
          ? { current: 1, maxForTurn: 1, turnCount: 1 }
          : { current: 0, maxForTurn: 0, turnCount: 0 },
    })) as [BattlePlayer, BattlePlayer],
  };
}

function createBattlePlayer(player: PlayerFixture, inventory: InventoryFixture): BattlePlayer {
  const rings = player.equippedRingInstanceIds.map((ringInstanceId) =>
    createRingCombatInstance(player.id, ringInstanceId, inventory),
  );
  const speed = rings.reduce((sum, ring) => sum + ring.speed, 0);
  const maxHealth = 30;

  return {
    id: player.id,
    username: player.username,
    level: player.level,
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
): RingCombatInstance {
  const instance = findRingInstance(inventory, ringInstanceId);
  if (instance.ownerId !== ownerId) {
    throw new Error(`Ring instance ${ringInstanceId} does not belong to player ${ownerId}.`);
  }

  const definition = findRingDefinition(instance.definitionId);
  const gems = instance.socketedGemInstanceIds.map((gemInstanceId) =>
    createGemCombatInstance(ownerId, gemInstanceId, inventory),
  );
  const energyPenalty = gems.reduce((sum, gem) => sum + gem.energyPenalty, 0);
  const cooldownPenalty = gems.reduce((sum, gem) => sum + gem.cooldownPenalty, 0);

  return {
    id: instance.id,
    definitionId: definition.id,
    ownerId: instance.ownerId,
    nameKey: definition.nameKey,
    element: definition.element,
    damage: definition.baseDamage,
    energyCost: Math.max(1, definition.baseEnergyCost + energyPenalty),
    cooldown: definition.baseCooldown + cooldownPenalty,
    currentCooldown: 0,
    speed: definition.baseSpeed,
    gems,
  };
}

function createGemCombatInstance(
  ownerId: string,
  gemInstanceId: string,
  inventory: InventoryFixture,
): GemCombatInstance {
  const instance = findGemInstance(inventory, gemInstanceId);
  if (instance.ownerId !== ownerId) {
    throw new Error(`Gem instance ${gemInstanceId} does not belong to player ${ownerId}.`);
  }

  const definition = findGemDefinition(instance.definitionId);
  const enchantment = instance.enchantment as GemEnchantment | undefined;
  let energyPenalty = definition.baseEnergyPenalty;
  let cooldownPenalty = definition.baseCooldownPenalty;

  if (enchantment?.type === "spell") {
    const spell = findSpellDefinition(enchantment.spellId);
    energyPenalty += spell.baseEnergyPenalty;
    cooldownPenalty += spell.baseCooldownPenalty;
  }

  return {
    id: instance.id,
    definitionId: definition.id,
    ownerId: instance.ownerId,
    nameKey: definition.nameKey,
    element: definition.element,
    damage: definition.baseDamage,
    energyPenalty,
    cooldownPenalty,
    enchantment,
  };
}

function chooseStartingPlayer(players: [BattlePlayer, BattlePlayer]): BattlePlayer {
  const [first, second] = players;
  if (first.hero.speed !== second.hero.speed) {
    return first.hero.speed > second.hero.speed ? first : second;
  }

  if (first.level !== second.level) {
    return first.level < second.level ? first : second;
  }

  return first;
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

function toEngineMonsterDefinition(definition: ContentMonsterDefinition): MonsterDefinition {
  return {
    id: definition.id,
    nameKey: definition.nameKey,
    element: definition.element,
    baseHealth: definition.baseHealth,
    baseDamage: definition.baseDamage,
    baseCooldown: definition.baseCooldown,
    baseSpeed: definition.baseSpeed,
    skills: definition.skills,
  };
}

function toEngineSpellDefinition(definition: ContentSpellDefinition): SpellDefinition {
  return {
    id: definition.id,
    nameKey: definition.nameKey,
    element: definition.element,
    baseEnergyPenalty: definition.baseEnergyPenalty,
    baseCooldownPenalty: definition.baseCooldownPenalty,
    effects: definition.effects,
  };
}

type SpellDefinitionFromContent = ContentSpellDefinition;
