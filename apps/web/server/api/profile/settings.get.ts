import { definePlayerHandler } from "../../utils/playerHandler";
import { getProfileSettings } from "../../utils/gameState";

export default definePlayerHandler(async () => getProfileSettings());
