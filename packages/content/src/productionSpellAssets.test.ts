import { describe, expect, it } from "vitest";
import assetBible from "../sources/production-items-v2.asset-bible.json";
import productionSpells from "../sources/production-spells-v1.json";
import spellAtlas from "./atlases/spells.json";
import { definitions } from "./index";
import { itemArtworkStyleVariables } from "./itemAtlases";

describe("production spell assets", () => {
  it("matches every approved production spell to one valid atlas frame", () => {
    const definitionIds = productionSpells.spells.map((spell) => spell.id).sort();
    const frameIds = spellAtlas.frames.map((frame) => frame.filename.replace(/\.png$/u, "")).sort();

    expect(productionSpells).toMatchObject({
      contentVersion: "production-items-v2",
      status: "approved-for-production",
      counts: { fire: 14, electric: 14, ice: 14, total: 42 },
    });
    expect(frameIds).toEqual(definitionIds);
    expect(new Set(frameIds).size).toBe(42);
    expect(spellAtlas.meta).toMatchObject({
      image: "spells.png",
      format: "RGBA8888",
      size: { w: 1876, h: 1460 },
    });
    expect(assetBible.productionAtlases.spells).toEqual({
      status: "imported",
      image: "spells.png",
      metadata: "packages/content/src/atlases/spells.json",
      frameCount: spellAtlas.frames.length,
      atlasSize: spellAtlas.meta.size,
      logicalSourceSize: { w: 300, h: 300 },
    });

    for (const frame of spellAtlas.frames) {
      expect(frame.sourceSize).toEqual({ w: 300, h: 300 });
      const packedWidth = frame.rotated ? frame.frame.h : frame.frame.w;
      const packedHeight = frame.rotated ? frame.frame.w : frame.frame.h;
      expect(frame.frame.x).toBeGreaterThanOrEqual(0);
      expect(frame.frame.y).toBeGreaterThanOrEqual(0);
      expect(frame.frame.x + packedWidth).toBeLessThanOrEqual(spellAtlas.meta.size.w);
      expect(frame.frame.y + packedHeight).toBeLessThanOrEqual(spellAtlas.meta.size.h);
    }
  });

  it("activates the complete production collection and packed atlas", () => {
    const approvedIds = productionSpells.spells.map((spell) => spell.id).sort();
    expect(definitions.spells.map((spell) => spell.id).sort()).toEqual(approvedIds);
    expect(itemArtworkStyleVariables("spell", "burnI")).toMatchObject({
      "--item-atlas": "url('/assets/items/spells.png')",
    });
  });
});
