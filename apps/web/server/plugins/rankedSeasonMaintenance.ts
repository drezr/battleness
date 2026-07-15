import { usePrisma } from "../utils/gameState";
import { runRankedSeasonMaintenance } from "../utils/rankedSeasonMaintenance";

const maintenanceIntervalMs = 60 * 60 * 1_000;

export default defineNitroPlugin(() => {
  const run = async () => {
    try {
      await runRankedSeasonMaintenance(usePrisma());
    } catch (error) {
      console.error("Ranked season maintenance failed.", error);
    }
  };

  void run();
  const timer = setInterval(run, maintenanceIntervalMs);
  timer.unref();
});
