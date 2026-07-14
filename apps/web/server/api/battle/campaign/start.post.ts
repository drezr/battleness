import { definePlayerHandler } from "../../../utils/playerHandler";
import { createLiveCampaignBattle } from "../../../utils/gameState";

export default definePlayerHandler(async (event) => {
  const body = await readBody<{ opponentId?: string; requestId?: string }>(event);

  try {
    if (!body.opponentId) {
      throw new Error("opponentId is required.");
    }
    if (!body.requestId) {
      throw new Error("requestId is required.");
    }

    return await createLiveCampaignBattle(body.opponentId, body.requestId);
  } catch (error) {
    throw createError({
      statusCode: 400,
      statusMessage: error instanceof Error ? error.message : "Campaign battle creation failed.",
    });
  }
});
