import { z } from "zod";

export const elementSchema = z.enum(["electric", "fire", "ice"]);
export const raritySchema = z.enum(["common", "refined", "rare", "epic"]);

export const skillSchema = z.enum(["haste", "multiHit", "pierce", "rage", "shield", "taunt"]);

export const ringDefinitionSchema = z.object({
  id: z.string().min(1),
  nameKey: z.string().min(1),
  element: elementSchema,
  rarity: raritySchema,
  baseDamage: z.number().int().nonnegative(),
  baseEnergyCost: z.number().int().nonnegative(),
  baseCooldown: z.number().int().positive(),
  baseSpeed: z.number().int().nonnegative(),
  intendedRole: z.string().min(1).optional(),
});

export const gemDefinitionSchema = z.object({
  id: z.string().min(1),
  nameKey: z.string().min(1),
  element: elementSchema,
  rarity: raritySchema,
  baseDamage: z.number().int().nonnegative(),
  baseEnergyPenalty: z.number().nonnegative().multipleOf(0.1),
  baseCooldownPenalty: z.number().nonnegative().multipleOf(0.1),
  baseSpeed: z.number().int().nonnegative().default(0),
  intendedRole: z.string().min(1).optional(),
});

export const monsterDefinitionSchema = z
  .object({
    id: z.string().min(1),
    nameKey: z.string().min(1),
    element: elementSchema,
    rarity: raritySchema,
    baseHealth: z.number().int().positive(),
    baseDamage: z.number().int().nonnegative(),
    baseCooldown: z.number().int().positive(),
    baseSpeed: z.number().int().nonnegative(),
    baseEnergyPenalty: z.number().nonnegative().multipleOf(0.1).default(0),
    baseCooldownPenalty: z.number().nonnegative().multipleOf(0.1).default(0),
    skill: skillSchema.optional(),
    intendedRole: z.string().min(1).optional(),
  })
  .strict();

export const spellAllowedTargetSchema = z.enum([
  "anyCombatant",
  "anyMonster",
  "alliedMonster",
  "enemyMonster",
]);

export const spellTargetingSchema = z.discriminatedUnion("selection", [
  z
    .object({
      selection: z.literal("none"),
      allowedTargets: z.tuple([]),
    })
    .strict(),
  z
    .object({
      selection: z.literal("one"),
      allowedTargets: z.array(spellAllowedTargetSchema).min(1),
    })
    .strict(),
]);

export const dealDamageEffectSchema = z
  .object({
    type: z.literal("dealDamage"),
    amount: z.number().int().positive(),
    element: elementSchema.optional(),
    target: z.enum(["any", "selected"]),
  })
  .strict();

export const burnStatusEffectSchema = z
  .object({
    type: z.literal("applyStatus"),
    status: z.literal("burn"),
    damage: z.number().int().positive(),
    durationOwnerTurns: z.number().int().positive(),
    tickTiming: z.literal("startOfTargetControllerTurn").optional(),
  })
  .strict();

export const controlStatusEffectSchema = z
  .object({
    type: z.literal("applyStatus"),
    status: z.enum(["shock", "freeze"]),
    durationOwnerTurns: z.number().int().positive(),
  })
  .strict();

export const lastBreathStatusEffectSchema = z
  .object({
    type: z.literal("applyStatus"),
    status: z.literal("lastBreath"),
    duration: z.literal("endOfCurrentTurn"),
    onDestroy: z
      .object({
        type: z.literal("attackRandomLegalEnemyBeforeRemoval"),
        ignoreCurrentCooldown: z.literal(true),
      })
      .strict(),
  })
  .strict();

export const applyStatusEffectSchema = z.union([
  burnStatusEffectSchema,
  controlStatusEffectSchema,
  lastBreathStatusEffectSchema,
]);

export const forEachMonsterEffectSchema = z
  .object({
    type: z.literal("forEachMonster"),
    scope: z.literal("allMonsters"),
    effect: applyStatusEffectSchema,
  })
  .strict();

export const dealDamageToAllEffectSchema = z
  .object({
    type: z.literal("dealDamageToAll"),
    scope: z.literal("enemyMonsters"),
    amount: z.number().int().positive().optional(),
    amountFromCapturedStat: z.literal("currentDamage").optional(),
    element: elementSchema,
  })
  .strict()
  .refine(
    (effect) => (effect.amount !== undefined) !== (effect.amountFromCapturedStat !== undefined),
    { message: "Exactly one area-damage amount source is required." },
  );

