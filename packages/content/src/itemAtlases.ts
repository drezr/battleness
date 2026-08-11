import gemsAtlasJson from "./atlases/gems.json";
import materialsAtlasJson from "./atlases/materials.json";
import monstersAtlasJson from "./atlases/monsters.json";
import ringsAtlasJson from "./atlases/rings.json";
import spellsAtlasJson from "./atlases/spells.json";
import gems from "./definitions/gems.json";
import materials from "./definitions/materials.json";
import monsters from "./definitions/monsters.json";
import rings from "./definitions/rings.json";
import spells from "./definitions/spells.json";

export type ItemAssetKind = "ring" | "gem" | "monster" | "spell" | "material";

type AtlasFrame = {
  filename: string;
  frame: { x: number; y: number; w: number; h: number };
  rotated: boolean;
  trimmed: boolean;
  spriteSourceSize: { x: number; y: number; w: number; h: number };
  sourceSize: { w: number; h: number };
};

type PackedAtlas = {
  layout: "packed";
  path: string;
  size: { w: number; h: number };
  frames: ReadonlyMap<string, AtlasFrame>;
};

const packedAtlases = {
  ring: createPackedAtlas("/assets/items/rings.png", ringsAtlasJson),
  gem: createPackedAtlas("/assets/items/gems.png", gemsAtlasJson),
  monster: createPackedAtlas("/assets/items/monsters.png", monstersAtlasJson),
  material: createPackedAtlas("/assets/items/materials.png", materialsAtlasJson),
  spell: createPackedAtlas("/assets/items/spells.png", spellsAtlasJson),
} as const;

const itemAtlases = packedAtlases;

const definitionIds = {
  ring: rings.map((definition) => definition.id),
  gem: gems.map((definition) => definition.id),
  monster: monsters.map((definition) => definition.id),
  spell: spells.map((definition) => definition.id),
  material: materials.map((definition) => definition.id),
} satisfies Record<ItemAssetKind, readonly string[]>;

export function itemArtworkStyleVariables(
  kind: ItemAssetKind,
  definitionId: string,
): Record<string, string> {
  const atlas = itemAtlases[kind];
  return packedArtworkStyle(atlas, definitionId);
}

export function hasItemAsset(kind: ItemAssetKind, definitionId: string): boolean {
  return Object.keys(itemArtworkStyleVariables(kind, definitionId)).length > 0;
}

export function validateItemAssets(): void {
  for (const kind of Object.keys(itemAtlases) as ItemAssetKind[]) {
    const missingIds = definitionIds[kind].filter((id) => !hasItemAsset(kind, id));
    if (missingIds.length > 0) {
      throw new Error(`Missing ${kind} artwork for: ${missingIds.join(", ")}.`);
    }
  }
}

function createPackedAtlas(
  path: string,
  json: {
    frames: AtlasFrame[];
    meta: { image: string; size: { w: number; h: number } };
  },
): PackedAtlas {
  return {
    layout: "packed",
    path,
    size: json.meta.size,
    frames: new Map(
      json.frames.map((frame) => [frame.filename.replace(/\.png$/u, ""), frame] as const),
    ),
  };
}

function packedArtworkStyle(atlas: PackedAtlas, definitionId: string): Record<string, string> {
  const frame = atlas.frames.get(definitionId);
  if (!frame) return {};
  const source = frame.spriteSourceSize;
  const sourceSize = frame.sourceSize;
  const packedWidth = frame.rotated ? frame.frame.h : frame.frame.w;
  const packedHeight = frame.rotated ? frame.frame.w : frame.frame.h;
  const backgroundX = percentage(frame.frame.x, atlas.size.w - packedWidth);
  const backgroundY = percentage(frame.frame.y, atlas.size.h - packedHeight);

  return {
    "background-image": "none",
    "--item-atlas": `url('${atlas.path}')`,
    "--item-sprite-display": "block",
    "--item-sprite-left": percentage(source.x, sourceSize.w),
    "--item-sprite-top": percentage(source.y, sourceSize.h),
    "--item-sprite-width": percentage(packedWidth, sourceSize.w),
    "--item-sprite-height": percentage(packedHeight, sourceSize.h),
    "--item-sprite-background-size": `${percentage(atlas.size.w, packedWidth)} ${percentage(
      atlas.size.h,
      packedHeight,
    )}`,
    "--item-sprite-background-position": `${backgroundX} ${backgroundY}`,
    "--item-sprite-transform": frame.rotated ? "rotate(-90deg) translateX(-100%)" : "none",
  };
}

function percentage(value: number, total: number): string {
  return total === 0 ? "0%" : `${(value / total) * 100}%`;
}
