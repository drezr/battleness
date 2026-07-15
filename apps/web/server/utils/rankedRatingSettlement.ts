import {
  Prisma,
  PrismaClient,
  type RankedRatingAdjustment,
  type RankedSeasonRating,
} from "@prisma/client";
import { rankedGlicko2Config, updateGlicko2Rating, type Glicko2Rating } from "./rankedRating";

export type RankedRatingSettlementPlayer = {
  playerId: string;
  score: 0 | 0.5 | 1;
  before: Glicko2Rating;
  after: Glicko2Rating;
  placementMatchesBefore: number;
  placementMatchesAfter: number;
};

export type RankedRatingSettlement = {
  seasonId: string;
  battleRecordId: string;
  alreadySettled: boolean;
  playerOne: RankedRatingSettlementPlayer;
  playerTwo: RankedRatingSettlementPlayer;
};

type SettleRankedBattleRatingInput = {
  seasonId: string;
  battleRecordId: string;
  settledAt?: Date;
};

const maximumSettlementAttempts = 4;

export async function settleRankedBattleRating(
  prisma: PrismaClient,
  input: SettleRankedBattleRatingInput,
): Promise<RankedRatingSettlement> {
  assertSettlementInput(input);
  const settledAt = input.settledAt ?? new Date();

  for (let attempt = 1; attempt <= maximumSettlementAttempts; attempt += 1) {
    try {
      return await prisma.$transaction(
        async (transaction) => {
          const battle = await transaction.battleRecord.findUnique({
            where: { id: input.battleRecordId },
          });
          if (
            !battle ||
            battle.mode !== "ranked_pvp" ||
            battle.status !== "finished" ||
            !battle.playerOneId ||
            !battle.playerTwoId
          ) {
            throw new Error("A finished ranked PvP battle with two players is required.");
          }

          const playerIds = [battle.playerOneId, battle.playerTwoId];
          const existingAdjustments = await transaction.rankedRatingAdjustment.findMany({
            where: { battleRecordId: battle.id },
            orderBy: { playerId: "asc" },
          });
          if (existingAdjustments.length > 0) {
            if (
              existingAdjustments.length !== 2 ||
              existingAdjustments.some(
                (adjustment) =>
                  adjustment.seasonId !== input.seasonId ||
                  !playerIds.includes(adjustment.playerId),
              )
            ) {
              throw new Error("Ranked battle rating journal is incomplete or inconsistent.");
            }
            return settlementFromAdjustments(
              input.seasonId,
              battle.id,
              battle.playerOneId,
              battle.playerTwoId,
              existingAdjustments,
              true,
            );
          }

          const season = await transaction.rankedSeason.findUnique({
            where: { id: input.seasonId },
          });
          if (!season || battle.createdAt < season.startsAt || battle.createdAt >= season.endsAt) {
            throw new Error("Ranked battle does not belong to the requested season period.");
          }

          for (const playerId of playerIds) {
            await transaction.rankedSeasonRating.upsert({
              where: { seasonId_playerId: { seasonId: season.id, playerId } },
              create: { seasonId: season.id, playerId },
              update: {},
            });
          }
          const ratings = await transaction.rankedSeasonRating.findMany({
            where: { seasonId: season.id, playerId: { in: playerIds } },
          });
          const playerOneRating = requireRating(ratings, battle.playerOneId);
          const playerTwoRating = requireRating(ratings, battle.playerTwoId);
          const [playerOneScore, playerTwoScore] = rankedBattleScores(
            battle.result,
            battle.winnerPlayerId,
            battle.playerOneId,
            battle.playerTwoId,
          );
          const playerOneAfter = updateGlicko2Rating(toGlicko2(playerOneRating), [
            { opponent: toGlicko2(playerTwoRating), score: playerOneScore },
          ]);
          const playerTwoAfter = updateGlicko2Rating(toGlicko2(playerTwoRating), [
            { opponent: toGlicko2(playerOneRating), score: playerTwoScore },
          ]);
          const playerOnePlacements = Math.min(
            playerOneRating.placementMatches + 1,
            rankedGlicko2Config.placementMatchCount,
          );
          const playerTwoPlacements = Math.min(
            playerTwoRating.placementMatches + 1,
            rankedGlicko2Config.placementMatchCount,
          );

          const [playerOneUpdate, playerTwoUpdate] = await Promise.all([
            updateRankedSeasonRating(
              transaction,
              playerOneRating,
              playerOneAfter,
              playerOneScore,
              playerOnePlacements,
              settledAt,
            ),
            updateRankedSeasonRating(
              transaction,
              playerTwoRating,
              playerTwoAfter,
              playerTwoScore,
              playerTwoPlacements,
              settledAt,
            ),
          ]);
          if (playerOneUpdate !== 1 || playerTwoUpdate !== 1) {
            throw new ConcurrentRankedSettlementError();
          }

          await transaction.rankedRatingAdjustment.createMany({
            data: [
              adjustmentData({
                seasonId: season.id,
                battleRecordId: battle.id,
                player: playerOneRating,
                opponentPlayerId: battle.playerTwoId,
                score: playerOneScore,
                after: playerOneAfter,
                placementMatchesAfter: playerOnePlacements,
                createdAt: settledAt,
              }),
              adjustmentData({
                seasonId: season.id,
                battleRecordId: battle.id,
                player: playerTwoRating,
                opponentPlayerId: battle.playerOneId,
                score: playerTwoScore,
                after: playerTwoAfter,
                placementMatchesAfter: playerTwoPlacements,
                createdAt: settledAt,
              }),
            ],
          });

          return {
            seasonId: season.id,
            battleRecordId: battle.id,
            alreadySettled: false,
            playerOne: settlementPlayer(
              playerOneRating,
              playerOneScore,
              playerOneAfter,
              playerOnePlacements,
            ),
            playerTwo: settlementPlayer(
              playerTwoRating,
              playerTwoScore,
              playerTwoAfter,
              playerTwoPlacements,
            ),
          };
        },
        { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
      );
    } catch (error) {
      if (attempt < maximumSettlementAttempts && isRetryableSettlementError(error)) {
        continue;
      }
      throw error;
    }
  }

  throw new Error("Ranked rating settlement exhausted all retry attempts.");
}

async function updateRankedSeasonRating(
  transaction: Prisma.TransactionClient,
  current: RankedSeasonRating,
  after: Glicko2Rating,
  score: 0 | 0.5 | 1,
  placementMatches: number,
  settledAt: Date,
): Promise<number> {
  const update = await transaction.rankedSeasonRating.updateMany({
    where: {
      seasonId: current.seasonId,
      playerId: current.playerId,
      version: current.version,
    },
    data: {
      rating: after.rating,
      deviation: after.deviation,
      volatility: after.volatility,
      placementMatches,
      peakRating:
        placementMatches >= rankedGlicko2Config.placementMatchCount
          ? Math.max(current.peakRating ?? Number.NEGATIVE_INFINITY, after.rating)
          : current.peakRating,
      wins: score === 1 ? { increment: 1 } : undefined,
      losses: score === 0 ? { increment: 1 } : undefined,
      draws: score === 0.5 ? { increment: 1 } : undefined,
      lastMatchAt: settledAt,
      version: { increment: 1 },
    },
  });
  return update.count;
}

function adjustmentData(input: {
  seasonId: string;
  battleRecordId: string;
  player: RankedSeasonRating;
  opponentPlayerId: string;
  score: 0 | 0.5 | 1;
  after: Glicko2Rating;
  placementMatchesAfter: number;
  createdAt?: Date;
}) {
  return {
    settlementKey: `${input.battleRecordId}:${input.player.playerId}`,
    seasonId: input.seasonId,
    playerId: input.player.playerId,
    opponentPlayerId: input.opponentPlayerId,
    battleRecordId: input.battleRecordId,
    reason: "match",
    score: input.score,
    ratingBefore: input.player.rating,
    ratingAfter: input.after.rating,
    deviationBefore: input.player.deviation,
    deviationAfter: input.after.deviation,
    volatilityBefore: input.player.volatility,
    volatilityAfter: input.after.volatility,
    placementMatchesBefore: input.player.placementMatches,
    placementMatchesAfter: input.placementMatchesAfter,
    ...(input.createdAt ? { createdAt: input.createdAt } : {}),
  };
}

function settlementFromAdjustments(
  seasonId: string,
  battleRecordId: string,
  playerOneId: string,
  playerTwoId: string,
  adjustments: readonly RankedRatingAdjustment[],
  alreadySettled: boolean,
): RankedRatingSettlement {
  return {
    seasonId,
    battleRecordId,
    alreadySettled,
    playerOne: settlementPlayerFromAdjustment(requireAdjustment(adjustments, playerOneId)),
    playerTwo: settlementPlayerFromAdjustment(requireAdjustment(adjustments, playerTwoId)),
  };
}

function settlementPlayer(
  before: RankedSeasonRating,
  score: 0 | 0.5 | 1,
  after: Glicko2Rating,
  placementMatchesAfter: number,
): RankedRatingSettlementPlayer {
  return {
    playerId: before.playerId,
    score,
    before: toGlicko2(before),
    after,
    placementMatchesBefore: before.placementMatches,
    placementMatchesAfter,
  };
}

function settlementPlayerFromAdjustment(
  adjustment: RankedRatingAdjustment,
): RankedRatingSettlementPlayer {
  if (adjustment.score !== 0 && adjustment.score !== 0.5 && adjustment.score !== 1) {
    throw new Error("Ranked match journal contains an invalid score.");
  }
  return {
    playerId: adjustment.playerId,
    score: adjustment.score,
    before: {
      rating: adjustment.ratingBefore,
      deviation: adjustment.deviationBefore,
      volatility: adjustment.volatilityBefore,
    },
    after: {
      rating: adjustment.ratingAfter,
      deviation: adjustment.deviationAfter,
      volatility: adjustment.volatilityAfter,
    },
    placementMatchesBefore: adjustment.placementMatchesBefore,
    placementMatchesAfter: adjustment.placementMatchesAfter,
  };
}

function rankedBattleScores(
  result: string,
  winnerPlayerId: string | null,
  playerOneId: string,
  playerTwoId: string,
): readonly [0 | 0.5 | 1, 0 | 0.5 | 1] {
  if (result === "draw") {
    return [0.5, 0.5];
  }
  if (winnerPlayerId === playerOneId) {
    return [1, 0];
  }
  if (winnerPlayerId === playerTwoId) {
    return [0, 1];
  }
  throw new Error("Finished ranked battle does not have a valid result.");
}

function requireRating(
  ratings: readonly RankedSeasonRating[],
  playerId: string,
): RankedSeasonRating {
  const rating = ratings.find((candidate) => candidate.playerId === playerId);
  if (!rating) {
    throw new Error(`Ranked rating for player "${playerId}" was not created.`);
  }
  return rating;
}

function requireAdjustment(
  adjustments: readonly RankedRatingAdjustment[],
  playerId: string,
): RankedRatingAdjustment {
  const adjustment = adjustments.find((candidate) => candidate.playerId === playerId);
  if (!adjustment) {
    throw new Error(`Ranked adjustment for player "${playerId}" was not found.`);
  }
  return adjustment;
}

function toGlicko2(rating: RankedSeasonRating): Glicko2Rating {
  return {
    rating: rating.rating,
    deviation: rating.deviation,
    volatility: rating.volatility,
  };
}

function assertSettlementInput(input: SettleRankedBattleRatingInput): void {
  if (!input.seasonId.trim() || !input.battleRecordId.trim()) {
    throw new Error("Ranked settlement season and battle IDs are required.");
  }
  if (input.settledAt && Number.isNaN(input.settledAt.getTime())) {
    throw new Error("Ranked settlement time must be valid.");
  }
}

function isRetryableSettlementError(error: unknown): boolean {
  return (
    error instanceof ConcurrentRankedSettlementError ||
    (error instanceof Prisma.PrismaClientKnownRequestError &&
      (error.code === "P2002" || error.code === "P2034"))
  );
}

class ConcurrentRankedSettlementError extends Error {
  constructor() {
    super("Ranked rating changed during settlement.");
  }
}
