import { definePlayerHandler } from "../../utils/playerHandler";
import { getPlayerLoadoutState } from "../../utils/gameState";

export default definePlayerHandler(async () => getPlayerLoadoutState());
