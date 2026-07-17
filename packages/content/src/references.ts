import type {
  BattleSetupFixture,
  GemDefinition,
  InventoryFixture,
  MaterialDefinition,
  MonsterDefinition,
  PlayerFixture,
  RecipeDefinition,
  RingDefinition,
  SpellDefinition,
} from "./schemas";

export type ContentReferenceData = {
  definitions: {
    rings: readonly RingDefinition[];
    gems: readonly GemDefinition[];
    monsters: readonly MonsterDefinition[];
    spells: readonly SpellDefinition[];
    materials: readonly MaterialDefinition[];
    recipes: readonly RecipeDefinition[];
  };
  locales: Readonly<Record<string, Readonly<Record<string, string>>>>;
  players: readonly PlayerFixture[];
  inventory: InventoryFixture;
  battleSetups: readonly BattleSetupFixture[];
};

export class ContentReferenceError extends Error {
  constructor(public readonly issues: readonly string[]) {
    super(`Content reference validation failed:\n- ${issues.join("\n- ")}`);
    this.name = "ContentReferenceError";
  }
}

export function validateContentReferences(data: ContentReferenceData): void {
  const issues: string[] = [];
  const ringDefinitions = indexUnique(data.definitions.rings, "Ring definition", issues);
  const gemDefinitions = indexUnique(data.definitions.gems, "Gem definition", issues);
  const monsterDefinitions = indexUnique(data.definitions.monsters, "Monster definition", issues);
  const spellDefinitions = indexUnique(data.definitions.spells, "Spell definition", issues);
  const materialDefinitions = indexUnique(
    data.definitions.materials,
    "Material definition",
    issues,
  );
  const recipeDefinitions = indexUnique(data.definitions.recipes, "Recipe definition", issues);
  const players = indexUnique(data.players, "Player", issues);
  const rings = indexUnique(data.inventory.rings, "Ring instance", issues);
  const gems = indexUnique(data.inventory.gems, "Gem instance", issues);
  const monsters = indexUnique(data.inventory.monsters, "Monster instance", issues);
  const spells = indexUnique(data.inventory.spells, "Spell instance", issues);

  validateGlobalInstanceIds(data.inventory, issues);

  for (const ring of data.inventory.rings) {
    validateOwner("Ring", ring.id, ring.ownerId, players, issues);
    if (!ringDefinitions.has(ring.definitionId)) {
      issues.push(
        `Ring instance "${ring.id}" references unknown definition "${ring.definitionId}".`,
      );
    }
  }

  for (const gem of data.inventory.gems) {
    validateOwner("Gem", gem.id, gem.ownerId, players, issues);
    if (!gemDefinitions.has(gem.definitionId)) {
      issues.push(`Gem instance "${gem.id}" references unknown definition "${gem.definitionId}".`);
    }
  }

  for (const monster of data.inventory.monsters) {
    validateOwner("Monster", monster.id, monster.ownerId, players, issues);
    if (!monsterDefinitions.has(monster.definitionId)) {
      issues.push(
        `Monster instance "${monster.id}" references unknown definition "${monster.definitionId}".`,
      );
    }
  }

  for (const spell of data.inventory.spells) {
    validateOwner("Spell", spell.id, spell.ownerId, players, issues);
    if (!spellDefinitions.has(spell.definitionId)) {
      issues.push(
        `Spell instance "${spell.id}" references unknown definition "${spell.definitionId}".`,
      );
    }
  }

  validateEquippedRings(data.players, data.inventory.rings, rings, issues);
  validateSocketedGems(data.inventory, gems, issues);
  validateEnchantments(data.inventory, monsters, spells, issues);
  validateBattleSetups(data.battleSetups, players, monsterDefinitions, issues);
  validateMaterials(materialDefinitions.values(), issues);
  validateRecipes(
    recipeDefinitions.values(),
    {
      ringDefinitions,
      gemDefinitions,
      monsterDefinitions,
      spellDefinitions,
      materialDefinitions,
    },
    issues,
  );
  validateLocalization(data, issues);

  if (issues.length > 0) {
    throw new ContentReferenceError(issues);
  }
}

