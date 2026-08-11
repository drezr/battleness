import { readFileSync } from "node:fs";
import { URL } from "node:url";
import { describe, expect, it } from "vitest";

const repositoryRoot = new URL("../../../", import.meta.url);

describe("production spell asset files", () => {
  it("ships the same valid spell atlas in both public applications", () => {
    const webPng = readFileSync(new URL("apps/web/public/assets/items/spells.png", repositoryRoot));
    const prototypePng = readFileSync(
      new URL("apps/prototype/public/assets/items/spells.png", repositoryRoot),
    );

    for (const png of [webPng, prototypePng]) {
      expect(png.subarray(0, 8).toString("hex")).toBe("89504e470d0a1a0a");
      expect(png.readUInt32BE(16)).toBe(1876);
      expect(png.readUInt32BE(20)).toBe(1460);
    }
    expect(prototypePng.equals(webPng)).toBe(true);
  });
});
