import { describe, expect, it } from "vitest";
import productionSpells from "../sources/production-spells-v1.json";
import {
  applyStatusEffectSchema,
  conditionalPierceForActionEffectSchema,
  copyMonsterEffectSchema,
  createTemporaryMonsterCopyEffectSchema,
  captureStatEffectSchema,
  dealDamageToAllEffectSchema,
  destroyAllMonstersEffectSchema,
  destroyMonsterEffectSchema,
  forEachMonsterEffectSchema,
  grantSkillEffectSchema,
  grantTemporaryShieldEffectSchema,
  ifTargetSurvivesEffectSchema,
  lastBreathStatusEffectSchema,
  modifyCurrentCooldownEffectSchema,
  randomTargetEffectSchema,
  registerActionScopedTriggerEffectSchema,
  registerTriggerEffectSchema,
  removeStatusesEffectSchema,
  setCurrentCooldownEffectSchema,
  setCurrentCooldownForAllEffectSchema,
  spellDefinitionSchema,
  spellTargetingSchema,
  transformMonsterEffectSchema,
} from "./schemas";

describe("production spell slice A schemas", () => {
  const sliceAIds = [
    "burnI",
    "burnII",
    "burnIII",
    "shockI",
    "shockII",
    "shockIII",
    "freezeI",
    "freezeII",
    "freezeIII",
    "stompI",
    "stompII",
    "stompIII",
    "carbonize",
    "electroshock",
    "deepFreezing",
    "rimeLock",
    "cleanse",
  ] as const;

  it("strictly validates every dormant Slice A targeting and effect definition", () => {
    const spells = productionSpells.spells.filter((spell) =>
      sliceAIds.includes(spell.id as (typeof sliceAIds)[number]),
    );
    expect(spells.map((spell) => spell.id).sort()).toEqual([...sliceAIds].sort());

    for (const spell of spells) {
      expect(() => spellTargetingSchema.parse(spell.targeting)).not.toThrow();
      expect(() => spellDefinitionSchema.shape.effects.parse(spell.effects)).not.toThrow();
      expect(spell.baseEnergyPenalty * 10).toBe(Math.round(spell.baseEnergyPenalty * 10));
      expect(spell.baseCooldownPenalty * 10).toBe(Math.round(spell.baseCooldownPenalty * 10));
    }
  });

  it("accepts the approved status and area effect primitives", () => {
    expect(
      applyStatusEffectSchema.parse({
        type: "applyStatus",
        status: "burn",
        damage: 3,
        durationOwnerTurns: 2,
        tickTiming: "startOfTargetControllerTurn",
      }),
    ).toMatchObject({ status: "burn", durationOwnerTurns: 2 });
    expect(
      forEachMonsterEffectSchema.parse({
        type: "forEachMonster",
        scope: "allMonsters",
        effect: {
          type: "applyStatus",
          status: "freeze",
          durationOwnerTurns: 1,
        },
      }),
    ).toMatchObject({ type: "forEachMonster" });
    expect(
      dealDamageToAllEffectSchema.parse({
        type: "dealDamageToAll",
        scope: "enemyMonsters",
        amount: 4,
        element: "ice",
      }),
    ).toMatchObject({ amount: 4 });
  });

  it("accepts immediate cooldown and cleanse primitives", () => {
    expect(
      modifyCurrentCooldownEffectSchema.parse({
        type: "modifyCurrentCooldown",
        target: "selected",
        amount: 1,
        maximumFrom: "resolvedBaseCooldown",
      }),
    ).toMatchObject({ amount: 1 });
    expect(
      removeStatusesEffectSchema.parse({
        type: "removeStatuses",
        target: "selected",
        scope: "allTemporaryStatuses",
        removeSkills: false,
      }),
    ).toMatchObject({ removeSkills: false });
  });

  it("rejects invalid targeting combinations and unchecked effect fields", () => {
    expect(() =>
      spellTargetingSchema.parse({ selection: "none", allowedTargets: ["anyMonster"] }),
    ).toThrow();
    expect(() => spellTargetingSchema.parse({ selection: "one", allowedTargets: [] })).toThrow();
    expect(() =>
      applyStatusEffectSchema.parse({
        type: "applyStatus",
        status: "shock",
        durationOwnerTurns: 1,
        damage: 3,
      }),
    ).toThrow();
  });

  it("accepts fixed-point production penalties", () => {
    const definition = spellDefinitionSchema.parse({
      id: "burnI",
      nameKey: "spell.burnI.name",
      descriptionKey: "spell.burnI.description",
      element: "fire",
      rarity: "common",
      baseSpeed: 1,
      baseEnergyPenalty: 0.3,
      baseCooldownPenalty: 0.4,
      targeting: { selection: "one", allowedTargets: ["anyMonster"] },
      effects: [
        {
          type: "applyStatus",
          status: "burn",
          damage: 3,
          durationOwnerTurns: 1,
        },
      ],
    });

    expect(definition).toMatchObject({ id: "burnI", baseEnergyPenalty: 0.3 });
    expect(() => spellDefinitionSchema.parse({ ...definition, baseEnergyPenalty: 0.35 })).toThrow();
  });
});

