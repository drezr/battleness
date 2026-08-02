import { describe, expect, it } from "vitest";
import { itemArtworkStyleVariables, validateItemAssets } from "./itemAtlases";

describe("production item atlases", () => {
  it("covers every active definition", () => {
    expect(() => validateItemAssets()).not.toThrow();
  });

  it("renders both regular and TexturePacker-rotated frames", () => {
    expect(itemArtworkStyleVariables("ring", "ashenLoop")).toMatchObject({
      "--item-atlas": "url('/assets/items/rings.png')",
      "--item-sprite-transform": "none",
    });
    expect(itemArtworkStyleVariables("ring", "arcBand")).toMatchObject({
      "--item-atlas": "url('/assets/items/rings.png')",
      "--item-sprite-transform": "rotate(-90deg) translateX(-100%)",
    });
  });
});
