import type { BattleSetup } from "@battleness/engine";
import { z } from "zod";
import { createBattleSetup } from "./battleSetup";
import { experienceForLevel, MAX_LEVEL, MAX_QUALITY } from "./progression";
import type { BattleSetupFixture, InventoryFixture, PlayerFixture } from "./schemas";

export type BattleLabEnchantmentConfig = {
  type: "monster" | "spell";
  definitionId: string;
  level: number;
  quality: number;
};

export type BattleLabGemConfig = {
  definitionId: string;
  level: number;
  quality: number;
  enchantment?: BattleLabEnchantmentConfig;
};

export type BattleLabRingConfig = {
  definitionId: string;
  level: number;
  quality: number;
  socketCount?: number;
  gems: BattleLabGemConfig[];
};

export type BattleLabPlayerConfig = {
  id: string;
  username: string;
  level: number;
  rings: BattleLabRingConfig[];
};

export type BattleLabConfig = {
  id: string;
  seed: string;
  players: [BattleLabPlayerConfig, BattleLabPlayerConfig];
};

const battleLabEnchantmentConfigSchema = z
  .object({
    type: z.enum(["monster", "spell"]),
    definitionId: z.string().min(1),
    level: z.number().int().min(1).max(MAX_LEVEL),
    quality: z.number().int().min(0).max(MAX_QUALITY),
  })
  .strict();

const battleLabGemConfigSchema = z
  .object({
    definitionId: z.string().min(1),
    level: z.number().int().min(1).max(MAX_LEVEL),
    quality: z.number().int().min(0).max(MAX_QUALITY),
    enchantment: battleLabEnchantmentConfigSchema.optional(),
  })
  .strict();

const battleLabRingConfigSchema = z
  .object({
    definitionId: z.string().min(1),
    level: z.number().int().min(1).max(MAX_LEVEL),
    quality: z.number().int().min(0).max(MAX_QUALITY),
    socketCount: z.number().int().min(1).max(3).optional(),
    gems: z.array(battleLabGemConfigSchema).max(3),
  })
  .strict();

const battleLabPlayerConfigSchema = z
  .object({
    id: z.string().min(1),
    username: z.string().min(1),
    level: z.number().int().min(1).max(MAX_LEVEL),
    rings: z.array(battleLabRingConfigSchema).min(1).max(10),
  })
  .strict();

export const battleLabConfigSchema = z
  .object({
    id: z.string().min(1),
    seed: z.string().min(1),
    players: z.tuple([battleLabPlayerConfigSchema, battleLabPlayerConfigSchema]),
  })
  .strict();

export function parseBattleLabConfigJson(text: string): BattleLabConfig {
  let value: unknown;
  try {
    value = JSON.parse(text);
  } catch {
    throw new Error("Battle Lab JSON is not valid JSON.");
  }

  const config = battleLabConfigSchema.parse(value);
  validateBattleLabConfig(config);
  createBattleSetupFromLab(config);
  return config;
}

export function serializeBattleLabConfig(config: BattleLabConfig): string {
  validateBattleLabConfig(config);
  return JSON.stringify(config, null, 2);
}

