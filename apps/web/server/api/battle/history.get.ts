import { definePlayerHandler } from "../../utils/playerHandler";
import { getBattleHistoryState } from "../../utils/gameState";

export default definePlayerHandler(async () => getBattleHistoryState());
