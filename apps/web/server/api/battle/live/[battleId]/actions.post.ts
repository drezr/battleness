import { submitLiveBattleAction, type LiveBattleActionCommand } from "../../../../utils/gameState";

export default defineEventHandler(async (event) => {
  const battleId = getRouterParam(event, "battleId");
  const body = await readBody<{
    expectedActionCount?: number;
    action?: LiveBattleActionCommand;
  }>(event);

  try {
    if (!battleId) {
      throw new Error("battleId is required.");
    }
    if (body.expectedActionCount === undefined) {
      throw new Error("expectedActionCount is required.");
    }
    if (!body.action) {
      throw new Error("action is required.");
    }

    return await submitLiveBattleAction(battleId, body.expectedActionCount, body.action);
  } catch (error) {
    throw createError({
      statusCode: 400,
      statusMessage: error instanceof Error ? error.message : "Battle action failed.",
    });
  }
});
