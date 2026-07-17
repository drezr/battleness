import { usePrisma } from "../utils/gameState";
import { captureOperationalFailure } from "../utils/observability";
import { runRankedSeasonMaintenance } from "../utils/rankedSeasonMaintenance";

const maintenanceIntervalMs = 60 * 60 * 1_000;

export default defineNitroPlugin(() => {
  const run = async () => {
    try {
      await runRankedSeasonMaintenance(usePrisma());
    } catch (error) {
      captureOperationalFailure({
        category: "matchmaking",
        error,
        metadata: { operation: "rankedSeasonMaintenance" },
      });
    }
  };

  void run();
  const timer = setInterval(run, maintenanceIntervalMs);
  timer.unref();
});
