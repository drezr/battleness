import { isDevelopmentAuthEnabled, readPlayerSession } from "../../utils/authSession";
import { isGoogleOAuthEnabled } from "../../utils/googleOAuth";

export default defineEventHandler(async (event) => {
  const session = await readPlayerSession(event);
  return {
    authenticated: Boolean(session),
    developmentAuthEnabled: isDevelopmentAuthEnabled(),
    googleAuthEnabled: isGoogleOAuthEnabled(),
    session,
  };
});
