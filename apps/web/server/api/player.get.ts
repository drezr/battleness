import { definePlayerHandler } from "../utils/playerHandler";
import { getPlayerState } from "../utils/gameState";

export default definePlayerHandler(async () => getPlayerState());
