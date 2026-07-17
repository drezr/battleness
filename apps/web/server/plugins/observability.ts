import { captureRequestError, initializeRequestObservability } from "../utils/observability";

export default defineNitroPlugin((nitroApp) => {
  nitroApp.hooks.hook("request", (event) => {
    initializeRequestObservability(event);
  });

  nitroApp.hooks.hook("error", (error, context) => {
    if (context.event) captureRequestError(error, context.event);
  });
});
