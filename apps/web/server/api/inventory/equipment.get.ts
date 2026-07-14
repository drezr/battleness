import { definePlayerHandler } from "../../utils/playerHandler";
import { getPlayerEquipmentState } from "../../utils/gameState";

export default definePlayerHandler(async () => getPlayerEquipmentState());
