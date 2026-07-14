import { describe, expect, it } from "vitest";
import en from "./locales/en.json";
import fr from "./locales/fr.json";
import { locales as contentLocales } from "@battleness/content";

function messageKeys(value: unknown, prefix = ""): string[] {
  if (typeof value === "string") {
    return [prefix];
  }
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new TypeError(`Locale entry "${prefix || "root"}" must be an object or string.`);
  }

  return Object.entries(value).flatMap(([key, entry]) =>
    messageKeys(entry, prefix ? `${prefix}.${key}` : key),
  );
}

describe("Game App locales", () => {
  it("keeps English and French message keys aligned", () => {
    expect(messageKeys(fr).sort()).toEqual(messageKeys(en).sort());
  });

  it("keeps English and French content message keys aligned", () => {
    expect(Object.keys(contentLocales.fr).sort()).toEqual(Object.keys(contentLocales.en).sort());
  });

  it.each([
    ["en", en],
    ["fr", fr],
  ])("contains only non-empty messages in %s", (_locale, messages) => {
    for (const key of messageKeys(messages)) {
      const value = key
        .split(".")
        .reduce<unknown>(
          (current, segment) =>
            current && typeof current === "object"
              ? (current as Record<string, unknown>)[segment]
              : undefined,
          messages,
        );
      expect(value, key).toEqual(expect.any(String));
      expect((value as string).trim(), key).not.toBe("");
    }
  });
});
