import { createDevelopmentBattleResult } from "../../utils/gameState";

export default defineEventHandler(async (event) => {
  if (process.env.NODE_ENV === "production") {
    throw createError({
      statusCode: 404,
      statusMessage: "Not found.",
    });
  }

  const body = await readBody<{
    outcome?: string;
    requestId?: string;
  }>(event);

  try {
    if (body.outcome !== "win" && body.outcome !== "loss") {
      throw new Error("outcome must be win or loss.");
    }
    if (!body.requestId) {
      throw new Error("requestId is required.");
    }

    return await createDevelopmentBattleResult(body.outcome, body.requestId);
  } catch (error) {
    throw createError({
      statusCode: 400,
      statusMessage: error instanceof Error ? error.message : "Battle result creation failed.",
    });
  }
});
