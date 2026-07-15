export type Glicko2Rating = {
  rating: number;
  deviation: number;
  volatility: number;
};

export type Glicko2Result = {
  opponent: Glicko2Rating;
  score: 0 | 0.5 | 1;
};

export type Glicko2Config = {
  centralRating: number;
  ratingScale: number;
  initialDeviation: number;
  initialVolatility: number;
  volatilityConstraint: number;
  convergenceTolerance: number;
  maximumDeviation: number;
  placementMatchCount: number;
};

export type RankedTier = "bronze" | "silver" | "gold" | "platinum" | "diamond" | "master";

export type RankedStanding = {
  tier: RankedTier;
  division: 1 | 2 | 3 | null;
  minimumRating: number;
};

export type RankedCompetitiveConfig = {
  queueDurationMinutes: number;
  seasonDurationDays: number;
  softResetRetention: number;
  softResetMinimumDeviation: number;
  inactivityGraceDays: number;
  inactivityDecayPeriodDays: number;
  inactivityDecayRating: number;
  inactivityRatingFloor: number;
  initialRatingRange: number;
  initialHeroLevelRange: number;
  rangeExpansionSeconds: number;
  ratingRangeExpansion: number;
  heroLevelRangeExpansion: number;
  maximumRatingRange: number;
  maximumHeroLevelRange: number;
  queuePenaltyMinutes: readonly number[];
  queuePenaltyResetHours: number;
  acceptanceSeconds: number;
  recentOpponentAvoidanceMinutes: number;
};

export const rankedGlicko2Config: Readonly<Glicko2Config> = Object.freeze({
  centralRating: 1_500,
  ratingScale: 173.7178,
  initialDeviation: 350,
  initialVolatility: 0.06,
  volatilityConstraint: 0.5,
  convergenceTolerance: 0.000001,
  maximumDeviation: 350,
  placementMatchCount: 5,
});

export const initialRankedRating: Readonly<Glicko2Rating> = Object.freeze({
  rating: rankedGlicko2Config.centralRating,
  deviation: rankedGlicko2Config.initialDeviation,
  volatility: rankedGlicko2Config.initialVolatility,
});

export const rankedCompetitiveConfig: Readonly<RankedCompetitiveConfig> = Object.freeze({
  queueDurationMinutes: 5,
  seasonDurationDays: 56,
  softResetRetention: 0.75,
  softResetMinimumDeviation: 200,
  inactivityGraceDays: 7,
  inactivityDecayPeriodDays: 7,
  inactivityDecayRating: 25,
  inactivityRatingFloor: 2_000,
  initialRatingRange: 100,
  initialHeroLevelRange: 2,
  rangeExpansionSeconds: 15,
  ratingRangeExpansion: 100,
  heroLevelRangeExpansion: 2,
  maximumRatingRange: 500,
  maximumHeroLevelRange: 10,
  queuePenaltyMinutes: Object.freeze([1, 5, 15, 30]),
  queuePenaltyResetHours: 24,
  acceptanceSeconds: 20,
  recentOpponentAvoidanceMinutes: 30,
});

const rankedStandings: readonly RankedStanding[] = Object.freeze([
  { tier: "bronze", division: 3, minimumRating: Number.NEGATIVE_INFINITY },
  { tier: "bronze", division: 2, minimumRating: 1_000 },
  { tier: "bronze", division: 1, minimumRating: 1_100 },
  { tier: "silver", division: 3, minimumRating: 1_200 },
  { tier: "silver", division: 2, minimumRating: 1_300 },
  { tier: "silver", division: 1, minimumRating: 1_400 },
  { tier: "gold", division: 3, minimumRating: 1_500 },
  { tier: "gold", division: 2, minimumRating: 1_600 },
  { tier: "gold", division: 1, minimumRating: 1_700 },
  { tier: "platinum", division: 3, minimumRating: 1_800 },
  { tier: "platinum", division: 2, minimumRating: 1_900 },
  { tier: "platinum", division: 1, minimumRating: 2_000 },
  { tier: "diamond", division: 3, minimumRating: 2_100 },
  { tier: "diamond", division: 2, minimumRating: 2_200 },
  { tier: "diamond", division: 1, minimumRating: 2_300 },
  { tier: "master", division: null, minimumRating: 2_400 },
]);

