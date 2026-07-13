import { getLiveBattleState } from "../../../utils/gameState";

export default defineEventHandler(async (event) => {
  const battleId = getRouterParam(event, "battleId");

  try {
    if (!battleId) {
      throw new Error("battleId is required.");
    }

    return await getLiveBattleState(battleId);
  } catch (error) {
    throw createError({
      statusCode: 404,
      statusMessage: error instanceof Error ? error.message : "Battle not found.",
    });
  }
});