describe("production spell slice D schemas", () => {
  const sliceDIds = [
    "devotion",
    "sacrifice",
    "destruction",
    "chainExplosion",
    "copy",
    "transmute",
    "arcRelay",
    "zerakaiProtocol",
  ] as const;

  it("strictly validates every dormant Slice D targeting and effect definition", () => {
    const spells = productionSpells.spells.filter((spell) =>
      sliceDIds.includes(spell.id as (typeof sliceDIds)[number]),
    );
    expect(spells.map((spell) => spell.id).sort()).toEqual([...sliceDIds].sort());
    for (const spell of spells) {
      expect(() => spellTargetingSchema.parse(spell.targeting)).not.toThrow();
      expect(() => spellDefinitionSchema.shape.effects.parse(spell.effects)).not.toThrow();
    }
  });

  it("accepts destruction, capture, copy, temporary copy, and transformation primitives", () => {
    expect(
      destroyMonsterEffectSchema.parse({ type: "destroyMonster", target: "selected" }),
    ).toMatchObject({ type: "destroyMonster" });
    expect(
      destroyAllMonstersEffectSchema.parse({ type: "destroyAllMonsters", scope: "allMonsters" }),
    ).toMatchObject({ type: "destroyAllMonsters" });
    expect(
      captureStatEffectSchema.parse({
        type: "captureStat",
        source: "selected",
        stat: "currentDamage",
      }),
    ).toMatchObject({ stat: "currentDamage" });
    expect(
      copyMonsterEffectSchema.parse({
        type: "copyMonster",
        source: "selected",
        copyMode: "currentCombatStats",
        initialCooldown: 1,
        copyStatuses: false,
      }),
    ).toMatchObject({ type: "copyMonster" });
    expect(
      createTemporaryMonsterCopyEffectSchema.parse({
        type: "createTemporaryMonsterCopy",
        source: "selected",
        copyDamage: true,
        copyElement: true,
        maxHealth: 1,
        skill: null,
        initialCooldown: 0,
        expires: "endOfCurrentTurn",
      }),
    ).toMatchObject({ type: "createTemporaryMonsterCopy" });
    expect(
      transformMonsterEffectSchema.parse({
        type: "transformMonster",
        target: "selected",
        result: {
          element: "electric",
          damage: 2,
          maxHealth: 2,
          currentHealth: 2,
          baseCooldown: 1,
          currentCooldown: 1,
          skill: null,
        },
      }),
    ).toMatchObject({ type: "transformMonster" });
  });
});

