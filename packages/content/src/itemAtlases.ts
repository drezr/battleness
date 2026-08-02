import gemsAtlasJson from "./atlases/gems.json";
import monstersAtlasJson from "./atlases/monsters.json";
import ringsAtlasJson from "./atlases/rings.json";
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

type GridAtlas = {
  layout: "grid";
  path: string;
  columns: number;
  rows: number;
  ids: readonly string[];
};

const packedAtlases = {
  ring: createPackedAtlas("/assets/items/rings.png", ringsAtlasJson),
  gem: createPackedAtlas("/assets/items/gems.png", gemsAtlasJson),
  monster: createPackedAtlas("/assets/items/monsters.png", monstersAtlasJson),
} as const;

const gridAtlases = {
  spell: {
    layout: "grid",
    path: "/assets/items/spells-atlas.png",
    columns: 3,
    rows: 2,
    ids: ["firebolt", "spark", "iceShard", "solarFlare", "arcPulse", "glacialSpike"],
  },
  material: {
    layout: "grid",
    path: "/assets/items/materials-atlas.png",
    columns: 10,
    rows: 7,
    ids: materials.map((material) => material.id),
  },
} as const satisfies Record<string, GridAtlas>;

const itemAtlases = { ...packedAtlases, ...gridAtlases };

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
  if (atlas.layout === "grid") return gridArtworkStyle(atlas, definitionId);
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

function gridArtworkStyle(atlas: GridAtlas, definitionId: string): Record<string, string> {
  const index = atlas.ids.indexOf(definitionId);
  if (index < 0) return {};
  const column = index % atlas.columns;
  const row = Math.floor(index / atlas.columns);
  const x = atlas.columns === 1 ? 0 : (column / (atlas.columns - 1)) * 100;
  const y = atlas.rows === 1 ? 0 : (row / (atlas.rows - 1)) * 100;
  return {
    "--item-atlas": `url('${atlas.path}')`,
    "--item-atlas-size": `${atlas.columns * 100}% ${atlas.rows * 100}%`,
    "--item-atlas-position": `${x}% ${y}%`,
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
