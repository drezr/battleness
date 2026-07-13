import { improvePlayerItemQuality } from "../../utils/gameState";

export default defineEventHandler(async (event) => {
  const body = await readBody<{ action?: string; itemId?: string }>(event);

  try {
    if (body.action === "improveQuality") {
      if (!body.itemId) {
        throw new Error("itemId is required.");
      }

      return await improvePlayerItemQuality(body.itemId);
    }
  } catch (error) {
    throw createError({
      statusCode: 400,
      statusMessage: error instanceof Error ? error.message : "Quality update failed.",
    });
  }

  throw createError({
    statusCode: 400,
    statusMessage: "action must be improveQuality.",
  });
});