export function createBattleSetupFromLab(config: BattleLabConfig): BattleSetup {
  validateBattleLabConfig(config);

  const players: [PlayerFixture, PlayerFixture] = config.players.map((player) => ({
    id: player.id,
    username: player.username,
    experience: experienceForLevel(player.level),
    equippedRingInstanceIds: player.rings.map(
      (_, ringIndex) => `${player.id}.lab.ring.${ringIndex + 1}`,
    ),
  })) as [PlayerFixture, PlayerFixture];
  const inventory: InventoryFixture = {
    rings: [],
    gems: [],
    monsters: [],
    spells: [],
  };

  for (const player of config.players) {
    player.rings.forEach((ring, ringIndex) => {
      const ringId = `${player.id}.lab.ring.${ringIndex + 1}`;
      const gemIds = ring.gems.map(
        (_, gemIndex) => `${player.id}.lab.ring.${ringIndex + 1}.gem.${gemIndex + 1}`,
      );

      inventory.rings.push({
        id: ringId,
        definitionId: ring.definitionId,
        ownerId: player.id,
        experience: experienceForLevel(ring.level),
        quality: ring.quality,
        socketCount: ring.socketCount ?? 3,
        socketedGemInstanceIds: gemIds,
        equipped: true,
      });

      ring.gems.forEach((gem, gemIndex) => {
        const gemId = gemIds[gemIndex]!;
        const enchantmentId = `${gemId}.${gem.enchantment?.type ?? "none"}`;

        if (gem.enchantment?.type === "monster") {
          inventory.monsters.push({
            id: enchantmentId,
            definitionId: gem.enchantment.definitionId,
            ownerId: player.id,
            experience: experienceForLevel(gem.enchantment.level),
            quality: gem.enchantment.quality,
          });
        }

        if (gem.enchantment?.type === "spell") {
          inventory.spells.push({
            id: enchantmentId,
            definitionId: gem.enchantment.definitionId,
            ownerId: player.id,
            experience: experienceForLevel(gem.enchantment.level),
            quality: gem.enchantment.quality,
          });
        }

        inventory.gems.push({
          id: gemId,
          definitionId: gem.definitionId,
          ownerId: player.id,
          experience: experienceForLevel(gem.level),
          quality: gem.quality,
          enchantment:
            gem.enchantment?.type === "monster"
              ? { type: "monster", monsterInstanceId: enchantmentId }
              : gem.enchantment?.type === "spell"
                ? { type: "spell", spellInstanceId: enchantmentId }
                : undefined,
        });
      });
    });
  }

  const setup: BattleSetupFixture = {
    id: config.id,
    seed: config.seed,
    playerIds: [players[0].id, players[1].id],
  };

  return createBattleSetup(setup, players, inventory);
}

export function validateBattleLabConfig(config: BattleLabConfig): void {
  if (!config.id.trim()) {
    throw new Error("Battle Lab ID is required.");
  }
  if (!config.seed.trim()) {
    throw new Error("Battle Lab seed is required.");
  }
  if (config.players[0].id === config.players[1].id) {
    throw new Error("Battle Lab players must have different IDs.");
  }

  for (const player of config.players) {
    if (!player.id.trim() || !player.username.trim()) {
      throw new Error("Each Battle Lab player requires an ID and username.");
    }
    assertLevel(player.level, `${player.username} level`);
    if (player.rings.length < 1 || player.rings.length > 10) {
      throw new Error(`${player.username} must equip between 1 and 10 rings.`);
    }

    for (const ring of player.rings) {
      assertLevel(ring.level, `${ring.definitionId} level`);
      assertQuality(ring.quality, `${ring.definitionId} quality`);
      const socketCount = ring.socketCount ?? 3;
      if (ring.gems.length > socketCount) {
        throw new Error(`${ring.definitionId} cannot socket more than ${socketCount} gems.`);
      }

      for (const gem of ring.gems) {
        assertLevel(gem.level, `${gem.definitionId} level`);
        assertQuality(gem.quality, `${gem.definitionId} quality`);
        if (gem.enchantment) {
          assertLevel(gem.enchantment.level, `${gem.enchantment.definitionId} level`);
          assertQuality(gem.enchantment.quality, `${gem.enchantment.definitionId} quality`);
        }
      }
    }
  }
}

function assertLevel(level: number, label: string): void {
  if (!Number.isInteger(level) || level < 1 || level > MAX_LEVEL) {
    throw new Error(`${label} must be an integer between 1 and ${MAX_LEVEL}.`);
  }
}

function assertQuality(quality: number, label: string): void {
  if (!Number.isInteger(quality) || quality < 0 || quality > MAX_QUALITY) {
    throw new Error(`${label} must be an integer between 0 and ${MAX_QUALITY}.`);
  }
}
