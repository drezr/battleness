import { definePlayerHandler } from "../../../utils/playerHandler";
import { getLiveBattleState } from "../../../utils/gameState";

export default definePlayerHandler(async (event) => {
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
