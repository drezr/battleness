import { definePlayerHandler } from "../../utils/playerHandler";
import { equipPlayerRing, unequipPlayerRing } from "../../utils/gameState";

export default definePlayerHandler(async (event) => {
  const body = await readBody<{ action?: string; ringItemId?: string }>(event);

  if (!body.ringItemId) {
    throw createError({
      statusCode: 400,
      statusMessage: "ringItemId is required.",
    });
  }

  try {
    if (body.action === "equip") {
      return await equipPlayerRing(body.ringItemId);
    }
    if (body.action === "unequip") {
      return await unequipPlayerRing(body.ringItemId);
    }
  } catch (error) {
    throw createError({
      statusCode: 400,
      statusMessage: error instanceof Error ? error.message : "Equipment update failed.",
    });
  }

  throw createError({
    statusCode: 400,
    statusMessage: "action must be equip or unequip.",
  });
});
