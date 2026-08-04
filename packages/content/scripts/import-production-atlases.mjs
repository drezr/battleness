import { copyFile, mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, extname, resolve } from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

const sourceRoot = process.argv[2];
if (!sourceRoot) {
  throw new Error("Pass the directory containing rings/gems/monsters PNG and JSON files.");
}

const scriptDirectory = dirname(fileURLToPath(import.meta.url));
const contentRoot = resolve(scriptDirectory, "..");
const repositoryRoot = resolve(contentRoot, "..", "..");
const atlasMetadataRoot = resolve(contentRoot, "src", "atlases");
const bible = JSON.parse(
  await readFile(resolve(contentRoot, "sources", "production-items-v1.asset-bible.json"), "utf8"),
);

await mkdir(atlasMetadataRoot, { recursive: true });

for (const kind of ["rings", "gems", "monsters"]) {
  const sourceJsonPath = resolve(sourceRoot, `${kind}.json`);
  const sourcePngPath = resolve(sourceRoot, `${kind}.png`);
  const atlas = JSON.parse(await readFile(sourceJsonPath, "utf8"));
  validateAtlas(kind, atlas, bible[kind]);
  atlas.meta.image = `${kind}.png`;

  await writeFile(
    resolve(atlasMetadataRoot, `${kind}.json`),
    `${JSON.stringify(atlas, null, 2)}\n`,
    "utf8",
  );

  for (const app of ["web", "prototype"]) {
    const targetRoot = resolve(repositoryRoot, "apps", app, "public", "assets", "items");
    await mkdir(targetRoot, { recursive: true });
    await copyFile(sourcePngPath, resolve(targetRoot, `${kind}.png`));
  }
}

function validateAtlas(kind, atlas, definitions) {
  if (!Array.isArray(atlas.frames)) throw new Error(`${kind} atlas frames must be an array.`);
  const expectedIds = new Set(definitions.map((definition) => definition.id));
  const actualIds = new Set();

  for (const frame of atlas.frames) {
    const id = frame.filename.slice(0, -extname(frame.filename).length);
    if (actualIds.has(id)) throw new Error(`${kind} atlas duplicates frame ${id}.`);
    actualIds.add(id);
    if (!expectedIds.has(id)) throw new Error(`${kind} atlas has unexpected frame ${id}.`);
    if (frame.sourceSize.w !== 300 || frame.sourceSize.h !== 300) {
      throw new Error(`${kind}/${id} must use a 300x300 logical source canvas.`);
    }
    const packedWidth = frame.rotated ? frame.frame.h : frame.frame.w;
    const packedHeight = frame.rotated ? frame.frame.w : frame.frame.h;
    if (
      frame.frame.x < 0 ||
      frame.frame.y < 0 ||
      frame.frame.x + packedWidth > atlas.meta.size.w ||
      frame.frame.y + packedHeight > atlas.meta.size.h
    ) {
      throw new Error(`${kind}/${id} lies outside the atlas bounds.`);
    }
  }

  for (const id of expectedIds) {
    if (!actualIds.has(id)) throw new Error(`${kind} atlas is missing frame ${id}.`);
  }
}
