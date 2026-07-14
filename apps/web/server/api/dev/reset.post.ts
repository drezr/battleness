import { definePlayerHandler } from "../../utils/playerHandler";
import { resetDevelopmentPlayerState } from "../../utils/gameState";

export default definePlayerHandler(async () => {
  if (process.env.NODE_ENV === "production") {
    throw createError({
      statusCode: 404,
      statusMessage: "Not found.",
    });
  }

  return resetDevelopmentPlayerState();
});
