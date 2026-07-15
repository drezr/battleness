import { Prisma, type PrismaClient, type RankedSeasonRating } from "@prisma/client";
import { contentVersion } from "@battleness/content";
import {
  applyRankedInactivityDecay,
  rankedCompetitiveConfig,
  softResetGlicko2Rating,
} from "./rankedRating";
import { createRankedSeasonRewardBundle, rankedSeasonRewardGrantId } from "./rankedSeasonRewards";

const dayMs = 24 * 60 * 60 * 1_000;
const maintenanceTransaction = {
  isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
  maxWait: 5_000,
  timeout: 30_000,
} as const;

export type RankedSeasonMaintenanceResult = {
  activeSeasonId: string | null;
  transitions: number;
  decays: number;
};

export async function runRankedSeasonMaintenance(
  prisma: PrismaClient,
  now: Date = new Date(),
): Promise<RankedSeasonMaintenanceResult> {
  assertDate(now);
  let transitions = 0;

  for (let index = 0; index < 24; index += 1) {
    const dueSeason = await prisma.rankedSeason.findFirst({
      where: {
        status: { in: ["active", "scheduled"] },
        endsAt: { lte: now },
      },
      orderBy: [{ endsAt: "asc" }, { id: "asc" }],
      select: { id: true },
    });
    if (!dueSeason) break;

    const transitioned = await transitionRankedSeason(prisma, dueSeason.id, now);
    if (transitioned) transitions += 1;
  }

  await prisma.rankedSeason.updateMany({
    where: {
      status: "scheduled",
      startsAt: { lte: now },
      endsAt: { gt: now },
    },
    data: { status: "active" },
  });

  const activeSeason = await prisma.rankedSeason.findFirst({
    where: { status: "active", startsAt: { lte: now }, endsAt: { gt: now } },
    orderBy: [{ startsAt: "desc" }, { id: "asc" }],
  });
  const decays = activeSeason
    ? await applyActiveSeasonInactivityDecay(prisma, activeSeason, now)
    : 0;

  return {
    activeSeasonId: activeSeason?.id ?? null,
    transitions,
    decays,
  };
}

async function transitionRankedSeason(
  prisma: PrismaClient,
  seasonId: string,
  now: Date,
): Promise<boolean> {
  for (let attempt = 0; attempt < 4; attempt += 1) {
    try {
      return await prisma.$transaction(async (transaction) => {
        const season = await transaction.rankedSeason.findUnique({
          where: { id: seasonId },
          include: { ratings: true, nextSeason: true },
        });
        if (!season || season.endsAt > now) return false;

        if (season.nextSeason) {
          await transaction.rankedSeason.updateMany({
            where: { id: season.id, status: { not: "closed" } },
            data: { status: "closed" },
          });
          await transaction.rankedSeason.updateMany({
            where: { id: season.nextSeason.id, status: "scheduled" },
            data: { status: "active" },
          });
          return false;
        }

        const nextSeasonId = rankedSeasonId(season.endsAt);
        const nextEndsAt = new Date(
          season.endsAt.getTime() + rankedCompetitiveConfig.seasonDurationDays * dayMs,
        );
        await transaction.rankedSeason.create({
          data: {
            id: nextSeasonId,
            previousSeasonId: season.id,
            status: "active",
            startsAt: season.endsAt,
            endsAt: nextEndsAt,
          },
        });

        const resetRatings = season.ratings.map((rating) => {
          const reset = softResetGlicko2Rating(rating);
          return {
            seasonId: nextSeasonId,
            playerId: rating.playerId,
            rating: reset.rating,
            deviation: reset.deviation,
            volatility: reset.volatility,
            placementMatches: 0,
            wins: 0,
            losses: 0,
            draws: 0,
            version: 0,
            lastMatchAt: rating.lastMatchAt,
          };
        });
        if (resetRatings.length > 0) {
          await transaction.rankedSeasonRating.createMany({ data: resetRatings });
          await transaction.rankedRatingAdjustment.createMany({
            data: season.ratings.map((rating, index) => {
              const reset = resetRatings[index]!;
              return {
                settlementKey: `season-reset:${season.id}:${nextSeasonId}:${rating.playerId}`,
                seasonId: nextSeasonId,
                playerId: rating.playerId,
                reason: "season_soft_reset",
                ratingBefore: rating.rating,
                ratingAfter: reset.rating,
                deviationBefore: rating.deviation,
                deviationAfter: reset.deviation,
                volatilityBefore: rating.volatility,
                volatilityAfter: reset.volatility,
                placementMatchesBefore: rating.placementMatches,
                placementMatchesAfter: 0,
                createdAt: now,
              };
            }),
          });
        }

        const eligibleRewards = season.ratings
          .filter((rating) => rating.placementMatches >= 5)
          .map((rating) => {
            const bundle = createRankedSeasonRewardBundle(
              season.id,
              rating.playerId,
              rating.peakRating ?? rating.rating,
            );
            return {
              playerId: rating.playerId,
              rewardGrantId: rankedSeasonRewardGrantId(season.id, rating.playerId),
              bundle,
            };
          });
        if (eligibleRewards.length > 0) {
          await transaction.rewardGrant.createMany({
            data: eligibleRewards.map(({ playerId, rewardGrantId, bundle }) => ({
              id: rewardGrantId,
              playerId,
              sourceType: "rankedSeason",
              sourceId: season.id,
              credits: bundle.credits,
              heroExperience: 0,
              contentVersion,
              createdAt: now,
            })),
          });
          await transaction.rewardGrantMaterial.createMany({
            data: eligibleRewards.flatMap(({ rewardGrantId, bundle }) =>
              bundle.materials.map((material) => ({ rewardGrantId, ...material })),
            ),
          });
          await transaction.rankedSeasonReward.createMany({
            data: eligibleRewards.map(({ playerId, rewardGrantId, bundle }) => ({
              seasonId: season.id,
              playerId,
              rewardGrantId,
              tier: bundle.tier,
              peakRating: bundle.peakRating,
              badgeCosmeticId: bundle.badgeCosmeticId,
              titleCosmeticId: bundle.titleCosmeticId,
              createdAt: now,
            })),
          });
        }

        await transaction.rankedQueueEntry.updateMany({
          where: {
            seasonId: season.id,
            status: { in: ["waiting", "matching", "accepting"] },
          },
          data: { status: "expired" },
        });
        await transaction.rankedSeason.update({
          where: { id: season.id },
          data: { status: "closed" },
        });
        return true;
      }, maintenanceTransaction);
    } catch (error) {
      if (!isRetryableMaintenanceError(error) || attempt === 3) throw error;
    }
  }
  return false;
}

