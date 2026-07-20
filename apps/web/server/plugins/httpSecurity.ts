import { applyHttpSecurity } from "../utils/httpSecurity";

export default defineNitroPlugin((nitroApp) => {
  nitroApp.hooks.hook("request", (event) => {
    applyHttpSecurity(event);
  });
});
