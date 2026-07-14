import { definePlayerHandler } from "../../utils/playerHandler";
import { getPlayerSocketState } from "../../utils/gameState";

export default definePlayerHandler(async () => getPlayerSocketState());
