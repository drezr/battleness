import { definePlayerHandler } from "../../utils/playerHandler";
import {
  enchantPlayerGem,
  improvePlayerRingSocketCount,
  socketPlayerGem,
  unenchantPlayerGem,
  unsocketPlayerGem,
} from "../../utils/gameState";

export default definePlayerHandler(async (event) => {
  const body = await readBody<{
    action?: string;
    gemItemId?: string;
    ringItemId?: string;
    targetItemId?: string;
    targetType?: string;
  }>(event);

  try {
    if (body.action === "socket") {
      if (!body.ringItemId) {
        throw new Error("ringItemId is required.");
      }
      if (!body.gemItemId) {
        throw new Error("gemItemId is required.");
      }

      return await socketPlayerGem(body.ringItemId, body.gemItemId);
    }

    if (body.action === "unsocket") {
      if (!body.gemItemId) {
        throw new Error("gemItemId is required.");
      }

      return await unsocketPlayerGem(body.gemItemId);
    }

    if (body.action === "improveSockets") {
      if (!body.ringItemId) {
        throw new Error("ringItemId is required.");
      }

      return await improvePlayerRingSocketCount(body.ringItemId);
    }

    if (body.action === "enchant") {
      if (!body.gemItemId) {
        throw new Error("gemItemId is required.");
      }
      if (!body.targetItemId) {
        throw new Error("targetItemId is required.");
      }
      if (!body.targetType) {
        throw new Error("targetType is required.");
      }

      return await enchantPlayerGem(body.gemItemId, body.targetItemId, body.targetType);
    }

    if (body.action === "unenchant") {
      if (!body.gemItemId) {
        throw new Error("gemItemId is required.");
      }

      return await unenchantPlayerGem(body.gemItemId);
    }
  } catch (error) {
    throw createError({
      statusCode: 400,
      statusMessage: error instanceof Error ? error.message : "Socket update failed.",
    });
  }

  throw createError({
    statusCode: 400,
    statusMessage: "action must be socket, unsocket, improveSockets, enchant, or unenchant.",
  });
});
