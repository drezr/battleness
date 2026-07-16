import { definePlayerHandler } from "../../utils/playerHandler";
import {
  buyGameMarketMaterial,
  sellGameMarketItem,
  sellGameMarketMaterial,
} from "../../utils/gameState";

export default definePlayerHandler(async (event) => {
  const body = await readBody<{
    action?: string;
    materialId?: string;
    itemId?: string;
    quantity?: number;
    requestId?: string;
  }>(event);

  try {
    if (body.action === "buyMaterial") {
      if (!body.materialId) {
        throw new Error("materialId is required.");
      }
      if (!body.requestId) {
        throw new Error("requestId is required.");
      }

      return await buyGameMarketMaterial(body.materialId, body.quantity ?? 0, body.requestId);
    }

    if (body.action === "sellMaterial") {
      if (!body.materialId) {
        throw new Error("materialId is required.");
      }
      if (!body.requestId) {
        throw new Error("requestId is required.");
      }

      return await sellGameMarketMaterial(body.materialId, body.quantity ?? 0, body.requestId);
    }

    if (body.action === "sellItem") {
      if (!body.itemId) {
        throw new Error("itemId is required.");
      }
      if (!body.requestId) {
        throw new Error("requestId is required.");
      }

      return await sellGameMarketItem(body.itemId, body.requestId);
    }
  } catch (error) {
    throw createError({
      statusCode: 400,
      statusMessage: error instanceof Error ? error.message : "Market purchase failed.",
    });
  }

  throw createError({
    statusCode: 400,
    statusMessage: "action must be buyMaterial, sellMaterial, or sellItem.",
  });
});