export const modifyCurrentCooldownEffectSchema = z
  .object({
    type: z.literal("modifyCurrentCooldown"),
    target: z.literal("selected"),
    amount: z.number().int(),
    maximumFrom: z.literal("resolvedBaseCooldown"),
  })
  .strict();

export const removeStatusesEffectSchema = z
  .object({
    type: z.literal("removeStatuses"),
    target: z.literal("selected"),
    scope: z.literal("allTemporaryStatuses"),
    removeSkills: z.literal(false),
  })
  .strict();

export const grantSkillEffectSchema = z
  .object({
    type: z.literal("grantSkill"),
    skill: z.enum(["multiHit", "pierce", "rage", "shield", "taunt"]),
    duration: z.literal("untilMonsterDestroyed"),
    activateImmediately: z.literal(true).optional(),
    duplicateBehavior: z.literal("noEffect"),
  })
  .strict();

export const grantTemporaryShieldEffectSchema = z
  .object({
    type: z.literal("grantTemporaryShield"),
    target: z.literal("selected"),
    expires: z.literal("startOfTargetControllerNextTurn"),
    duplicateBehavior: z.literal("noEffect"),
  })
  .strict();

export const setCurrentCooldownEffectSchema = z
  .object({
    type: z.literal("setCurrentCooldown"),
    target: z.literal("selected"),
    value: z.literal(0).optional(),
    valueFrom: z.literal("resolvedBaseCooldown").optional(),
  })
  .strict()
  .refine((effect) => (effect.value === 0) !== (effect.valueFrom !== undefined), {
    message: "Exactly one cooldown value source is required.",
  });

export const setCurrentCooldownForAllEffectSchema = z
  .object({
    type: z.literal("setCurrentCooldownForAll"),
    scope: z.literal("alliedMonsters"),
    value: z.literal(0),
  })
  .strict();

export const randomTargetEffectSchema = z.union([
  z
    .object({
      type: z.literal("randomTarget"),
      scope: z.literal("alliedRingsWithCooldownAboveZero"),
      onSuccess: z
        .object({
          type: z.literal("modifyRingCurrentCooldown"),
          amount: z.number().int(),
          minimum: z.literal(0),
        })
        .strict(),
    })
    .strict(),
  z
    .object({
      type: z.literal("randomTarget"),
      scope: z.literal("otherAlliedMonsters"),
      onSuccess: z
        .object({
          type: z.literal("modifyMonsterDamage"),
          amountFrom: z.literal("destroyedTargetCurrentDamage"),
          duration: z.literal("battle"),
        })
        .strict(),
    })
    .strict(),
  z
    .object({
      type: z.literal("randomTarget"),
      scope: z.literal("enemyMonsters"),
      onSuccess: z
        .object({ type: z.literal("destroyMonster"), target: z.literal("random") })
        .strict(),
    })
    .strict(),
  z
    .object({
      type: z.literal("randomTarget"),
      scope: z.literal("otherMonstersControlledBySelectedTargetOwner"),
      onSuccess: z
        .object({
          type: z.literal("dealDamage"),
          amount: z.number().int().positive(),
          element: elementSchema,
        })
        .strict(),
    })
    .strict(),
]);

export const destroyMonsterEffectSchema = z
  .object({ type: z.literal("destroyMonster"), target: z.literal("selected") })
  .strict();

export const destroyAllMonstersEffectSchema = z
  .object({ type: z.literal("destroyAllMonsters"), scope: z.literal("allMonsters") })
  .strict();

export const captureStatEffectSchema = z
  .object({
    type: z.literal("captureStat"),
    source: z.literal("selected"),
    stat: z.literal("currentDamage"),
  })
  .strict();

export const copyMonsterEffectSchema = z
  .object({
    type: z.literal("copyMonster"),
    source: z.literal("selected"),
    copyMode: z.literal("currentCombatStats"),
    initialCooldown: z.literal(1),
    copyStatuses: z.literal(false),
  })
  .strict();

export const transformMonsterEffectSchema = z
  .object({
    type: z.literal("transformMonster"),
    target: z.literal("selected"),
    result: z
      .object({
        element: elementSchema,
        damage: z.number().int().nonnegative(),
        maxHealth: z.number().int().positive(),
        currentHealth: z.number().int().positive(),
        baseCooldown: z.number().int().positive(),
        currentCooldown: z.number().int().nonnegative(),
        skill: z.null(),
      })
      .strict(),
  })
  .strict();

export const createTemporaryMonsterCopyEffectSchema = z
  .object({
    type: z.literal("createTemporaryMonsterCopy"),
    source: z.literal("selected"),
    copyDamage: z.literal(true),
    copyElement: z.literal(true),
    maxHealth: z.number().int().positive(),
    skill: z.null(),
    initialCooldown: z.literal(0),
    expires: z.literal("endOfCurrentTurn"),
  })
  .strict();

