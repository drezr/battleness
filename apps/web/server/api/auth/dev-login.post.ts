import { createDevelopmentSession } from "../../utils/authSession";

export default defineEventHandler(async (event) => {
  const body = await readBody<{ playerId?: string }>(event);
  return {
    authenticated: true,
    session: await createDevelopmentSession(event, body.playerId),
  };
});
