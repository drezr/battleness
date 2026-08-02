import { describe, expect, it } from "vitest";
import { itemArtworkRarityClass } from "./itemAssets";

describe("item artwork rarity borders", () => {
  it.each([
    ["ring", "ashenLoop", "rarity-border-common"],
    ["gem", "moltenGarnet", "rarity-border-refined"],
    ["monster", "maelorVane", "rarity-border-rare"],
    ["material", "iridium", "rarity-border-epic"],
  ])("resolves the %s %s rarity from content", (kind, definitionId, expectedClass) => {
    expect(itemArtworkRarityClass(kind, definitionId)).toBe(expectedClass);
  });

  it("uses an explicit rarity for versioned item data", () => {
    expect(itemArtworkRarityClass("ring", "legacyRing", "rare")).toBe("rarity-border-rare");
  });

  it("does not add an invalid or unknown rarity border", () => {
    expect(itemArtworkRarityClass("ring", "legacyRing", "normal")).toBeUndefined();
    expect(itemArtworkRarityClass("unknown", "unknown")).toBeUndefined();
  });
});
