import { readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const scriptDirectory = dirname(fileURLToPath(import.meta.url));
const contentRoot = resolve(scriptDirectory, "..");
const definitionsRoot = resolve(contentRoot, "src", "definitions");
const localesRoot = resolve(contentRoot, "src", "locales");
const biblePath = resolve(contentRoot, "sources", "production-items-v1.asset-bible.json");

const readJson = async (path) => JSON.parse(await readFile(path, "utf8"));
const writeJson = async (path, value) =>
  writeFile(path, `${JSON.stringify(value, null, 2)}\n`, "utf8");

const bible = await readJson(biblePath);
const materials = await readJson(resolve(definitionsRoot, "materials.json"));
const existingRecipes = await readJson(resolve(definitionsRoot, "recipes.json"));
const spells = await readJson(resolve(definitionsRoot, "spells.json"));
const locales = {
  en: await readJson(resolve(localesRoot, "en.json")),
  fr: await readJson(resolve(localesRoot, "fr.json")),
};

assertBible(bible);

const rings = bible.rings.map((item) => ({
  id: item.id,
  nameKey: `ring.${item.id}.name`,
  element: item.element,
  rarity: item.rarity,
  baseDamage: item.damage,
  baseEnergyCost: item.energyCost,
  baseCooldown: item.cooldown,
  baseSpeed: item.speed,
  intendedRole: item.intendedRole,
}));

const gems = bible.gems.map((item) => ({
  id: item.id,
  nameKey: `gem.${item.id}.name`,
  element: item.element,
  rarity: item.rarity,
  baseDamage: item.damage,
  baseEnergyPenalty: item.energyPenalty,
  baseCooldownPenalty: item.cooldownPenalty,
  baseSpeed: item.speed,
  intendedRole: item.intendedRole,
}));

const monsters = bible.monsters.map((item) => ({
  id: item.id,
  nameKey: `monster.${item.id}.name`,
  element: item.element,
  rarity: item.rarity,
  baseHealth: item.health,
  baseDamage: item.damage,
  baseCooldown: item.cooldown,
  baseSpeed: item.speed,
  baseEnergyPenalty: item.energyPenalty,
  baseCooldownPenalty: item.cooldownPenalty,
  ...(item.skill ? { skill: item.skill } : {}),
  intendedRole: item.intendedRole,
}));

for (const spell of spells) {
  spell.baseSpeed ??= 0;
}

for (const [language, locale] of Object.entries(locales)) {
  removeDefinitionNames(locale, ["ring", "gem", "monster"]);
  for (const [kind, items] of [
    ["ring", bible.rings],
    ["gem", bible.gems],
    ["monster", bible.monsters],
  ]) {
    for (const item of items) locale[`${kind}.${item.id}.name`] = item.name;
  }
  locales[language] = sortObject(locale);
}

const generatedRecipes = [
  ...generateRecipes("ring", rings, materials),
  ...generateRecipes("gem", gems, materials),
  ...generateRecipes("monster", monsters, materials),
  ...existingRecipes.filter((recipe) => recipe.outputType === "spell"),
];

await Promise.all([
  writeJson(resolve(definitionsRoot, "rings.json"), rings),
  writeJson(resolve(definitionsRoot, "gems.json"), gems),
  writeJson(resolve(definitionsRoot, "monsters.json"), monsters),
  writeJson(resolve(definitionsRoot, "spells.json"), spells),
  writeJson(resolve(definitionsRoot, "recipes.json"), generatedRecipes),
  writeJson(resolve(localesRoot, "en.json"), locales.en),
  writeJson(resolve(localesRoot, "fr.json"), locales.fr),
]);

function generateRecipes(kind, items, allMaterials) {
  const materialsByRarity = Object.fromEntries(
    ["common", "refined", "rare", "epic"].map((rarity) => [
      rarity,
      allMaterials
        .filter((material) => material.craftingFamily === kind && material.rarity === rarity)
        .map((material) => material.id)
        .sort(),
    ]),
  );
  const usage = new Map();
  const recipes = [];

  for (const rarity of ["common", "refined", "rare", "epic"]) {
    const outputs = items.filter((item) => item.rarity === rarity);
    const candidates = recipeCandidates(rarity, materialsByRarity);
    if (candidates.length < outputs.length) {
      throw new Error(
        `${kind}/${rarity} needs ${outputs.length} unique recipes but has ${candidates.length} combinations.`,
      );
    }

    for (const output of outputs) {
      candidates.sort((left, right) => compareCandidateUsage(left, right, usage));
      const selected = candidates.shift();
      for (const materialId of selected) {
        usage.set(materialId, (usage.get(materialId) ?? 0) + 1);
      }
      recipes.push({
        id: `craft${capitalize(kind)}${capitalize(output.id)}`,
        outputType: kind,
        outputDefinitionId: output.id,
        craftedLevel: 1,
        craftedQuality: 0,
        ...(kind === "ring" ? { ringSocketCount: 1 } : {}),
        ingredients: aggregateIngredients(selected),
      });
    }
  }

  return recipes;
}

function recipeCandidates(rarity, materials) {
  if (rarity === "common") return combinationsWithRepetition(materials.common, 3);
  if (rarity === "refined") {
    return product(materials.refined, combinationsWithRepetition(materials.common, 2));
  }
  if (rarity === "rare") return cartesian(materials.rare, materials.refined, materials.common);
  return cartesian(materials.epic, materials.rare, materials.refined);
}

function combinationsWithRepetition(values, size, start = 0, prefix = []) {
  if (prefix.length === size) return [prefix];
  const combinations = [];
  for (let index = start; index < values.length; index += 1) {
    combinations.push(
      ...combinationsWithRepetition(values, size, index, [...prefix, values[index]]),
    );
  }
  return combinations;
}

function product(first, tails) {
  return first.flatMap((value) => tails.map((tail) => [value, ...tail]));
}

function cartesian(...groups) {
  return groups.reduce(
    (results, group) => results.flatMap((result) => group.map((value) => [...result, value])),
    [[]],
  );
}

function compareCandidateUsage(left, right, usage) {
  const leftScore = usageScore(left, usage);
  const rightScore = usageScore(right, usage);
  return (
    leftScore.maximum - rightScore.maximum ||
    leftScore.total - rightScore.total ||
    left.join(":").localeCompare(right.join(":"))
  );
}

function usageScore(candidate, usage) {
  const projected = candidate.map((id) => (usage.get(id) ?? 0) + 1);
  return {
    maximum: Math.max(...projected),
    total: projected.reduce((sum, value) => sum + value, 0),
  };
}

function aggregateIngredients(materialIds) {
  const quantities = new Map();
  for (const materialId of materialIds) {
    quantities.set(materialId, (quantities.get(materialId) ?? 0) + 1);
  }
  return [...quantities.entries()].map(([materialId, quantity]) => ({ materialId, quantity }));
}

function removeDefinitionNames(locale, kinds) {
  for (const key of Object.keys(locale)) {
    if (kinds.some((kind) => key.startsWith(`${kind}.`) && key.endsWith(".name"))) {
      delete locale[key];
    }
  }
}

function sortObject(value) {
  return Object.fromEntries(
    Object.entries(value).sort(([left], [right]) => left.localeCompare(right)),
  );
}

function capitalize(value) {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function assertBible(value) {
  if (value.contentVersion !== "production-items-v1") {
    throw new Error(`Unexpected production content version: ${value.contentVersion}.`);
  }
  for (const [kind, expected] of [
    ["rings", 54],
    ["gems", 54],
    ["monsters", 69],
    ["spells", 6],
    ["materials", 70],
  ]) {
    if (!Array.isArray(value[kind]) || value[kind].length !== expected) {
      throw new Error(`Expected ${expected} ${kind} in the production asset bible.`);
    }
    if (value.counts?.[kind] !== expected) {
      throw new Error(`Expected the asset bible count for ${kind} to be ${expected}.`);
    }
  }

  const items = [
    ...value.rings,
    ...value.gems,
    ...value.monsters,
    ...value.spells,
    ...value.materials,
  ];
  if (value.counts?.total !== items.length) {
    throw new Error(`Expected the asset bible total count to be ${items.length}.`);
  }
  for (const item of items) {
    if (
      !item.asset ||
      !item.asset.visualDescription ||
      !item.asset.generationPrompt ||
      !item.asset.negativePrompt
    ) {
      throw new Error(`Asset bible item ${item.id} has incomplete artwork guidance.`);
    }
  }
}
