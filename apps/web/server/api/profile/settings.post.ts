import { definePlayerHandler } from "../../utils/playerHandler";
import { updateProfileSettings, type ProfileSettingsInput } from "../../utils/gameState";

export default definePlayerHandler(async (event) => {
  const body = await readBody<ProfileSettingsInput>(event);

  try {
    return await updateProfileSettings(body);
  } catch (error) {
    throw createError({
      statusCode: 400,
      statusMessage: error instanceof Error ? error.message : "Profile settings update failed.",
    });
  }
});
