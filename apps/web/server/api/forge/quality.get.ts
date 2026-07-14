import { definePlayerHandler } from "../../utils/playerHandler";
import { getPlayerQualityState } from "../../utils/gameState";

export default definePlayerHandler(async () => getPlayerQualityState());
