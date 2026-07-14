import { definePlayerHandler } from "../../../utils/playerHandler";
import { claimBattleReward } from "../../../utils/gameState";

export default definePlayerHandler(async (event) => {
  const body = await readBody<{ rewardGrantId?: string }>(event);

  if (!body.rewardGrantId) {
    throw createError({
      statusCode: 400,
      statusMessage: "rewardGrantId is required.",
    });
  }

  try {
    return await claimBattleReward(body.rewardGrantId);
  } catch (error) {
    throw createError({
      statusCode: 400,
      statusMessage: error instanceof Error ? error.message : "Reward claim failed.",
    });
  }
});