function validateRecipes(
  recipes: Iterable<RecipeDefinition>,
  definitions: {
    ringDefinitions: ReadonlyMap<string, RingDefinition>;
    gemDefinitions: ReadonlyMap<string, GemDefinition>;
    monsterDefinitions: ReadonlyMap<string, MonsterDefinition>;
    spellDefinitions: ReadonlyMap<string, SpellDefinition>;
    materialDefinitions: ReadonlyMap<string, MaterialDefinition>;
  },
  issues: string[],
): void {
  const expectedRaritiesByOutputRarity = {
    common: ["common", "common", "common"],
    refined: ["refined", "common", "common"],
    rare: ["rare", "refined", "common"],
    epic: ["epic", "rare", "refined"],
  } as const satisfies Record<string, readonly string[]>;

  for (const recipe of recipes) {
    const output = outputDefinition(recipe, definitions);
    if (!output) {
      issues.push(
        `Recipe definition "${recipe.id}" references unknown ${recipe.outputType} definition "${recipe.outputDefinitionId}".`,
      );
      continue;
    }

    const expectedRarities = expectedRaritiesByOutputRarity[output.rarity];
    const seenMaterials = new Set<string>();

    for (const [index, ingredient] of recipe.ingredients.entries()) {
      if (seenMaterials.has(ingredient.materialId)) {
        issues.push(
          `Recipe definition "${recipe.id}" uses material "${ingredient.materialId}" more than once.`,
        );
      }
      seenMaterials.add(ingredient.materialId);

      if (ingredient.quantity !== 1) {
        issues.push(
          `Recipe definition "${recipe.id}" ingredient "${ingredient.materialId}" has quantity ${ingredient.quantity}; prototype recipes require quantity 1.`,
        );
      }

      const material = definitions.materialDefinitions.get(ingredient.materialId);
      if (!material) {
        issues.push(
          `Recipe definition "${recipe.id}" references unknown material "${ingredient.materialId}".`,
        );
        continue;
      }
      if (material.craftingFamily !== recipe.outputType) {
        issues.push(
          `Recipe definition "${recipe.id}" uses ${material.craftingFamily} material "${material.id}" for ${recipe.outputType} crafting.`,
        );
      }
      if (material.rarity !== expectedRarities[index]) {
        issues.push(
          `Recipe definition "${recipe.id}" ingredient ${index + 1} uses ${material.rarity} material "${material.id}"; expected ${expectedRarities[index]}.`,
        );
      }
    }
  }
}

function outputDefinition(
  recipe: RecipeDefinition,
  definitions: {
    ringDefinitions: ReadonlyMap<string, RingDefinition>;
    gemDefinitions: ReadonlyMap<string, GemDefinition>;
    monsterDefinitions: ReadonlyMap<string, MonsterDefinition>;
    spellDefinitions: ReadonlyMap<string, SpellDefinition>;
  },
): RingDefinition | GemDefinition | MonsterDefinition | SpellDefinition | undefined {
  if (recipe.outputType === "ring") {
    return definitions.ringDefinitions.get(recipe.outputDefinitionId);
  }
  if (recipe.outputType === "gem") {
    return definitions.gemDefinitions.get(recipe.outputDefinitionId);
  }
  if (recipe.outputType === "monster") {
    return definitions.monsterDefinitions.get(recipe.outputDefinitionId);
  }
  return definitions.spellDefinitions.get(recipe.outputDefinitionId);
}

function validateMaterials(materials: Iterable<MaterialDefinition>, issues: string[]): void {
  const expectedPriceByRarity = {
    common: 100,
    refined: 400,
    rare: 1600,
    epic: 6400,
  } as const;
  const atomicNumberOwner = new Map<number, string>();
  const chemicalSymbolOwner = new Map<string, string>();

  for (const material of materials) {
    const expectedPrice = expectedPriceByRarity[material.rarity];
    if (material.basePrice !== expectedPrice) {
      issues.push(
        `Material definition "${material.id}" has base price ${material.basePrice}; ${material.rarity} materials require ${expectedPrice}.`,
      );
    }

    if (material.realWorldType !== "chemicalElement") {
      continue;
    }

    if (material.atomicNumber !== undefined) {
      const existingId = atomicNumberOwner.get(material.atomicNumber);
      if (existingId) {
        issues.push(
          `Chemical materials "${existingId}" and "${material.id}" share atomic number ${material.atomicNumber}.`,
        );
      } else {
        atomicNumberOwner.set(material.atomicNumber, material.id);
      }
    }

    if (material.chemicalSymbol !== undefined) {
      const existingId = chemicalSymbolOwner.get(material.chemicalSymbol);
      if (existingId) {
        issues.push(
          `Chemical materials "${existingId}" and "${material.id}" share symbol "${material.chemicalSymbol}".`,
        );
      } else {
        chemicalSymbolOwner.set(material.chemicalSymbol, material.id);
      }
    }
  }
}

