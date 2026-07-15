import { definePlayerHandler } from "../../../../utils/playerHandler";
import { purchasePlayerMarketListing } from "../../../../utils/playerMarket";

export default definePlayerHandler(async (event) => {
  const body = await readBody<{ requestId?: string }>(event);
  const listingId = getRouterParam(event, "listingId");

  try {
    return await purchasePlayerMarketListing({ listingId, requestId: body.requestId });
  } catch (error) {
    throw createError({
      statusCode: 400,
      statusMessage: error instanceof Error ? error.message : "Listing purchase failed.",
    });
  }
});
