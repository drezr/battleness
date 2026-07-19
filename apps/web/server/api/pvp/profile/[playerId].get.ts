import { getPublicPvpProfileState } from "../../../utils/gameState";
import { definePlayerHandler } from "../../../utils/playerHandler";

export default definePlayerHandler(async (event) => {
  const playerId = getRouterParam(event, "playerId");

  try {
    return await getPublicPvpProfileState(playerId ?? "");
  } catch (error) {
    throw createError({
      statusCode: 404,
      statusMessage: error instanceof Error ? error.message : "Player profile was not found.",
    });
  }
});