export function resolveRankedStanding(
  rating: number,
  placementMatches: number,
): RankedStanding | null {
  if (!Number.isFinite(rating)) {
    throw new Error("Ranked rating must be finite.");
  }
  if (!Number.isInteger(placementMatches) || placementMatches < 0) {
    throw new Error("Ranked placement match count must be a non-negative integer.");
  }
  if (placementMatches < rankedGlicko2Config.placementMatchCount) {
    return null;
  }

  for (let index = rankedStandings.length - 1; index >= 0; index -= 1) {
    const standing = rankedStandings[index]!;
    if (rating >= standing.minimumRating) {
      return standing;
    }
  }
  return rankedStandings[0]!;
}

export function rankedMatchmakingRange(elapsedSeconds: number): {
  rating: number;
  heroLevel: number;
} {
  if (!Number.isFinite(elapsedSeconds) || elapsedSeconds < 0) {
    throw new Error("Ranked matchmaking elapsed seconds must be finite and non-negative.");
  }
  const expansions = Math.floor(elapsedSeconds / rankedCompetitiveConfig.rangeExpansionSeconds);
  return {
    rating: Math.min(
      rankedCompetitiveConfig.initialRatingRange +
        expansions * rankedCompetitiveConfig.ratingRangeExpansion,
      rankedCompetitiveConfig.maximumRatingRange,
    ),
    heroLevel: Math.min(
      rankedCompetitiveConfig.initialHeroLevelRange +
        expansions * rankedCompetitiveConfig.heroLevelRangeExpansion,
      rankedCompetitiveConfig.maximumHeroLevelRange,
    ),
  };
}

export function rankedQueuePenaltyMinutes(recentMissCount: number): number {
  if (!Number.isInteger(recentMissCount) || recentMissCount < 1) {
    throw new Error("Ranked queue miss count must be a positive integer.");
  }
  const penalties = rankedCompetitiveConfig.queuePenaltyMinutes;
  return penalties[Math.min(recentMissCount, penalties.length) - 1]!;
}

export function softResetGlicko2Rating(current: Glicko2Rating): Glicko2Rating {
  assertRating(current, "current rating");
  return {
    rating:
      rankedGlicko2Config.centralRating +
      (current.rating - rankedGlicko2Config.centralRating) *
        rankedCompetitiveConfig.softResetRetention,
    deviation: Math.max(current.deviation, rankedCompetitiveConfig.softResetMinimumDeviation),
    volatility: current.volatility,
  };
}

export function applyRankedInactivityDecay(
  current: Glicko2Rating,
  completedDecayPeriods: number,
): Glicko2Rating {
  assertRating(current, "current rating");
  if (!Number.isInteger(completedDecayPeriods) || completedDecayPeriods < 0) {
    throw new Error("Ranked inactivity decay periods must be a non-negative integer.");
  }
  return {
    ...current,
    rating:
      current.rating <= rankedCompetitiveConfig.inactivityRatingFloor
        ? current.rating
        : Math.max(
            rankedCompetitiveConfig.inactivityRatingFloor,
            current.rating - completedDecayPeriods * rankedCompetitiveConfig.inactivityDecayRating,
          ),
  };
}

export function updateGlicko2Rating(
  current: Glicko2Rating,
  results: readonly Glicko2Result[],
  config: Readonly<Glicko2Config> = rankedGlicko2Config,
): Glicko2Rating {
  assertConfig(config);
  assertRating(current, "current rating");
  for (const [index, result] of results.entries()) {
    assertRating(result.opponent, `opponent rating at index ${index}`);
    if (result.score !== 0 && result.score !== 0.5 && result.score !== 1) {
      throw new Error(`Glicko-2 score at index ${index} must be 0, 0.5, or 1.`);
    }
  }

  const mu = toGlicko2Rating(current.rating, config);
  const phi = current.deviation / config.ratingScale;

  if (results.length === 0) {
    return {
      rating: current.rating,
      deviation: Math.min(
        Math.sqrt(phi ** 2 + current.volatility ** 2) * config.ratingScale,
        config.maximumDeviation,
      ),
      volatility: current.volatility,
    };
  }

  const resolvedResults = results.map((result) => {
    const opponentMu = toGlicko2Rating(result.opponent.rating, config);
    const opponentPhi = result.opponent.deviation / config.ratingScale;
    const impact = ratingImpact(opponentPhi);
    const expected = expectedScore(mu, opponentMu, impact);
    return { ...result, impact, expected };
  });
  const variance =
    1 /
    resolvedResults.reduce(
      (sum, result) => sum + result.impact ** 2 * result.expected * (1 - result.expected),
      0,
    );
  const scoreDifference = resolvedResults.reduce(
    (sum, result) => sum + result.impact * (result.score - result.expected),
    0,
  );
  const improvement = variance * scoreDifference;
  const volatility = resolveVolatility(phi, current.volatility, variance, improvement, config);
  const preRatingDeviation = Math.sqrt(phi ** 2 + volatility ** 2);
  const nextPhi = 1 / Math.sqrt(1 / preRatingDeviation ** 2 + 1 / variance);
  const nextMu = mu + nextPhi ** 2 * scoreDifference;

  return {
    rating: nextMu * config.ratingScale + config.centralRating,
    deviation: Math.min(nextPhi * config.ratingScale, config.maximumDeviation),
    volatility,
  };
}

