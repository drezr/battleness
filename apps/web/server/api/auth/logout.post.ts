import { revokePlayerSession } from "../../utils/authSession";

export default defineEventHandler(async (event) => {
  await revokePlayerSession(event);
  return { authenticated: false };
});