describe("production spell slice C schemas", () => {
  const sliceCIds = [
    "damageOnKill",
    "energyOnKill",
    "cooldownOnKill",
    "pierceLegacy",
    "bloodflame",
    "funeralBrand",
    "lastBreath",
  ] as const;

  it("strictly validates every dormant Slice C targeting and effect definition", () => {
    const spells = productionSpells.spells.filter((spell) =>
      sliceCIds.includes(spell.id as (typeof sliceCIds)[number]),
    );
    expect(spells.map((spell) => spell.id).sort()).toEqual([...sliceCIds].sort());
    for (const spell of spells) {
      expect(() => spellTargetingSchema.parse(spell.targeting)).not.toThrow();
      expect(() => spellDefinitionSchema.shape.effects.parse(spell.effects)).not.toThrow();
    }
  });

  it("accepts persistent, conditional, action-scoped, and Last Breath primitives", () => {
    expect(
      registerTriggerEffectSchema.parse({
        type: "registerTrigger",
        event: "supportedRingKilledMonster",
        effect: { type: "modifySupportedRingDamage", amount: 2, duration: "battle" },
      }),
    ).toMatchObject({ event: "supportedRingKilledMonster" });
    expect(
      conditionalPierceForActionEffectSchema.parse({
        type: "conditionalPierceForAction",
        target: "selectedEnemyMonster",
        source: "ringAndGemDamage",
      }),
    ).toMatchObject({ type: "conditionalPierceForAction" });
    expect(
      ifTargetSurvivesEffectSchema.parse({
        type: "ifTargetSurvives",
        effect: { type: "modifyMonsterDamage", amount: 2, duration: "battle" },
      }),
    ).toMatchObject({ type: "ifTargetSurvives" });
    expect(
      registerActionScopedTriggerEffectSchema.parse({
        type: "registerActionScopedTrigger",
        event: "selectedMonsterDestroyedDuringCurrentRingAction",
        effect: {
          type: "dealDamageToControllingHero",
          amountFrom: "destroyedMonsterCurrentDamage",
          element: "fire",
        },
      }),
    ).toMatchObject({ type: "registerActionScopedTrigger" });
    expect(
      lastBreathStatusEffectSchema.parse({
        type: "applyStatus",
        status: "lastBreath",
        duration: "endOfCurrentTurn",
        onDestroy: { type: "attackRandomLegalEnemyBeforeRemoval", ignoreCurrentCooldown: true },
      }),
    ).toMatchObject({ status: "lastBreath" });
  });
});

describe("production spell slice B schemas", () => {
  const sliceBIds = [
    "giftPierce",
    "giftRage",
    "giftMultiHit",
    "giftTaunt",
    "giftShield",
    "crystalSkin",
    "quickPulse",
    "shortCircuit",
    "zeroInterval",
    "refresh",
  ] as const;

  it("strictly validates every dormant Slice B targeting and effect definition", () => {
    const spells = productionSpells.spells.filter((spell) =>
      sliceBIds.includes(spell.id as (typeof sliceBIds)[number]),
    );
    expect(spells.map((spell) => spell.id).sort()).toEqual([...sliceBIds].sort());
    for (const spell of spells) {
      expect(() => spellTargetingSchema.parse(spell.targeting)).not.toThrow();
      expect(() => spellDefinitionSchema.shape.effects.parse(spell.effects)).not.toThrow();
    }
  });

  it("accepts the approved skills, Shields, cooldown setters and deterministic random effect", () => {
    expect(
      grantSkillEffectSchema.parse({
        type: "grantSkill",
        skill: "shield",
        duration: "untilMonsterDestroyed",
        activateImmediately: true,
        duplicateBehavior: "noEffect",
      }),
    ).toMatchObject({ skill: "shield" });
    expect(
      grantTemporaryShieldEffectSchema.parse({
        type: "grantTemporaryShield",
        target: "selected",
        expires: "startOfTargetControllerNextTurn",
        duplicateBehavior: "noEffect",
      }),
    ).toMatchObject({ type: "grantTemporaryShield" });
    expect(
      setCurrentCooldownEffectSchema.parse({
        type: "setCurrentCooldown",
        target: "selected",
        valueFrom: "resolvedBaseCooldown",
      }),
    ).toMatchObject({ valueFrom: "resolvedBaseCooldown" });
    expect(
      setCurrentCooldownForAllEffectSchema.parse({
        type: "setCurrentCooldownForAll",
        scope: "alliedMonsters",
        value: 0,
      }),
    ).toMatchObject({ value: 0 });
    expect(
      randomTargetEffectSchema.parse({
        type: "randomTarget",
        scope: "alliedRingsWithCooldownAboveZero",
        onSuccess: { type: "modifyRingCurrentCooldown", amount: -1, minimum: 0 },
      }),
    ).toMatchObject({ scope: "alliedRingsWithCooldownAboveZero" });
  });

  it("rejects ambiguous cooldown setters and unsupported skill grants", () => {
    expect(() =>
      setCurrentCooldownEffectSchema.parse({
        type: "setCurrentCooldown",
        target: "selected",
        value: 0,
        valueFrom: "resolvedBaseCooldown",
      }),
    ).toThrow();
    expect(() =>
      grantSkillEffectSchema.parse({
        type: "grantSkill",
        skill: "haste",
        duration: "untilMonsterDestroyed",
        duplicateBehavior: "noEffect",
      }),
    ).toThrow();
  });
});
