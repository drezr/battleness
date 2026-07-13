import { getPlayerSocketState } from "../../utils/gameState";

export default defineEventHandler(async () => getPlayerSocketState());
