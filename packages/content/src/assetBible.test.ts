import { describe, expect, it } from "vitest";
import bible from "../sources/production-items-v2.asset-bible.json";
import materialsAtlas from "./atlases/materials.json";
import { definitions, locales } from "./index";

describe("production item asset bible", () => {
  it("covers every active item definition with complete artwork guidance", () => {
    const items = [
      ...bible.rings,
      ...bible.gems,
      ...bible.monsters,
      ...bible.spells,
      ...bible.materials,
    ];

    expect(bible.counts).toEqual({
      rings: definitions.rings.length,
      gems: definitions.gems.length,
      monsters: definitions.monsters.length,
      spells: definitions.spells.length,
      materials: definitions.materials.length,
      total: items.length,
    });
    expect(new Set(items.map((item) => item.id)).size).toBe(items.length);
    for (const item of items) {
      expect(item.asset.styleId).toBe(bible.assetStyle.id);
      expect(item.asset.visualDescription).not.toHaveLength(0);
      expect(item.asset.generationPrompt).not.toHaveLength(0);
      expect(item.asset.negativePrompt).not.toHaveLength(0);
      expect(item.asset.composition).toMatchObject({
        format: "square",
        background: "transparent",
        subjectCount: 1,
        atlasReady: true,
      });
    }
  });

  it("matches the active runtime definitions and English names", () => {
    expect(
      bible.rings.map((item) => ({
        id: item.id,
        nameKey: `ring.${item.id}.name`,
        element: item.element,
        rarity: item.rarity,
        baseDamage: item.damage,
        baseEnergyCost: item.energyCost,
        baseCooldown: item.cooldown,
        baseSpeed: item.speed,
        intendedRole: item.intendedRole,
      })),
    ).toEqual(definitions.rings);
    expect(
      bible.gems.map((item) => ({
        id: item.id,
        nameKey: `gem.${item.id}.name`,
        element: item.element,
        rarity: item.rarity,
        baseDamage: item.damage,
        baseEnergyPenalty: item.energyPenalty,
        baseCooldownPenalty: item.cooldownPenalty,
        baseSpeed: item.speed,
        intendedRole: item.intendedRole,
      })),
    ).toEqual(definitions.gems);
    expect(
      bible.monsters.map((item) => ({
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
      })),
    ).toEqual(definitions.monsters);
    expect(
      bible.spells.map((item) => ({
        id: item.id,
        nameKey: `spell.${item.id}.name`,
        descriptionKey: `spell.${item.id}.description`,
        element: item.element,
        rarity: item.rarity,
        baseEnergyPenalty: item.energyPenalty,
        baseCooldownPenalty: item.cooldownPenalty,
        effects: item.effects,
        baseSpeed: item.speed,
        targeting: item.targeting,
      })),
    ).toEqual(definitions.spells);
    expect(
      bible.materials.map((item) => ({
        id: item.id,
        nameKey: `material.${item.id}.name`,
        descriptionKey: `material.description.${item.craftingFamily}Crafting`,
        rarity: item.rarity,
        craftingFamily: item.craftingFamily,
        basePrice: item.basePrice,
        realWorldType: item.realWorldType,
        ...(item.atomicNumber === undefined ? {} : { atomicNumber: item.atomicNumber }),
        ...(item.chemicalSymbol === undefined ? {} : { chemicalSymbol: item.chemicalSymbol }),
      })),
    ).toEqual(definitions.materials);

    const englishNames: Readonly<Record<string, string>> = locales.en;
    for (const item of [
      ...bible.rings,
      ...bible.gems,
      ...bible.monsters,
      ...bible.spells,
      ...bible.materials,
    ]) {
      expect(englishNames[`${item.type}.${item.id}.name`]).toBe(item.name);
    }
  });

  it("records the imported production materials atlas", () => {
    expect(bible.productionAtlases.materials).toEqual({
      status: "imported",
      image: materialsAtlas.meta.image,
      metadata: "packages/content/src/atlases/materials.json",
      frameCount: materialsAtlas.frames.length,
      atlasSize: materialsAtlas.meta.size,
      logicalSourceSize: { w: 300, h: 300 },
    });
  });
});
