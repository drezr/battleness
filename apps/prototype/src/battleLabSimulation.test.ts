import { describe, expect, it } from "vitest";
import type { BattleLabConfig } from "@battleness/content";
import { runBattleLabBatch } from "./battleLabSimulation";

const config: BattleLabConfig = {
  id: "simulation",
  seed: "simulation-seed",
  players: [
    {
      id: "simulationOne",
      username: "Simulation One",
      level: 1,
      rings: [
        {
          definitionId: "staticLoop",
          level: 1,
          quality: 50,
          gems: [{ definitionId: "sparkPrism", level: 1, quality: 50 }],
        },
      ],
    },
    {
      id: "simulationTwo",
      username: "Simulation Two",
      level: 1,
      rings: [
        {
          definitionId: "rimeLoop",
          level: 1,
          quality: 50,
          gems: [{ definitionId: "frostChip", level: 1, quality: 50 }],
        },
      ],
    },
  ],
};

describe("Battle Lab deterministic simulation", () => {
  it("runs both element-duel preference variants deterministically", () => {
    const firstRun = runBattleLabBatch(config);
    const secondRun = runBattleLabBatch(config);

    expect(firstRun).toEqual(secondRun);
    expect(firstRun).toHaveLength(2);
    expect(firstRun.map((result) => result.preferredTieWinnerId)).toEqual([
      "simulationOne",
      "simulationTwo",
    ]);
    expect(firstRun.every((result) => result.actionCount <= 500)).toBe(true);
    expect(firstRun.every((result) => !result.timedOut)).toBe(true);
  });

  it("resolves battles containing a summoned Taunt monster", () => {
    const tauntConfig: BattleLabConfig = structuredClone(config);
    tauntConfig.players[0].rings[0]!.gems = [
      {
        definitionId: "staticPearl",
        level: 1,
        quality: 50,
        enchantment: {
          type: "monster",
          definitionId: "iceGuardian",
          level: 1,
          quality: 50,
        },
      },
    ];

    expect(runBattleLabBatch(tauntConfig).every((result) => !result.timedOut)).toBe(true);
  });
});