export const registerTriggerEffectSchema = z
  .object({
    type: z.literal("registerTrigger"),
    event: z.literal("supportedRingKilledMonster"),
    effect: z.union([
      z
        .object({
          type: z.literal("modifySupportedRingDamage"),
          amount: z.number().int(),
          duration: z.literal("battle"),
        })
        .strict(),
      z
        .object({
          type: z.literal("restoreCurrentTurnEnergy"),
          amount: z.number().int().positive(),
          cap: z.literal("currentTurnMaximum"),
        })
        .strict(),
      z
        .object({
          type: z.literal("modifySupportedRingCurrentCooldown"),
          amount: z.number().int(),
          minimum: z.literal(0),
        })
        .strict(),
    ]),
  })
  .strict();

export const conditionalPierceForActionEffectSchema = z
  .object({
    type: z.literal("conditionalPierceForAction"),
    target: z.literal("selectedEnemyMonster"),
    source: z.literal("ringAndGemDamage"),
  })
  .strict();

export const ifTargetSurvivesEffectSchema = z
  .object({
    type: z.literal("ifTargetSurvives"),
    effect: z
      .object({
        type: z.literal("modifyMonsterDamage"),
        amount: z.number().int(),
        duration: z.literal("battle"),
      })
      .strict(),
  })
  .strict();

export const registerActionScopedTriggerEffectSchema = z
  .object({
    type: z.literal("registerActionScopedTrigger"),
    event: z.literal("selectedMonsterDestroyedDuringCurrentRingAction"),
    effect: z
      .object({
        type: z.literal("dealDamageToControllingHero"),
        amountFrom: z.literal("destroyedMonsterCurrentDamage"),
        element: elementSchema,
      })
      .strict(),
  })
  .strict();

export const spellEffectSchema = z.union([
  dealDamageEffectSchema,
  applyStatusEffectSchema,
  forEachMonsterEffectSchema,
  dealDamageToAllEffectSchema,
  modifyCurrentCooldownEffectSchema,
  removeStatusesEffectSchema,
  grantSkillEffectSchema,
  grantTemporaryShieldEffectSchema,
  setCurrentCooldownEffectSchema,
  setCurrentCooldownForAllEffectSchema,
  randomTargetEffectSchema,
  registerTriggerEffectSchema,
  conditionalPierceForActionEffectSchema,
  ifTargetSurvivesEffectSchema,
  registerActionScopedTriggerEffectSchema,
  destroyMonsterEffectSchema,
  destroyAllMonstersEffectSchema,
  captureStatEffectSchema,
  copyMonsterEffectSchema,
  transformMonsterEffectSchema,
  createTemporaryMonsterCopyEffectSchema,
]);

export const spellDefinitionSchema = z
  .object({
    id: z.string().min(1),
    nameKey: z.string().min(1),
    descriptionKey: z.string().min(1),
    element: elementSchema,
    rarity: raritySchema,
    baseSpeed: z.number().int().nonnegative().default(0),
    baseEnergyPenalty: z.number().nonnegative().multipleOf(0.1),
    baseCooldownPenalty: z.number().nonnegative().multipleOf(0.1),
    targeting: spellTargetingSchema.optional(),
    effects: z.array(spellEffectSchema).min(1),
  })
  .strict();

export const materialCraftingFamilySchema = z.enum(["ring", "spell", "gem", "monster"]);
export const materialRealWorldTypeSchema = z.enum([
  "chemicalElement",
  "mineral",
  "mineraloid",
  "gemstone",
  "biomaterial",
  "industrialMaterial",
  "geologicalMaterial",
  "stateOfMatter",
]);

export const materialDefinitionSchema = z
  .object({
    id: z.string().min(1),
    nameKey: z.string().min(1),
    descriptionKey: z.string().min(1),
    rarity: raritySchema,
    craftingFamily: materialCraftingFamilySchema,
    basePrice: z.number().int().positive(),
    realWorldType: materialRealWorldTypeSchema,
    atomicNumber: z.number().int().min(1).max(118).optional(),
    chemicalSymbol: z
      .string()
      .regex(/^[A-Z][a-z]?$/)
      .optional(),
  })
  .strict()
  .superRefine((material, context) => {
    const hasAtomicNumber = material.atomicNumber !== undefined;
    const hasChemicalSymbol = material.chemicalSymbol !== undefined;

    if (material.realWorldType === "chemicalElement") {
      if (!hasAtomicNumber) {
        context.addIssue({
          code: "custom",
          path: ["atomicNumber"],
          message: "Chemical elements require an atomic number.",
        });
      }
      if (!hasChemicalSymbol) {
        context.addIssue({
          code: "custom",
          path: ["chemicalSymbol"],
          message: "Chemical elements require a chemical symbol.",
        });
      }
      return;
    }

    if (hasAtomicNumber || hasChemicalSymbol) {
      context.addIssue({
        code: "custom",
        message: "Only chemical elements can define atomic metadata.",
      });
    }
  });

