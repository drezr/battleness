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
});

export const gemDefinitionSchema = z.object({
  id: z.string().min(1),
  nameKey: z.string().min(1),
  element: elementSchema,
  rarity: raritySchema,
  baseDamage: z.number().int().nonnegative(),
  baseEnergyPenalty: z.number().int().nonnegative(),
  baseCooldownPenalty: z.number().int().nonnegative(),
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
    skill: skillSchema.optional(),
  })
  .strict();

export const dealDamageEffectSchema = z.object({
  type: z.literal("dealDamage"),
  amount: z.number().int().positive(),
  target: z.literal("any"),
});

export const spellEffectSchema = dealDamageEffectSchema;

export const spellDefinitionSchema = z.object({
  id: z.string().min(1),
  nameKey: z.string().min(1),
  element: elementSchema,
  rarity: raritySchema,
  baseEnergyPenalty: z.number().int().nonnegative(),
  baseCooldownPenalty: z.number().int().nonnegative(),
  effects: z.array(spellEffectSchema).min(1),
});

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
    ingredients: z.tuple([recipeIngredientSchema, recipeIngredientSchema, recipeIngredientSchema]),
  })
  .strict()
  .superRefine((recipe, context) => {
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
