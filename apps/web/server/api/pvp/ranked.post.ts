import {
  acceptRankedMatch,
  cancelRankedMatchmaking,
  declineRankedMatch,
  enterRankedMatchmaking,
} from "../../utils/gameState";
import { definePlayerHandler } from "../../utils/playerHandler";

export default definePlayerHandler(async (event) => {
  const body = await readBody<{ action?: string }>(event);

  try {
    if (body.action === "enter") return await enterRankedMatchmaking();
    if (body.action === "cancel") return await cancelRankedMatchmaking();
    if (body.action === "accept") return await acceptRankedMatch();
    if (body.action === "decline") return await declineRankedMatch();
  } catch (error) {
    throw createError({
      statusCode: 400,
      statusMessage: error instanceof Error ? error.message : "Ranked matchmaking update failed.",
    });
  }

  throw createError({
    statusCode: 400,
    statusMessage: "action must be enter, cancel, accept, or decline.",
  });
});