function resolveVolatility(
  deviation: number,
  volatility: number,
  variance: number,
  improvement: number,
  config: Readonly<Glicko2Config>,
): number {
  const initial = Math.log(volatility ** 2);
  const objective = (value: number): number => {
    const exponential = Math.exp(value);
    const denominator = deviation ** 2 + variance + exponential;
    return (
      (exponential * (improvement ** 2 - deviation ** 2 - variance - exponential)) /
        (2 * denominator ** 2) -
      (value - initial) / config.volatilityConstraint ** 2
    );
  };

  let lower = initial;
  let upper: number;
  if (improvement ** 2 > deviation ** 2 + variance) {
    upper = Math.log(improvement ** 2 - deviation ** 2 - variance);
  } else {
    let step = 1;
    while (objective(initial - step * config.volatilityConstraint) < 0) {
      step += 1;
      if (step > 1_000) {
        throw new Error("Glicko-2 volatility bounds did not converge.");
      }
    }
    upper = initial - step * config.volatilityConstraint;
  }

  let lowerValue = objective(lower);
  let upperValue = objective(upper);
  let iterations = 0;
  while (Math.abs(upper - lower) > config.convergenceTolerance) {
    const candidate = lower + ((lower - upper) * lowerValue) / (upperValue - lowerValue);
    const candidateValue = objective(candidate);
    if (candidateValue * upperValue <= 0) {
      lower = upper;
      lowerValue = upperValue;
    } else {
      lowerValue /= 2;
    }
    upper = candidate;
    upperValue = candidateValue;
    iterations += 1;
    if (iterations > 1_000) {
      throw new Error("Glicko-2 volatility calculation did not converge.");
    }
  }

  return Math.exp(lower / 2);
}

function ratingImpact(deviation: number): number {
  return 1 / Math.sqrt(1 + (3 * deviation ** 2) / Math.PI ** 2);
}

function expectedScore(rating: number, opponentRating: number, impact: number): number {
  return 1 / (1 + Math.exp(-impact * (rating - opponentRating)));
}

function toGlicko2Rating(rating: number, config: Readonly<Glicko2Config>): number {
  return (rating - config.centralRating) / config.ratingScale;
}

function assertRating(rating: Glicko2Rating, label: string): void {
  if (!Number.isFinite(rating.rating)) {
    throw new Error(`${label} value must be finite.`);
  }
  if (!Number.isFinite(rating.deviation) || rating.deviation <= 0) {
    throw new Error(`${label} deviation must be a positive finite number.`);
  }
  if (!Number.isFinite(rating.volatility) || rating.volatility <= 0) {
    throw new Error(`${label} volatility must be a positive finite number.`);
  }
}

function assertConfig(config: Readonly<Glicko2Config>): void {
  const positiveValues = [
    config.ratingScale,
    config.initialDeviation,
    config.initialVolatility,
    config.volatilityConstraint,
    config.convergenceTolerance,
    config.maximumDeviation,
    config.placementMatchCount,
  ];
  if (
    !Number.isFinite(config.centralRating) ||
    positiveValues.some((value) => !Number.isFinite(value) || value <= 0)
  ) {
    throw new Error("Glicko-2 configuration values must be finite and positive.");
  }
  if (!Number.isInteger(config.placementMatchCount)) {
    throw new Error("Glicko-2 placement match count must be an integer.");
  }
}
