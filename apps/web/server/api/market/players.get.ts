import { getQuery } from "h3";
import { definePlayerHandler } from "../../utils/playerHandler";
import { getPlayerMarketListings, type PlayerMarketBrowseInput } from "../../utils/playerMarket";

export default definePlayerHandler(async (event) => {
  const query = getQuery(event);
  const input: PlayerMarketBrowseInput = {
    resourceType: scalarQueryValue(query.resourceType),
    definitionId: scalarQueryValue(query.definitionId),
    rarity: scalarQueryValue(query.rarity),
    element: scalarQueryValue(query.element),
    minLevel: scalarQueryValue(query.minLevel),
    maxLevel: scalarQueryValue(query.maxLevel),
    minQuality: scalarQueryValue(query.minQuality),
    maxQuality: scalarQueryValue(query.maxQuality),
    minPrice: scalarQueryValue(query.minPrice),
    maxPrice: scalarQueryValue(query.maxPrice),
    sort: scalarQueryValue(query.sort),
    page: scalarQueryValue(query.page),
    pageSize: scalarQueryValue(query.pageSize),
  };

  try {
    return await getPlayerMarketListings(input);
  } catch (error) {
    throw createError({
      statusCode: 400,
      statusMessage: error instanceof Error ? error.message : "Invalid player market filters.",
    });
  }
});

function scalarQueryValue(value: unknown): string | undefined {
  const scalar = Array.isArray(value) ? value[0] : value;
  return typeof scalar === "string" ? scalar : undefined;
}
