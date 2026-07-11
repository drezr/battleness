import { craftPlayerRecipe } from "../../utils/gameState";

export default defineEventHandler(async (event) => {
  const body = await readBody<{ recipeId?: string }>(event);

  if (!body.recipeId) {
    throw createError({
      statusCode: 400,
      statusMessage: "recipeId is required.",
    });
  }

  try {
    return craftPlayerRecipe(body.recipeId);
  } catch (error) {
    throw createError({
      statusCode: 400,
      statusMessage: error instanceof Error ? error.message : "Crafting failed.",
    });
  }
});
