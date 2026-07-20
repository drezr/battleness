import { definePlayerHandler } from "../../utils/playerHandler";
import { isPublicDeployment } from "../../utils/deploymentEnvironment";
import { resetDevelopmentPlayerState } from "../../utils/gameState";

export default definePlayerHandler(async () => {
  if (isPublicDeployment()) {
    throw createError({
      statusCode: 404,
      statusMessage: "Not found.",
    });
  }

  return resetDevelopmentPlayerState();
});
