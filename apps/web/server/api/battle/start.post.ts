import { definePlayerHandler } from "../../utils/playerHandler";
import { createLiveTrainingBattle } from "../../utils/gameState";

export default definePlayerHandler(async (event) => {
  const body = await readBody<{ requestId?: string }>(event);

  try {
    if (!body.requestId) {
      throw new Error("requestId is required.");
    }

    return await createLiveTrainingBattle(body.requestId);
  } catch (error) {
    throw createError({
      statusCode: 400,
      statusMessage: error instanceof Error ? error.message : "Battle creation failed.",
    });
  }
});
