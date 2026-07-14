import { definePlayerHandler } from "../../utils/playerHandler";
import { getGameMarketState } from "../../utils/gameState";

export default definePlayerHandler(async () => getGameMarketState());
