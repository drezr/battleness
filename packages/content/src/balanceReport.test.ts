import { describe, expect, it } from "vitest";
import { createBalanceReport, definitions } from "./index";

describe("content balance report", () => {
  it("compares every combat item across base, mid, and max progression profiles", () => {
    const report = createBalanceReport(definitions);

    expect(report.profiles.map((profile) => profile.id)).toEqual(["base", "mid", "max"]);
    expect(report.items).toHaveLength(
      definitions.rings.length +
        definitions.gems.length +
        definitions.monsters.length +
        definitions.spells.length,
    );

    const ashenLoop = report.items.find((item) => item.id === "ashenLoop");
    const firebolt = report.items.find((item) => item.id === "firebolt");
    const iceGuardian = report.items.find((item) => item.id === "iceGuardian");

    expect(ashenLoop?.profiles.find((profile) => profile.profileId === "base")?.stats.damage).toBe(
      5,
    );
    expect(ashenLoop?.profiles.find((profile) => profile.profileId === "max")?.stats.damage).toBe(
      11,
    );
    expect(firebolt?.profiles.find((profile) => profile.profileId === "mid")?.stats.damage).toBe(5);
    expect(iceGuardian?.profiles.find((profile) => profile.profileId === "max")?.stats.health).toBe(
      15,
    );
  });

  it("reports high primary-metric outliers within item kind and rarity groups", () => {
    const report = createBalanceReport(definitions);

    expect(report.warnings.length).toBeGreaterThan(0);
    expect(report.warnings.every((warning) => warning.type === "highOutlier")).toBe(true);
    expect(report.warnings.every((warning) => warning.value >= warning.average)).toBe(true);
  });
});
