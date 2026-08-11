import { readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const scriptDirectory = dirname(fileURLToPath(import.meta.url));
const contentRoot = resolve(scriptDirectory, "..");
const definitionsRoot = resolve(contentRoot, "src", "definitions");
const localesRoot = resolve(contentRoot, "src", "locales");
const biblePath = resolve(contentRoot, "sources", "production-items-v2.asset-bible.json");
const productionSpellsPath = resolve(contentRoot, "sources", "production-spells-v1.json");

const readJson = async (path) => JSON.parse(await readFile(path, "utf8"));
const writeJson = async (path, value) =>
  writeFile(path, `${JSON.stringify(value, null, 2)}\n`, "utf8");

const bible = await readJson(biblePath);
const productionSpells = await readJson(productionSpellsPath);
const materials = await readJson(resolve(definitionsRoot, "materials.json"));
const locales = {
  en: await readJson(resolve(localesRoot, "en.json")),
  fr: await readJson(resolve(localesRoot, "fr.json")),
};

assertBible(bible, productionSpells);

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

const spells = productionSpells.spells.map((spell) => ({
  id: spell.id,
  nameKey: `spell.${spell.id}.name`,
  descriptionKey: `spell.${spell.id}.description`,
  element: spell.element,
  rarity: spell.rarity,
  baseEnergyPenalty: spell.baseEnergyPenalty,
  baseCooldownPenalty: spell.baseCooldownPenalty,
  baseSpeed: spell.baseSpeed,
  targeting: spell.targeting,
  effects: spell.effects,
}));

for (const [language, locale] of Object.entries(locales)) {
  removeDefinitionNames(locale, ["ring", "gem", "monster", "spell"]);
  for (const [kind, items] of [
    ["ring", bible.rings],
    ["gem", bible.gems],
    ["monster", bible.monsters],
  ]) {
    for (const item of items) locale[`${kind}.${item.id}.name`] = item.name;
  }
  for (const spell of productionSpells.spells) {
    locale[`spell.${spell.id}.name`] = spell.name;
    locale[`spell.${spell.id}.description`] =
      language === "fr" ? frenchSpellDescription(spell.id) : spell.gameplayDescription;
  }
  locales[language] = sortObject(locale);
}

const generatedRecipes = [
  ...generateRecipes("ring", rings, materials),
  ...generateRecipes("gem", gems, materials),
  ...generateRecipes("monster", monsters, materials),
  ...generateRecipes("spell", spells, materials),
];

const generatedBible = {
  ...bible,
  contentVersion: "production-items-v2",
  counts: { ...bible.counts, spells: 42, total: 289 },
  spells: productionSpells.spells.map((spell) => ({
    id: spell.id,
    name: spell.name,
    type: "spell",
    element: spell.element,
    rarity: spell.rarity,
    energyPenalty: spell.baseEnergyPenalty,
    cooldownPenalty: spell.baseCooldownPenalty,
    speed: spell.baseSpeed,
    targeting: spell.targeting,
    effects: spell.effects,
    intendedRole: spell.gameplayDescription,
    asset: {
      styleId: "battlenessAssetStyleV1",
      visualDescription: spell.assetDescription,
      generationPrompt: spell.assetDescription,
      negativePrompt:
        "text, letters, numbers, logo, watermark, UI frame, card border, atlas grid, cropped effect, opaque background",
      composition: {
        format: "square",
        background: "transparent",
        subjectCount: 1,
        framing: "centered with safe transparent margin",
        camera: "front-biased three-quarter view",
        atlasReady: true,
      },
      visualTags: ["spell", spell.element, spell.rarity],
    },
  })),
  productionAtlases: {
    ...bible.productionAtlases,
    spells: {
      status: "imported",
      image: "spells.png",
      metadata: "packages/content/src/atlases/spells.json",
      frameCount: 42,
      atlasSize: { w: 1876, h: 1460 },
      logicalSourceSize: { w: 300, h: 300 },
    },
  },
};

await Promise.all([
  writeJson(resolve(definitionsRoot, "rings.json"), rings),
  writeJson(resolve(definitionsRoot, "gems.json"), gems),
  writeJson(resolve(definitionsRoot, "monsters.json"), monsters),
  writeJson(resolve(definitionsRoot, "spells.json"), spells),
  writeJson(resolve(definitionsRoot, "recipes.json"), generatedRecipes),
  writeJson(resolve(localesRoot, "en.json"), locales.en),
  writeJson(resolve(localesRoot, "fr.json"), locales.fr),
  writeJson(biblePath, generatedBible),
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

function assertBible(value, spellCatalogue) {
  if (
    value.contentVersion !== "production-items-v1" &&
    value.contentVersion !== "production-items-v2"
  ) {
    throw new Error(`Unexpected production content version: ${value.contentVersion}.`);
  }
  if (
    spellCatalogue.contentVersion !== "production-items-v2" ||
    spellCatalogue.status !== "approved-for-production" ||
    spellCatalogue.spells.length !== 42
  ) {
    throw new Error("The production spell catalogue must be approved for production-items-v2.");
  }
  for (const [kind, expected] of [
    ["rings", 54],
    ["gems", 54],
    ["monsters", 69],
    ["spells", value.contentVersion === "production-items-v2" ? 42 : 6],
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

function frenchSpellDescription(id) {
  return {
    burnI:
      "Applique BRULURE au monstre cible. Elle inflige 3 degats de feu au debut du prochain tour de son controleur, puis expire.",
    burnII:
      "Applique BRULURE au monstre cible. Elle inflige 3 degats de feu au debut de chacun des 2 prochains tours de son controleur.",
    burnIII:
      "Applique BRULURE au monstre cible. Elle inflige 3 degats de feu au debut de chacun des 3 prochains tours de son controleur.",
    carbonize:
      "Applique BRULURE pendant 1 tour a tous les monstres en jeu, allies compris. Chaque Brulure inflige 3 degats de feu.",
    giftPierce:
      "Accorde PIERCE au monstre cible pour le reste du combat. Aucun effet supplementaire s'il possede deja PIERCE.",
    damageOnKill:
      "Pour le reste du combat, lorsque la bague soutenue tue un monstre avec ses degats de bague et gemmes, elle gagne +2 degats.",
    devotion:
      "Detruit le monstre allie cible. Un autre monstre allie aleatoire gagne autant de degats que les degats actuels du monstre detruit.",
    pierceLegacy:
      "Si les degats de bague et gemmes de cette action detruisent le monstre ennemi cible, inflige les degats excedentaires a son hero.",
    destruction: "Detruit tous les monstres actuellement en jeu, allies et ennemis.",
    giftRage:
      "Accorde RAGE au monstre cible pour le reste du combat. Aucun effet supplementaire s'il possede deja RAGE.",
    bloodflame:
      "Inflige 2 degats de feu au monstre allie cible. S'il survit, il gagne definitivement +2 degats pour ce combat.",
    chainExplosion:
      "Detruit le monstre allie cible, puis inflige a chaque monstre ennemi des degats de feu egaux a ses degats actuels.",
    funeralBrand:
      "Marque le monstre ennemi cible pour cette action. S'il est detruit pendant l'action complete, inflige ses degats actuels a son hero.",
    lastBreath:
      "Jusqu'a la fin du tour actuel, si le monstre allie cible est detruit, il effectue une derniere attaque contre une cible ennemie legale aleatoire.",
    shockI:
      "Applique CHOC au monstre cible pendant 1 tour de son proprietaire. Il ne peut pas attaquer mais conserve TAUNT.",
    shockII: "Applique CHOC au monstre cible pendant 2 tours de son proprietaire.",
    shockIII: "Applique CHOC au monstre cible pendant 3 tours de son proprietaire.",
    electroshock:
      "Applique CHOC pendant 1 tour de leur proprietaire a tous les monstres en jeu, allies et ennemis.",
    energyOnKill:
      "Pour le reste du combat, lorsque la bague soutenue tue un monstre avec ses degats de bague et gemmes, son hero recupere 1 energie.",
    sacrifice: "Detruit le monstre allie cible, puis detruit un monstre ennemi aleatoire.",
    copy: "Cree une copie du monstre cible avec ses degats, points de vie actuels et maximums, cooldown de base, element et competences actuels. Cooldown initial : 1.",
    transmute:
      "Transforme le monstre cible en monstre electrique 2/2, cooldown 1, sans competence.",
    arcRelay:
      "Inflige 2 degats electriques au monstre cible, puis 1 degat electrique a un autre monstre aleatoire controle par le meme joueur.",
    quickPulse: "Met le cooldown actuel du monstre allie cible a 0.",
    shortCircuit: "Met le cooldown actuel du monstre ennemi cible a sa valeur maximale resolue.",
    zerakaiProtocol:
      "Cree une copie temporaire du monstre allie cible avec ses degats et son element, 1 PV, aucune competence et cooldown 0. Elle est detruite en fin de tour.",
    zeroInterval:
      "Cible un monstre allie et met le cooldown actuel de tous les monstres allies a 0.",
    giftMultiHit:
      "Accorde MULTIHIT au monstre cible pour le reste du combat. Aucun effet supplementaire s'il le possede deja.",
    freezeI:
      "Applique GEL au monstre cible pendant 1 tour de son proprietaire. Il ne peut ni attaquer ni fournir TAUNT.",
    freezeII: "Applique GEL au monstre cible pendant 2 tours de son proprietaire.",
    freezeIII: "Applique GEL au monstre cible pendant 3 tours de son proprietaire.",
    stompI: "Inflige 2 degats de glace a chaque monstre ennemi.",
    stompII: "Inflige 3 degats de glace a chaque monstre en jeu non controle par le lanceur.",
    stompIII: "Inflige 4 degats de glace a chaque monstre ennemi.",
    deepFreezing:
      "Applique GEL pendant 1 tour de leur proprietaire a tous les monstres en jeu, allies et ennemis.",
    giftTaunt:
      "Accorde TAUNT au monstre cible pour le reste du combat. Aucun effet supplementaire s'il le possede deja.",
    cooldownOnKill:
      "Pour le reste du combat, lorsque la bague soutenue tue un monstre avec ses degats de bague et gemmes, reduit son cooldown actuel de 1.",
    cleanse:
      "Retire tous les statuts temporaires positifs et negatifs du monstre cible, sans retirer ses competences naturelles ou accordees.",
    refresh:
      "Reduit de 1 le cooldown actuel d'une bague alliee aleatoire actuellement en cooldown.",
    rimeLock: "Augmente de 1 le cooldown actuel du monstre cible, sans depasser sa valeur resolue.",
    crystalSkin:
      "Accorde un SHIELD temporaire au monstre allie cible jusqu'au debut du prochain tour de son controleur. Aucun effet s'il a deja un Shield actif.",
    giftShield:
      "Accorde SHIELD au monstre cible pour le reste du combat. Aucun effet supplementaire s'il possede deja cette competence.",
  }[id];
}

for (const spell of productionSpells.spells) {
  if (!frenchSpellDescription(spell.id)) {
    throw new Error(`Missing French gameplay description for ${spell.id}.`);
  }
}
