import { definePlayerHandler } from "../utils/playerHandler";
import { getCampaignState } from "../utils/gameState";

export default definePlayerHandler(async () => getCampaignState());
