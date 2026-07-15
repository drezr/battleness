import { getQuery } from "h3";
import { definePlayerHandler } from "../../../utils/playerHandler";
import { getPlayerMarketHistory, type PlayerMarketHistoryInput } from "../../../utils/playerMarket";

export default definePlayerHandler(async (event) => {
  const query = getQuery(event);
  const input: PlayerMarketHistoryInput = {
    role: scalarQueryValue(query.role),
    page: scalarQueryValue(query.page),
    pageSize: scalarQueryValue(query.pageSize),
  };

  try {
    return await getPlayerMarketHistory(input);
  } catch (error) {
    throw createError({
      statusCode: 400,
      statusMessage:
        error instanceof Error ? error.message : "Invalid player-market history query.",
    });
  }
});

function scalarQueryValue(value: unknown): string | undefined {
  const scalar = Array.isArray(value) ? value[0] : value;
  return typeof scalar === "string" ? scalar : undefined;
}
