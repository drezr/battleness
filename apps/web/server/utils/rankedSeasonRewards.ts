import { createHash } from "node:crypto";
import { definitions, type MaterialDefinition } from "@battleness/content";
import { resolveRankedStanding, type RankedTier } from "./rankedRating";

type RewardMaterialRarity = MaterialDefinition["rarity"];

export type RankedSeasonRewardBundle = {
  tier: RankedTier;
  peakRating: number;
  credits: number;
  materials: { materialId: string; quantity: number }[];
  badgeCosmeticId: string;
  titleCosmeticId: string;
};

const creditsByTier: Readonly<Record<RankedTier, number>> = Object.freeze({
  bronze: 500,
  silver: 750,
  gold: 1_000,
  platinum: 1_500,
  diamond: 2_000,
  master: 3_000,
});

const materialRaritiesByTier = {
  bronze: ["common", "common", "common"],
  silver: ["common", "common", "refined"],
  gold: ["common", "refined", "refined"],
  platinum: ["refined", "refined", "rare"],
  diamond: ["refined", "rare", "rare"],
  master: ["refined", "rare", "epic"],
} as const satisfies Readonly<Record<RankedTier, readonly RewardMaterialRarity[]>>;

export function createRankedSeasonRewardBundle(
  seasonId: string,
  playerId: string,
  peakRating: number,
): RankedSeasonRewardBundle {
  if (!seasonId.trim() || !playerId.trim() || !Number.isFinite(peakRating)) {
    throw new Error("Ranked season reward inputs must be valid.");
  }
  const standing = resolveRankedStanding(peakRating, 5);
  if (!standing) throw new Error("Ranked season rewards require completed placements.");

  const tier = standing.tier;
  const selectedMaterialIds = new Set<string>();
  const materials = materialRaritiesByTier[tier].map((rarity, index) => {
    const candidates = definitions.materials
      .filter((material) => material.rarity === rarity && !selectedMaterialIds.has(material.id))
      .sort((left, right) => left.id.localeCompare(right.id));
    if (candidates.length === 0) {
      throw new Error(`No unused ranked reward material exists for rarity "${rarity}".`);
    }
    const selected =
      candidates[
        deterministicIndex(`${seasonId}:${playerId}:${rarity}:${index}`, candidates.length)
      ]!;
    selectedMaterialIds.add(selected.id);
    return { materialId: selected.id, quantity: 1 };
  });

  return {
    tier,
    peakRating,
    credits: creditsByTier[tier],
    materials,
    badgeCosmeticId: `ranked.${seasonId}.${tier}.badge`,
    titleCosmeticId: `ranked.${seasonId}.${tier}.title`,
  };
}

export function rankedSeasonRewardGrantId(seasonId: string, playerId: string): string {
  return `rankedReward_${createHash("sha256").update(`${seasonId}:${playerId}`).digest("hex").slice(0, 32)}`;
}

function deterministicIndex(seed: string, length: number): number {
  const digest = createHash("sha256").update(seed).digest();
  return digest.readUInt32BE(0) % length;
}
