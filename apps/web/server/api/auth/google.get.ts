import { getQuery, sendRedirect } from "h3";
import { beginGoogleOAuth } from "../../utils/googleOAuth";

export default defineEventHandler(async (event) => {
  const query = getQuery(event);
  const authorizationUrl = await beginGoogleOAuth(
    event,
    typeof query.returnTo === "string" ? query.returnTo : undefined,
  );
  return sendRedirect(event, authorizationUrl, 302);
});
