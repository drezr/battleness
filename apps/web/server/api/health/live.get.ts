import { battlenessAppEnvironment } from "../../utils/deploymentEnvironment";

export default defineEventHandler(() => ({
  status: "ok",
  environment: battlenessAppEnvironment(),
}));