export const craftableItemTypeSchema = z.enum(["ring", "gem", "monster", "spell"]);

export const recipeIngredientSchema = z
  .object({
    materialId: z.string().min(1),
    quantity: z.number().int().positive(),
  })
  .strict();

export const recipeDefinitionSchema = z
  .object({
    id: z.string().min(1),
    outputType: craftableItemTypeSchema,
    outputDefinitionId: z.string().min(1),
    craftedLevel: z.number().int().min(1).max(50),
    craftedQuality: z.number().int().min(0).max(100),
    ringSocketCount: z.number().int().min(1).max(3).optional(),
    ingredients: z.array(recipeIngredientSchema).min(1).max(3),
  })
  .strict()
  .superRefine((recipe, context) => {
    const totalMaterialQuantity = recipe.ingredients.reduce(
      (total, ingredient) => total + ingredient.quantity,
      0,
    );
    if (totalMaterialQuantity !== 3) {
      context.addIssue({
        code: "custom",
        path: ["ingredients"],
        message: "Recipes require exactly three material units in total.",
      });
    }

    if (recipe.outputType === "ring") {
      if (recipe.ringSocketCount === undefined) {
        context.addIssue({
          code: "custom",
          path: ["ringSocketCount"],
          message: "Ring recipes require a socket count.",
        });
      }
      return;
    }

    if (recipe.ringSocketCount !== undefined) {
      context.addIssue({
        code: "custom",
        path: ["ringSocketCount"],
        message: "Only ring recipes can define a socket count.",
      });
    }
  });

export const campaignRewardSchema = z
  .object({
    credits: z.number().int().nonnegative(),
    heroExperience: z.number().int().nonnegative(),
    materials: z.array(
      z
        .object({
          materialId: z.string().min(1),
          quantity: z.number().int().positive(),
        })
        .strict(),
    ),
  })
  .strict();

export const campaignEnchantmentSchema = z
  .object({
    type: z.enum(["monster", "spell"]),
    definitionId: z.string().min(1),
    experience: z.number().int().nonnegative(),
    quality: z.number().int().min(0).max(100),
  })
  .strict();

export const campaignGemSchema = z
  .object({
    definitionId: z.string().min(1),
    experience: z.number().int().nonnegative(),
    quality: z.number().int().min(0).max(100),
    enchantment: campaignEnchantmentSchema.optional(),
  })
  .strict();

export const campaignRingSchema = z
  .object({
    definitionId: z.string().min(1),
    experience: z.number().int().nonnegative(),
    quality: z.number().int().min(0).max(100),
    socketCount: z.number().int().min(1).max(3),
    gems: z.array(campaignGemSchema).max(3),
  })
  .strict()
  .superRefine((ring, context) => {
    if (ring.gems.length > ring.socketCount) {
      context.addIssue({
        code: "custom",
        path: ["gems"],
        message: "Campaign rings cannot contain more gems than sockets.",
      });
    }
  });

export const campaignOpponentSchema = z
  .object({
    id: z.string().min(1),
    nameKey: z.string().min(1),
    descriptionKey: z.string().min(1),
    order: z.number().int().positive(),
    recommendedLevel: z.number().int().nonnegative(),
    element: elementSchema,
    experience: z.number().int().nonnegative(),
    loadoutVisibility: z.enum(["hidden", "summary", "full"]),
    prerequisiteOpponentId: z.string().min(1).optional(),
    repeatable: z.boolean(),
    rings: z.array(campaignRingSchema).min(1).max(10),
    firstClearReward: campaignRewardSchema,
    repeatVictoryReward: campaignRewardSchema,
  })
  .strict();

export const playerFixtureSchema = z
  .object({
    id: z.string().min(1),
    username: z.string().min(1),
    experience: z.number().int().nonnegative(),
    equippedRingInstanceIds: z.array(z.string().min(1)),
  })
  .strict();

export const gemEnchantmentSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("monster"),
    monsterInstanceId: z.string().min(1),
  }),
  z.object({
    type: z.literal("spell"),
    spellInstanceId: z.string().min(1),
  }),
]);