async function applyActiveSeasonInactivityDecay(
  prisma: PrismaClient,
  season: { id: string; startsAt: Date },
  now: Date,
): Promise<number> {
  const candidates = await prisma.rankedSeasonRating.findMany({
    where: {
      seasonId: season.id,
      rating: { gt: rankedCompetitiveConfig.inactivityRatingFloor },
      OR: [{ rating: { gte: 2_100 } }, { adjustments: { some: { reason: "inactivity_decay" } } }],
    },
  });
  let applied = 0;
  for (const candidate of candidates) {
    applied += await applyPlayerInactivityDecay(prisma, season, candidate, now);
  }
  return applied;
}

async function applyPlayerInactivityDecay(
  prisma: PrismaClient,
  season: { id: string; startsAt: Date },
  candidate: RankedSeasonRating,
  now: Date,
): Promise<number> {
  const anchor =
    candidate.lastMatchAt && candidate.lastMatchAt > season.startsAt
      ? candidate.lastMatchAt
      : season.startsAt;
  const elapsedMs = now.getTime() - anchor.getTime();
  const graceMs = rankedCompetitiveConfig.inactivityGraceDays * dayMs;
  if (elapsedMs < graceMs) return 0;

  const periodMs = rankedCompetitiveConfig.inactivityDecayPeriodDays * dayMs;
  const completedPeriods = Math.floor((elapsedMs - graceMs) / periodMs) + 1;
  for (let attempt = 0; attempt < 4; attempt += 1) {
    try {
      return await prisma.$transaction(async (transaction) => {
        const current = await transaction.rankedSeasonRating.findUniqueOrThrow({
          where: {
            seasonId_playerId: { seasonId: season.id, playerId: candidate.playerId },
          },
        });
        const existing = new Set(
          (
            await transaction.rankedRatingAdjustment.findMany({
              where: {
                seasonId: season.id,
                playerId: candidate.playerId,
                reason: "inactivity_decay",
              },
              select: { settlementKey: true },
            })
          ).map((adjustment) => adjustment.settlementKey),
        );
        let next = current;
        const adjustments: Prisma.RankedRatingAdjustmentCreateManyInput[] = [];
        for (let period = 1; period <= completedPeriods; period += 1) {
          const settlementKey = inactivitySettlementKey(
            season.id,
            candidate.playerId,
            anchor,
            period,
          );
          if (existing.has(settlementKey)) continue;
          const decayed = applyRankedInactivityDecay(next, 1);
          adjustments.push({
            settlementKey,
            seasonId: season.id,
            playerId: candidate.playerId,
            reason: "inactivity_decay",
            ratingBefore: next.rating,
            ratingAfter: decayed.rating,
            deviationBefore: next.deviation,
            deviationAfter: decayed.deviation,
            volatilityBefore: next.volatility,
            volatilityAfter: decayed.volatility,
            placementMatchesBefore: next.placementMatches,
            placementMatchesAfter: next.placementMatches,
            createdAt: now,
          });
          next = { ...next, ...decayed };
        }
        if (adjustments.length === 0) return 0;

        const updated = await transaction.rankedSeasonRating.updateMany({
          where: {
            seasonId: season.id,
            playerId: candidate.playerId,
            version: current.version,
          },
          data: {
            rating: next.rating,
            deviation: next.deviation,
            volatility: next.volatility,
            version: { increment: adjustments.length },
          },
        });
        if (updated.count !== 1) throw new Error("Concurrent ranked inactivity update.");
        await transaction.rankedRatingAdjustment.createMany({ data: adjustments });
        return adjustments.length;
      }, maintenanceTransaction);
    } catch (error) {
      if (!isRetryableMaintenanceError(error) || attempt === 3) throw error;
    }
  }
  return 0;
}

function rankedSeasonId(startsAt: Date): string {
  return `ranked-season-${startsAt.toISOString().replace(/[^0-9]/g, "")}`;
}

function inactivitySettlementKey(
  seasonId: string,
  playerId: string,
  anchor: Date,
  period: number,
): string {
  return `inactivity-decay:${seasonId}:${playerId}:${anchor.toISOString()}:${period}`;
}

function isRetryableMaintenanceError(error: unknown): boolean {
  return (
    (error instanceof Prisma.PrismaClientKnownRequestError &&
      (error.code === "P2002" || error.code === "P2034")) ||
    (error instanceof Error && error.message === "Concurrent ranked inactivity update.")
  );
}

function assertDate(value: Date): void {
  if (Number.isNaN(value.getTime())) throw new Error("Ranked maintenance date must be valid.");
}
