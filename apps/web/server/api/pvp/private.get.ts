import { getPrivateMatchState } from "../../utils/gameState";
import { definePlayerHandler } from "../../utils/playerHandler";

export default definePlayerHandler(async () => getPrivateMatchState());