function validateLocalization(data: ContentReferenceData, issues: string[]): void {
  const requiredKeys = new Set<string>();
  for (const definitions of [
    data.definitions.rings,
    data.definitions.gems,
    data.definitions.monsters,
    data.definitions.spells,
    data.definitions.materials,
  ]) {
    for (const definition of definitions) {
      requiredKeys.add(definition.nameKey);
    }
  }
  for (const material of data.definitions.materials) {
    requiredKeys.add(material.descriptionKey);
  }

  for (const [localeId, locale] of Object.entries(data.locales)) {
    for (const key of requiredKeys) {
      if (!(key in locale)) {
        issues.push(`Locale "${localeId}" is missing required key "${key}".`);
      }
    }
  }
}

function validateEquippedRings(
  players: readonly PlayerFixture[],
  ringInstances: readonly InventoryFixture["rings"][number][],
  rings: ReadonlyMap<string, InventoryFixture["rings"][number]>,
  issues: string[],
): void {
  const referencedBy = new Map<string, string>();

  for (const player of players) {
    if (player.equippedRingInstanceIds.length > 10) {
      issues.push(`Player "${player.id}" equips more than 10 rings.`);
    }

    validateNoDuplicateReferences(
      player.equippedRingInstanceIds,
      `Player "${player.id}" equipped rings`,
      issues,
    );

    for (const ringId of player.equippedRingInstanceIds) {
      const previousPlayerId = referencedBy.get(ringId);
      if (previousPlayerId && previousPlayerId !== player.id) {
        issues.push(
          `Ring instance "${ringId}" is equipped by both "${previousPlayerId}" and "${player.id}".`,
        );
      } else {
        referencedBy.set(ringId, player.id);
      }

      const ring = rings.get(ringId);
      if (!ring) {
        issues.push(`Player "${player.id}" equips unknown ring instance "${ringId}".`);
        continue;
      }
      if (ring.ownerId !== player.id) {
        issues.push(
          `Player "${player.id}" equips ring instance "${ringId}" owned by "${ring.ownerId}".`,
        );
      }
      if (!ring.equipped) {
        issues.push(
          `Player "${player.id}" references ring instance "${ringId}" which is not marked equipped.`,
        );
      }
    }
  }

  for (const ring of ringInstances) {
    if (ring.equipped && referencedBy.get(ring.id) !== ring.ownerId) {
      issues.push(
        `Ring instance "${ring.id}" is marked equipped but is not equipped by owner "${ring.ownerId}".`,
      );
    }
  }
}

function validateSocketedGems(
  inventory: InventoryFixture,
  gems: ReadonlyMap<string, InventoryFixture["gems"][number]>,
  issues: string[],
): void {
  const socketedBy = new Map<string, string>();

  for (const ring of inventory.rings) {
    if (ring.socketedGemInstanceIds.length > ring.socketCount) {
      issues.push(
        `Ring instance "${ring.id}" has ${ring.socketedGemInstanceIds.length} socketed gems but only ${ring.socketCount} sockets.`,
      );
    }

    validateNoDuplicateReferences(
      ring.socketedGemInstanceIds,
      `Ring instance "${ring.id}" socketed gems`,
      issues,
    );

    for (const gemId of ring.socketedGemInstanceIds) {
      const previousRingId = socketedBy.get(gemId);
      if (previousRingId && previousRingId !== ring.id) {
        issues.push(
          `Gem instance "${gemId}" is socketed in both "${previousRingId}" and "${ring.id}".`,
        );
      } else {
        socketedBy.set(gemId, ring.id);
      }

      const gem = gems.get(gemId);
      if (!gem) {
        issues.push(`Ring instance "${ring.id}" sockets unknown gem instance "${gemId}".`);
        continue;
      }
      if (gem.ownerId !== ring.ownerId) {
        issues.push(
          `Ring instance "${ring.id}" sockets gem instance "${gemId}" owned by "${gem.ownerId}".`,
        );
      }
    }
  }
}

