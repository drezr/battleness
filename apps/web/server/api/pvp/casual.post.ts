import { cancelCasualMatchmaking, enterCasualMatchmaking } from "../../utils/gameState";
import { definePlayerHandler } from "../../utils/playerHandler";

export default definePlayerHandler(async (event) => {
  const body = await readBody<{ action?: string }>(event);

  try {
    if (body.action === "enter") {
      return await enterCasualMatchmaking();
    }
    if (body.action === "cancel") {
      return await cancelCasualMatchmaking();
    }
  } catch (error) {
    throw createError({
      statusCode: 400,
      statusMessage: error instanceof Error ? error.message : "Casual matchmaking update failed.",
    });
  }

  throw createError({ statusCode: 400, statusMessage: "action must be enter or cancel." });
});
