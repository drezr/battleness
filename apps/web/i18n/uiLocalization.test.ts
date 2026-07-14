import { readdirSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const appRoot = resolve(dirname(fileURLToPath(import.meta.url)), "../app");
const migratedPaths = [
  resolve(appRoot, "pages"),
  resolve(appRoot, "components"),
  resolve(appRoot, "layouts"),
];
const allowedTechnicalText = new Set(["ID", "XP"]);

function vueFiles(path: string): string[] {
  if (path.endsWith(".vue")) {
    return [path];
  }

  return readdirSync(path, { withFileTypes: true }).flatMap((entry) => {
    const entryPath = resolve(path, entry.name);
    return entry.isDirectory()
      ? vueFiles(entryPath)
      : entry.name.endsWith(".vue")
        ? [entryPath]
        : [];
  });
}

function textOutsideTags(template: string): string {
  const source = template.replaceAll(/\{\{[\s\S]*?\}\}/g, "");
  let result = "";
  let insideTag = false;
  let quote = "";

  for (const character of source) {
    if (!insideTag && character === "<") {
      insideTag = true;
      continue;
    }
    if (insideTag) {
      if (quote) {
        if (character === quote) {
          quote = "";
        }
      } else if (character === '"' || character === "'") {
        quote = character;
      } else if (character === ">") {
        insideTag = false;
      }
      continue;
    }
    result += character;
  }

  return result;
}

describe("Nuxt UI localization guard", () => {
  for (const file of migratedPaths.flatMap(vueFiles)) {
    it(`${file.slice(appRoot.length + 1)} has no hardcoded user-facing copy`, () => {
      const source = readFileSync(file, "utf8");
      const template = source.slice(
        source.indexOf("<template>") + 10,
        source.lastIndexOf("</template>"),
      );
      const textNodes = textOutsideTags(template)
        .split(/\r?\n/)
        .map((text) => text.trim())
        .filter((text) => /[A-Za-z]/.test(text) && !allowedTechnicalText.has(text));
      const literalAttributes = [
        ...template.matchAll(/(?<!:)\b(?:aria-label|placeholder|title)="([A-Za-z][^"]+)"/g),
      ].map((match) => match[1] ?? "");

      expect([...textNodes, ...literalAttributes]).toEqual([]);
    });
  }
});