function validateEnchantments(
  inventory: InventoryFixture,
  monsters: ReadonlyMap<string, InventoryFixture["monsters"][number]>,
  spells: ReadonlyMap<string, InventoryFixture["spells"][number]>,
  issues: string[],
): void {
  const enchantedBy = new Map<string, string>();

  for (const gem of inventory.gems) {
    const enchantment = gem.enchantment;
    if (!enchantment) {
      continue;
    }

    const instanceId =
      enchantment.type === "monster" ? enchantment.monsterInstanceId : enchantment.spellInstanceId;
    const previousGemId = enchantedBy.get(instanceId);
    if (previousGemId && previousGemId !== gem.id) {
      issues.push(
        `${capitalize(enchantment.type)} instance "${instanceId}" enchants both "${previousGemId}" and "${gem.id}".`,
      );
    } else {
      enchantedBy.set(instanceId, gem.id);
    }

    const instance =
      enchantment.type === "monster" ? monsters.get(instanceId) : spells.get(instanceId);
    if (!instance) {
      issues.push(
        `Gem instance "${gem.id}" references unknown ${enchantment.type} instance "${instanceId}".`,
      );
      continue;
    }
    if (instance.ownerId !== gem.ownerId) {
      issues.push(
        `Gem instance "${gem.id}" references ${enchantment.type} instance "${instanceId}" owned by "${instance.ownerId}".`,
      );
    }
  }
}

function validateBattleSetups(
  battleSetups: readonly BattleSetupFixture[],
  players: ReadonlyMap<string, PlayerFixture>,
  monsterDefinitions: ReadonlyMap<string, MonsterDefinition>,
  issues: string[],
): void {
  indexUnique(battleSetups, "Battle setup", issues);

  for (const setup of battleSetups) {
    const [firstPlayerId, secondPlayerId] = setup.playerIds;
    if (firstPlayerId === secondPlayerId) {
      issues.push(`Battle setup "${setup.id}" must reference two different players.`);
    }

    for (const playerId of setup.playerIds) {
      if (!players.has(playerId)) {
        issues.push(`Battle setup "${setup.id}" references unknown player "${playerId}".`);
      }
    }

    const initialMonsterCountByPlayer = new Map<string, number>();
    for (const initialMonster of setup.initialMonsters ?? []) {
      if (!setup.playerIds.includes(initialMonster.playerId)) {
        issues.push(
          `Battle setup "${setup.id}" gives an initial monster to non-participant "${initialMonster.playerId}".`,
        );
      }
      if (!monsterDefinitions.has(initialMonster.monsterId)) {
        issues.push(
          `Battle setup "${setup.id}" references unknown initial monster definition "${initialMonster.monsterId}".`,
        );
      }

      const count = (initialMonsterCountByPlayer.get(initialMonster.playerId) ?? 0) + 1;
      initialMonsterCountByPlayer.set(initialMonster.playerId, count);
      if (count === 4) {
        issues.push(
          `Battle setup "${setup.id}" gives more than 3 initial monsters to "${initialMonster.playerId}".`,
        );
      }
    }
  }
}

function validateGlobalInstanceIds(inventory: InventoryFixture, issues: string[]): void {
  const seen = new Map<string, string>();
  const groups = [
    ["ring", inventory.rings],
    ["gem", inventory.gems],
    ["monster", inventory.monsters],
    ["spell", inventory.spells],
  ] as const;

  for (const [kind, instances] of groups) {
    for (const instance of instances) {
      const previousKind = seen.get(instance.id);
      if (previousKind) {
        issues.push(
          `Inventory instance ID "${instance.id}" is used by both a ${previousKind} and a ${kind}.`,
        );
      } else {
        seen.set(instance.id, kind);
      }
    }
  }
}

function validateOwner(
  kind: string,
  instanceId: string,
  ownerId: string,
  players: ReadonlyMap<string, PlayerFixture>,
  issues: string[],
): void {
  if (!players.has(ownerId)) {
    issues.push(`${kind} instance "${instanceId}" has unknown owner "${ownerId}".`);
  }
}

function validateNoDuplicateReferences(
  ids: readonly string[],
  label: string,
  issues: string[],
): void {
  const seen = new Set<string>();
  for (const id of ids) {
    if (seen.has(id)) {
      issues.push(`${label} contains duplicate reference "${id}".`);
    }
    seen.add(id);
  }
}

function indexUnique<T extends { id: string }>(
  values: readonly T[],
  label: string,
  issues: string[],
): Map<string, T> {
  const result = new Map<string, T>();
  for (const value of values) {
    if (result.has(value.id)) {
      issues.push(`${label} ID "${value.id}" is duplicated.`);
    } else {
      result.set(value.id, value);
    }
  }
  return result;
}

function capitalize(value: string): string {
  return `${value.charAt(0).toUpperCase()}${value.slice(1)}`;
}
