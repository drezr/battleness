import { definePlayerHandler } from "../../utils/playerHandler";
import { isPublicDeployment } from "../../utils/deploymentEnvironment";
import { clearOperationalErrors } from "../../utils/observability";

export default definePlayerHandler(() => {
  if (isPublicDeployment()) {
    throw createError({ statusCode: 404, statusMessage: "Not found." });
  }

  return { cleared: clearOperationalErrors() };
});
