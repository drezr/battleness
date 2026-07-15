import { definitions } from "@battleness/content";
import { describe, expect, it } from "vitest";
import { createRankedSeasonRewardBundle, rankedSeasonRewardGrantId } from "./rankedSeasonRewards";

const expected = [
  { rating: 900, tier: "bronze", credits: 500, rarities: ["common", "common", "common"] },
  { rating: 1_200, tier: "silver", credits: 750, rarities: ["common", "common", "refined"] },
  { rating: 1_500, tier: "gold", credits: 1_000, rarities: ["common", "refined", "refined"] },
  {
    rating: 1_800,
    tier: "platinum",
    credits: 1_500,
    rarities: ["refined", "refined", "rare"],
  },
  { rating: 2_100, tier: "diamond", credits: 2_000, rarities: ["refined", "rare", "rare"] },
  { rating: 2_400, tier: "master", credits: 3_000, rarities: ["refined", "rare", "epic"] },
] as const;

describe("ranked season rewards", () => {
  it.each(expected)("builds the $tier reward bundle", ({ rating, tier, credits, rarities }) => {
    const bundle = createRankedSeasonRewardBundle("seasonOne", "playerOne", rating);
    const materialById = new Map(definitions.materials.map((material) => [material.id, material]));

    expect(bundle).toMatchObject({ tier, credits, peakRating: rating });
    expect(bundle.materials).toHaveLength(3);
    expect(new Set(bundle.materials.map((material) => material.materialId)).size).toBe(3);
    expect(
      bundle.materials.map((material) => materialById.get(material.materialId)?.rarity),
    ).toEqual(rarities);
    expect(bundle.badgeCosmeticId).toBe(`ranked.seasonOne.${tier}.badge`);
    expect(bundle.titleCosmeticId).toBe(`ranked.seasonOne.${tier}.title`);
  });

  it("is deterministic for one player and season", () => {
    expect(createRankedSeasonRewardBundle("seasonOne", "playerOne", 2_400)).toEqual(
      createRankedSeasonRewardBundle("seasonOne", "playerOne", 2_400),
    );
    expect(rankedSeasonRewardGrantId("seasonOne", "playerOne")).toBe(
      rankedSeasonRewardGrantId("seasonOne", "playerOne"),
    );
    expect(rankedSeasonRewardGrantId("seasonOne", "playerOne")).not.toBe(
      rankedSeasonRewardGrantId("seasonOne", "playerTwo"),
    );
  });
});
