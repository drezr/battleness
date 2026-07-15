import { definePlayerHandler } from "../../utils/playerHandler";
import { createPlayerMarketListing, type PlayerMarketCreateInput } from "../../utils/playerMarket";

export default definePlayerHandler(async (event) => {
  const body = await readBody<PlayerMarketCreateInput>(event);

  try {
    return await createPlayerMarketListing(body);
  } catch (error) {
    throw createError({
      statusCode: 400,
      statusMessage: error instanceof Error ? error.message : "Player-market listing failed.",
    });
  }
});
