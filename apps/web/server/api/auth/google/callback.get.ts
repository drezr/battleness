import { getQuery, sendRedirect } from "h3";
import { completeGoogleOAuth } from "../../../utils/googleOAuth";

export default defineEventHandler(async (event) => {
  const query = getQuery(event);
  if (query.error) {
    return sendRedirect(event, "/login?error=google_denied", 302);
  }

  try {
    const result = await completeGoogleOAuth(event, {
      code: typeof query.code === "string" ? query.code : undefined,
      state: typeof query.state === "string" ? query.state : undefined,
    });
    return sendRedirect(event, result.returnTo, 302);
  } catch {
    return sendRedirect(event, "/login?error=google_failed", 302);
  }
});
