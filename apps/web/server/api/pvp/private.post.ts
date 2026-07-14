import {
  createPrivateMatch,
  joinPrivateMatch,
  leavePrivateMatch,
  setPrivateMatchReady,
} from "../../utils/gameState";
import { definePlayerHandler } from "../../utils/playerHandler";

export default definePlayerHandler(async (event) => {
  const body = await readBody<{
    action?: string;
    code?: string;
    loadoutId?: string;
    ready?: boolean;
  }>(event);

  try {
    if (body.action === "create") {
      return await createPrivateMatch();
    }
    if (body.action === "join") {
      return await joinPrivateMatch(body.code ?? "");
    }
    if (body.action === "ready") {
      return await setPrivateMatchReady(body.loadoutId ?? "", body.ready !== false);
    }
    if (body.action === "leave") {
      return await leavePrivateMatch();
    }
  } catch (error) {
    throw createError({
      statusCode: 400,
      statusMessage: error instanceof Error ? error.message : "Private match update failed.",
    });
  }

  throw createError({
    statusCode: 400,
    statusMessage: "action must be create, join, ready, or leave.",
  });
});
