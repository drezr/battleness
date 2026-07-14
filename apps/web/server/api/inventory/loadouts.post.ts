import { definePlayerHandler } from "../../utils/playerHandler";
import {
  activatePlayerLoadout,
  deletePlayerLoadout,
  savePlayerLoadoutFromEquipped,
} from "../../utils/gameState";

export default definePlayerHandler(async (event) => {
  const body = await readBody<{ action?: string; loadoutId?: string; name?: string }>(event);

  try {
    if (body.action === "saveFromEquipped") {
      if (!body.name) {
        throw new Error("name is required.");
      }

      return await savePlayerLoadoutFromEquipped(body.name);
    }

    if (body.action === "activate") {
      if (!body.loadoutId) {
        throw new Error("loadoutId is required.");
      }

      return await activatePlayerLoadout(body.loadoutId);
    }

    if (body.action === "delete") {
      if (!body.loadoutId) {
        throw new Error("loadoutId is required.");
      }

      return await deletePlayerLoadout(body.loadoutId);
    }
  } catch (error) {
    throw createError({
      statusCode: 400,
      statusMessage: error instanceof Error ? error.message : "Loadout update failed.",
    });
  }

  throw createError({
    statusCode: 400,
    statusMessage: "action must be saveFromEquipped, activate, or delete.",
  });
});
