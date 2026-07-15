import { describe, expect, it } from "vitest";
import {
  applyRankedInactivityDecay,
  initialRankedRating,
  rankedCompetitiveConfig,
  rankedGlicko2Config,
  rankedMatchmakingRange,
  rankedQueuePenaltyMinutes,
  resolveRankedStanding,
  softResetGlicko2Rating,
  updateGlicko2Rating,
  type Glicko2Result,
} from "./rankedRating";

describe("Glicko-2 ranked rating", () => {
  it("matches the canonical Glicko-2 example", () => {
    const updated = updateGlicko2Rating({ rating: 1_500, deviation: 200, volatility: 0.06 }, [
      { opponent: { rating: 1_400, deviation: 30, volatility: 0.06 }, score: 1 },
      { opponent: { rating: 1_550, deviation: 100, volatility: 0.06 }, score: 0 },
      { opponent: { rating: 1_700, deviation: 300, volatility: 0.06 }, score: 0 },
    ]);

    expect(updated.rating).toBeCloseTo(1_464.06, 1);
    expect(updated.deviation).toBeCloseTo(151.52, 2);
    expect(updated.volatility).toBeCloseTo(0.059996, 6);
  });

  it("is independent from result ordering", () => {
    const current = { rating: 1_620, deviation: 110, volatility: 0.058 };
    const results: Glicko2Result[] = [
      { opponent: { rating: 1_500, deviation: 90, volatility: 0.06 }, score: 1 },
      { opponent: { rating: 1_710, deviation: 75, volatility: 0.055 }, score: 0.5 },
      { opponent: { rating: 1_800, deviation: 130, volatility: 0.062 }, score: 0 },
    ];

    expect(updateGlicko2Rating(current, results)).toEqual(
      updateGlicko2Rating(current, [...results].reverse()),
    );
  });

  it("increases deviation without changing rating during an inactive period", () => {
    const current = { rating: 1_575, deviation: 80, volatility: 0.06 };
    const updated = updateGlicko2Rating(current, []);

    expect(updated.rating).toBe(current.rating);
    expect(updated.deviation).toBeGreaterThan(current.deviation);
    expect(updated.deviation).toBeLessThanOrEqual(rankedGlicko2Config.maximumDeviation);
    expect(updated.volatility).toBe(current.volatility);
  });

  it("exposes the confirmed initial ranked values", () => {
    expect(initialRankedRating).toEqual({ rating: 1_500, deviation: 350, volatility: 0.06 });
    expect(rankedGlicko2Config).toMatchObject({
      volatilityConstraint: 0.5,
      placementMatchCount: 5,
    });
  });

  it("rejects invalid ratings and scores", () => {
    expect(() =>
      updateGlicko2Rating({ rating: 1_500, deviation: 0, volatility: 0.06 }, []),
    ).toThrow("deviation");
    expect(() =>
      updateGlicko2Rating(initialRankedRating, [
        {
          opponent: initialRankedRating,
          score: 0.25 as 0,
        },
      ]),
    ).toThrow("score");
  });

  it("resolves placements and every visible division boundary", () => {
    expect(resolveRankedStanding(2_500, 4)).toBeNull();
    expect(resolveRankedStanding(999.99, 5)).toMatchObject({ tier: "bronze", division: 3 });
    expect(resolveRankedStanding(1_000, 5)).toMatchObject({ tier: "bronze", division: 2 });
    expect(resolveRankedStanding(1_500, 5)).toMatchObject({ tier: "gold", division: 3 });
    expect(resolveRankedStanding(2_100, 5)).toMatchObject({ tier: "diamond", division: 3 });
    expect(resolveRankedStanding(2_399.99, 5)).toMatchObject({ tier: "diamond", division: 1 });
    expect(resolveRankedStanding(2_400, 5)).toMatchObject({ tier: "master", division: null });
  });

  it("expands matchmaking ranges every fifteen seconds up to their caps", () => {
    expect(rankedMatchmakingRange(0)).toEqual({ rating: 100, heroLevel: 2 });
    expect(rankedMatchmakingRange(14.99)).toEqual({ rating: 100, heroLevel: 2 });
    expect(rankedMatchmakingRange(15)).toEqual({ rating: 200, heroLevel: 4 });
    expect(rankedMatchmakingRange(60)).toEqual({ rating: 500, heroLevel: 10 });
    expect(rankedMatchmakingRange(600)).toEqual({ rating: 500, heroLevel: 10 });
  });

  it("applies capped queue penalties", () => {
    expect([1, 2, 3, 4, 10].map(rankedQueuePenaltyMinutes)).toEqual([1, 5, 15, 30, 30]);
    expect(rankedCompetitiveConfig.queuePenaltyResetHours).toBe(24);
  });

  it("soft-resets toward the center and applies floored inactivity decay", () => {
    expect(softResetGlicko2Rating({ rating: 2_300, deviation: 80, volatility: 0.06 })).toEqual({
      rating: 2_100,
      deviation: 200,
      volatility: 0.06,
    });
    expect(
      applyRankedInactivityDecay({ rating: 2_125, deviation: 90, volatility: 0.06 }, 2),
    ).toMatchObject({ rating: 2_075 });
    expect(
      applyRankedInactivityDecay({ rating: 2_025, deviation: 90, volatility: 0.06 }, 10),
    ).toMatchObject({ rating: 2_000 });
    expect(
      applyRankedInactivityDecay({ rating: 1_975, deviation: 90, volatility: 0.06 }, 1),
    ).toMatchObject({ rating: 1_975 });
  });
});
