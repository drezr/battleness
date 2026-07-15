import { getCasualMatchmakingState } from "../../utils/gameState";
import { definePlayerHandler } from "../../utils/playerHandler";

export default definePlayerHandler(async () => getCasualMatchmakingState());
