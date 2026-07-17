import { definePlayerHandler } from "../../utils/playerHandler";
import { clearOperationalErrors } from "../../utils/observability";

export default definePlayerHandler(() => {
  if (process.env.NODE_ENV === "production") {
    throw createError({ statusCode: 404, statusMessage: "Not found." });
  }

  return { cleared: clearOperationalErrors() };
});
