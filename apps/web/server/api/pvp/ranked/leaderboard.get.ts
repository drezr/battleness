import { getRankedLeaderboardState } from "../../../utils/gameState";
import { definePlayerHandler } from "../../../utils/playerHandler";

export default definePlayerHandler(async () => getRankedLeaderboardState());
