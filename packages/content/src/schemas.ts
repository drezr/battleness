import { z } from "zod";

export const elementSchema = z.enum(["electric", "fire", "ice"]);
export const raritySchema = z.enum(["normal", "magic", "rare", "legendary"]);

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

export const materialDefinitionSchema = z.object({
  id: z.string().min(1),
  nameKey: z.string().min(1),
  rarity: raritySchema,
});

export const playerFixtureSchema = z.object({
  id: z.string().min(1),
  username: z.string().min(1),
  level: z.number().int().nonnegative(),
  experience: z.number().int().nonnegative(),
  equippedRingInstanceIds: z.array(z.string().min(1)),
});

export const gemEnchantmentSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("monster"),
    monsterId: z.string().min(1),
  }),
  z.object({
    type: z.literal("spell"),
    spellId: z.string().min(1),
  }),
]);

export const ringInstanceSchema = z.object({
  id: z.string().min(1),
  definitionId: z.string().min(1),
  ownerId: z.string().min(1),
  level: z.number().int().nonnegative(),
  quality: z.number().int().min(0).max(100),
  socketCount: z.number().int().min(1).max(3),
  socketedGemInstanceIds: z.array(z.string().min(1)).max(3),
  equipped: z.boolean(),
});

export const gemInstanceSchema = z.object({
  id: z.string().min(1),
  definitionId: z.string().min(1),
  ownerId: z.string().min(1),
  level: z.number().int().nonnegative(),
  quality: z.number().int().min(0).max(100),
  enchantment: gemEnchantmentSchema.optional(),
});

export const inventoryFixtureSchema = z.object({
  rings: z.array(ringInstanceSchema),
  gems: z.array(gemInstanceSchema),
  monsters: z.array(z.unknown()),
  spells: z.array(z.unknown()),
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
export type PlayerFixture = z.infer<typeof playerFixtureSchema>;
export type InventoryFixture = z.infer<typeof inventoryFixtureSchema>;
export type RingInstance = z.infer<typeof ringInstanceSchema>;
export type GemInstance = z.infer<typeof gemInstanceSchema>;
export type BattleSetupFixture = z.infer<typeof battleSetupFixtureSchema>;
export type ScenarioFixture = z.infer<typeof scenarioFixtureSchema>;
