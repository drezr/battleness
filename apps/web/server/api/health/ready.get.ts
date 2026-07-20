import { validateDeploymentEnvironment } from "../../utils/deploymentEnvironment";
import { usePrisma } from "../../utils/gameState";

export default defineEventHandler(async (event) => {
  const deployment = validateDeploymentEnvironment();
  const checks = {
    environment: deployment.ok,
    database: false,
  };

  if (deployment.ok) {
    try {
      await usePrisma().$queryRaw`SELECT 1`;
      checks.database = true;
    } catch {
      checks.database = false;
    }
  }

  const ready = Object.values(checks).every(Boolean);
  if (!ready) {
    setResponseStatus(event, 503);
  }

  return {
    status: ready ? "ready" : "not_ready",
    environment: deployment.environment,
    checks,
  };
});
