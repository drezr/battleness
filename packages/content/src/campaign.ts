import type { BattlePlayer, BattleSetup } from "@battleness/engine";
import { createBattlePlayerFromInventory } from "./battleSetup";
import type {
  CampaignOpponent,
  GemDefinition,
  MaterialDefinition,
  MonsterDefinition,
  RingDefinition,
  SpellDefinition,
  InventoryFixture,
  PlayerFixture,
} from "./schemas";

export type CampaignReferenceData = {
  opponents: readonly CampaignOpponent[];
  rings: readonly RingDefinition[];
  gems: readonly GemDefinition[];
  monsters: readonly MonsterDefinition[];
  spells: readonly SpellDefinition[];
  materials: readonly MaterialDefinition[];
  locales: Readonly<Record<string, Readonly<Record<string, string>>>>;
};

export class CampaignContentError extends Error {
  constructor(public readonly issues: readonly string[]) {
    super(`Campaign content validation failed:\n- ${issues.join("\n- ")}`);
    this.name = "CampaignContentError";
  }
}

export function validateCampaignReferences(data: CampaignReferenceData): void {
  const issues: string[] = [];
  const opponents = indexUnique(data.opponents, "Campaign opponent", issues);
  const rings = indexUnique(data.rings, "Ring definition", issues);
  const gems = indexUnique(data.gems, "Gem definition", issues);
  const monsters = indexUnique(data.monsters, "Monster definition", issues);
  const spells = indexUnique(data.spells, "Spell definition", issues);
  const materials = indexUnique(data.materials, "Material definition", issues);
  const ordered = [...data.opponents].sort((left, right) => left.order - right.order);
  const seenOrders = new Set<number>();

  for (const [index, opponent] of ordered.entries()) {
    if (seenOrders.has(opponent.order)) {
      issues.push(`Campaign order ${opponent.order} is assigned more than once.`);
    }
    seenOrders.add(opponent.order);

    const expectedOrder = index + 1;
    if (opponent.order !== expectedOrder) {
      issues.push(
        `Campaign opponent "${opponent.id}" has order ${opponent.order}; expected ${expectedOrder}.`,
      );
    }

    const expectedPrerequisite = index === 0 ? undefined : ordered[index - 1]?.id;
    if (opponent.prerequisiteOpponentId !== expectedPrerequisite) {
      issues.push(
        `Campaign opponent "${opponent.id}" must reference ${expectedPrerequisite ? `"${expectedPrerequisite}"` : "no prerequisite"}.`,
      );
    }
    if (opponent.prerequisiteOpponentId && !opponents.has(opponent.prerequisiteOpponentId)) {
      issues.push(
        `Campaign opponent "${opponent.id}" references unknown prerequisite "${opponent.prerequisiteOpponentId}".`,
      );
    }

    for (const ring of opponent.rings) {
      if (!rings.has(ring.definitionId)) {
        issues.push(
          `Campaign opponent "${opponent.id}" references unknown ring "${ring.definitionId}".`,
        );
      }
      for (const gem of ring.gems) {
        if (!gems.has(gem.definitionId)) {
          issues.push(
            `Campaign opponent "${opponent.id}" references unknown gem "${gem.definitionId}".`,
          );
        }
        const enchantment = gem.enchantment;
        if (!enchantment) {
          continue;
        }
        const enchantmentDefinitions = enchantment.type === "monster" ? monsters : spells;
        if (!enchantmentDefinitions.has(enchantment.definitionId)) {
          issues.push(
            `Campaign opponent "${opponent.id}" references unknown ${enchantment.type} "${enchantment.definitionId}".`,
          );
        }
      }
    }

    validateReward(opponent.id, "first-clear", opponent.firstClearReward.materials);
    validateReward(opponent.id, "repeat-victory", opponent.repeatVictoryReward.materials);
  }

  for (const [localeId, locale] of Object.entries(data.locales)) {
    for (const opponent of data.opponents) {
      for (const key of [opponent.nameKey, opponent.descriptionKey]) {
        if (!(key in locale)) {
          issues.push(`Locale "${localeId}" is missing campaign key "${key}".`);
        }
      }
    }
  }

  if (issues.length > 0) {
    throw new CampaignContentError(issues);
  }

  function validateReward(
    opponentId: string,
    rewardName: string,
    rewardMaterials: readonly { materialId: string; quantity: number }[],
  ): void {
    const seenMaterialIds = new Set<string>();
    for (const rewardMaterial of rewardMaterials) {
      if (seenMaterialIds.has(rewardMaterial.materialId)) {
        issues.push(
          `Campaign opponent "${opponentId}" ${rewardName} reward repeats material "${rewardMaterial.materialId}".`,
        );
      }
      seenMaterialIds.add(rewardMaterial.materialId);
      if (!materials.has(rewardMaterial.materialId)) {
        issues.push(
          `Campaign opponent "${opponentId}" ${rewardName} reward references unknown material "${rewardMaterial.materialId}".`,
        );
      }
    }
  }
}

export function createCampaignOpponentBattlePlayer(input: {
  opponent: CampaignOpponent;
  username: string;
  resolvedDefinitions: BattleSetup["definitions"];
}): BattlePlayer {
  const ownerId = `campaign.${input.opponent.id}`;
  const inventory: InventoryFixture = { rings: [], gems: [], monsters: [], spells: [] };
  const equippedRingInstanceIds: string[] = [];

  for (const [ringIndex, ring] of input.opponent.rings.entries()) {
    const ringNumber = ringIndex + 1;
    const ringId = `${ownerId}.ring.${ring.definitionId}.${ringNumber}`;
    const socketedGemInstanceIds: string[] = [];
    equippedRingInstanceIds.push(ringId);

    for (const [gemIndex, gem] of ring.gems.entries()) {
      const gemNumber = gemIndex + 1;
      const gemId = `${ownerId}.gem.${gem.definitionId}.${ringNumber}.${gemNumber}`;
      socketedGemInstanceIds.push(gemId);

      let enchantment: InventoryFixture["gems"][number]["enchantment"];
      if (gem.enchantment) {
        const targetId = `${ownerId}.${gem.enchantment.type}.${gem.enchantment.definitionId}.${ringNumber}.${gemNumber}`;
        if (gem.enchantment.type === "monster") {
          inventory.monsters.push({
            id: targetId,
            definitionId: gem.enchantment.definitionId,
            ownerId,
            experience: gem.enchantment.experience,
            quality: gem.enchantment.quality,
          });
          enchantment = { type: "monster", monsterInstanceId: targetId };
        } else {
          inventory.spells.push({
            id: targetId,
            definitionId: gem.enchantment.definitionId,
            ownerId,
            experience: gem.enchantment.experience,
            quality: gem.enchantment.quality,
          });
          enchantment = { type: "spell", spellInstanceId: targetId };
        }
      }

      inventory.gems.push({
        id: gemId,
        definitionId: gem.definitionId,
        ownerId,
        experience: gem.experience,
        quality: gem.quality,
        ...(enchantment ? { enchantment } : {}),
      });
    }

    inventory.rings.push({
      id: ringId,
      definitionId: ring.definitionId,
      ownerId,
      experience: ring.experience,
      quality: ring.quality,
      socketCount: ring.socketCount,
      socketedGemInstanceIds,
      equipped: true,
    });
  }

  const player: PlayerFixture = {
    id: ownerId,
    username: input.username,
    experience: input.opponent.experience,
    equippedRingInstanceIds,
  };
  return createBattlePlayerFromInventory(player, inventory, input.resolvedDefinitions);
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
