import { definePlayerHandler } from "../../utils/playerHandler";
import { isPublicDeployment } from "../../utils/deploymentEnvironment";
import { listOperationalErrors, operationalErrorCapacity } from "../../utils/observability";

export default definePlayerHandler((event) => {
  if (isPublicDeployment()) {
    throw createError({ statusCode: 404, statusMessage: "Not found." });
  }

  return {
    correlationId:
      typeof event.context.correlationId === "string" ? event.context.correlationId : null,
    capacity: operationalErrorCapacity(),
    records: listOperationalErrors(),
  };
});
