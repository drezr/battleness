import { assertValidDeploymentEnvironment } from "../utils/deploymentEnvironment";

export default defineNitroPlugin(() => {
  assertValidDeploymentEnvironment();
});