export const ringInstanceSchema = z
  .object({
    id: z.string().min(1),
    definitionId: z.string().min(1),
    ownerId: z.string().min(1),
    experience: z.number().int().nonnegative(),
    quality: z.number().int().min(0).max(100),
    socketCount: z.number().int().min(1).max(3),
    socketedGemInstanceIds: z.array(z.string().min(1)).max(3),
    equipped: z.boolean(),
  })
  .strict();

export const gemInstanceSchema = z
  .object({
    id: z.string().min(1),
    definitionId: z.string().min(1),
    ownerId: z.string().min(1),
    experience: z.number().int().nonnegative(),
    quality: z.number().int().min(0).max(100),
    enchantment: gemEnchantmentSchema.optional(),
  })
  .strict();

export const monsterInstanceSchema = z
  .object({
    id: z.string().min(1),
    definitionId: z.string().min(1),
    ownerId: z.string().min(1),
    experience: z.number().int().nonnegative(),
    quality: z.number().int().min(0).max(100),
  })
  .strict();

export const spellInstanceSchema = z
  .object({
    id: z.string().min(1),
    definitionId: z.string().min(1),
    ownerId: z.string().min(1),
    experience: z.number().int().nonnegative(),
    quality: z.number().int().min(0).max(100),
  })
  .strict();

export const inventoryFixtureSchema = z.object({
  rings: z.array(ringInstanceSchema),
  gems: z.array(gemInstanceSchema),
  monsters: z.array(monsterInstanceSchema),
  spells: z.array(spellInstanceSchema),
});

export const battleSetupFixtureSchema = z.object({
  id: z.string().min(1),
  seed: z.string().min(1),
  playerIds: z.tuple([z.string().min(1), z.string().min(1)]),
  initialMonsters: z
    .array(
      z.object({
        playerId: z.string().min(1),
        monsterId: z.string().min(1),
      }),
    )
    .max(6)
    .optional(),
});

export const battleActionFixtureSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("chooseElement"),
    playerId: z.string().min(1),
    element: elementSchema,
  }),
  z.object({
    type: z.literal("useRing"),
    playerId: z.string().min(1),
    ringInstanceId: z.string().min(1),
    targetId: z.string().min(1),
    enchantmentTargets: z.record(z.string().min(1), z.string().min(1)).optional(),
  }),
  z.object({
    type: z.literal("useMonster"),
    playerId: z.string().min(1),
    monsterInstanceId: z.string().min(1),
    targetId: z.string().min(1),
  }),
  z.object({
    type: z.literal("endTurn"),
    playerId: z.string().min(1),
  }),
  z.object({
    type: z.literal("concede"),
    playerId: z.string().min(1),
  }),
]);

export const scenarioFixtureSchema = z.object({
  id: z.string().min(1),
  descriptionKey: z.string().min(1),
  battleSetupId: z.string().min(1).optional(),
  actions: z.array(battleActionFixtureSchema),
  expect: z.object({
    eventTypes: z.array(z.string().min(1)).optional(),
    result: z.string().nullable().optional(),
    health: z.record(z.string().min(1), z.number().int().nonnegative()).optional(),
  }),
});

export const localeSchema = z.record(z.string().min(1), z.string());

export type RingDefinition = z.infer<typeof ringDefinitionSchema>;
export type GemDefinition = z.infer<typeof gemDefinitionSchema>;
export type MonsterDefinition = z.infer<typeof monsterDefinitionSchema>;
export type SpellDefinition = z.infer<typeof spellDefinitionSchema>;
export type MaterialDefinition = z.infer<typeof materialDefinitionSchema>;
export type CraftableItemType = z.infer<typeof craftableItemTypeSchema>;
export type RecipeIngredient = z.infer<typeof recipeIngredientSchema>;
export type RecipeDefinition = z.infer<typeof recipeDefinitionSchema>;
export type CampaignReward = z.infer<typeof campaignRewardSchema>;
export type CampaignOpponent = z.infer<typeof campaignOpponentSchema>;
export type PlayerFixture = z.infer<typeof playerFixtureSchema>;
export type InventoryFixture = z.infer<typeof inventoryFixtureSchema>;
export type RingInstance = z.infer<typeof ringInstanceSchema>;
export type GemInstance = z.infer<typeof gemInstanceSchema>;
export type MonsterInstance = z.infer<typeof monsterInstanceSchema>;
export type SpellInstance = z.infer<typeof spellInstanceSchema>;
export type BattleSetupFixture = z.infer<typeof battleSetupFixtureSchema>;
export type ScenarioFixture = z.infer<typeof scenarioFixtureSchema>;
