import { existsSync, readFileSync } from "node:fs";
import { URL } from "node:url";
import { describe, expect, it } from "vitest";

const repositoryRoot = new URL("../../../", import.meta.url);
const catalogue = JSON.parse(
  readFileSync(
    new URL("packages/content/sources/production-spells-v1.json", repositoryRoot),
    "utf8",
  ),
);

describe("production spell asset files", () => {
  it("retains every generated source image and the expected atlas PNG", () => {
    for (const spell of catalogue.spells) {
      expect(existsSync(new URL(`assets/spells/large/${spell.id}.png`, repositoryRoot))).toBe(true);
      expect(existsSync(new URL(`assets/spells/small/${spell.id}.png`, repositoryRoot))).toBe(true);
    }

    const png = readFileSync(new URL("assets/spells/atlas/spells.png", repositoryRoot));
    expect(png.subarray(0, 8).toString("hex")).toBe("89504e470d0a1a0a");
    expect(png.readUInt32BE(16)).toBe(1876);
    expect(png.readUInt32BE(20)).toBe(1460);
  });

  it("copies the active atlas into both public applications", () => {
    expect(existsSync(new URL("apps/web/public/assets/items/spells.png", repositoryRoot))).toBe(
      true,
    );
    expect(
      existsSync(new URL("apps/prototype/public/assets/items/spells.png", repositoryRoot)),
    ).toBe(true);
  });
});
