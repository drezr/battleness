import { definitions } from "@battleness/content";

export type ItemAssetKind = keyof typeof itemAtlases;

type ItemAtlas = {
  path: string;
  columns: number;
  rows: number;
  ids: readonly string[];
};

const itemAtlases = {
  ring: {
    path: "/assets/items/rings-atlas.png",
    columns: 4,
    rows: 4,
    ids: [
      "emberLoop",
      "cinderSignet",
      "furnaceHalo",
      "solarCrown",
      "sparkBand",
      "ironCircle",
      "stormCoil",
      "tempestCircuit",
      "frostSeal",
      "rimeClasp",
      "glacierRing",
      "winterCrown",
      "trainingFlameBand",
    ],
  },
  gem: {
    path: "/assets/items/gems-atlas.png",
    columns: 4,
    rows: 4,
    ids: [
      "rubyShard",
      "emberCore",
      "infernoOpal",
      "sunforgeHeart",
      "sparkPrism",
      "staticPearl",
      "voltDiamond",
      "tempestEye",
      "frostChip",
      "rimeQuartz",
      "glacierPearl",
      "absoluteZeroGem",
      "plainQuartz",
    ],
  },
  monster: {
    path: "/assets/items/monsters-atlas.png",
    columns: 6,
    rows: 3,
    ids: [
      "emberImp",
      "emberLancer",
      "rageSprite",
      "cinderRam",
      "magmaColossus",
      "solarDrake",
      "stormHound",
      "voltMite",
      "arcStriker",
      "coilLynx",
      "thunderRaptor",
      "tempestTitan",
      "iceGuardian",
      "snowSentinel",
      "frostBeetle",
      "rimeGolem",
      "shieldWisp",
      "eternalWarden",
    ],
  },
  spell: {
    path: "/assets/items/spells-atlas.png",
    columns: 3,
    rows: 2,
    ids: ["firebolt", "spark", "iceShard", "solarFlare", "arcPulse", "glacialSpike"],
  },
  material: {
    path: "/assets/items/materials-atlas.png",
    columns: 10,
    rows: 7,
    ids: [
      "aluminium",
      "iron",
      "sodium",
      "magnesium",
      "manganese",
      "calcium",
      "copper",
      "titanium",
      "chromium",
      "zinc",
      "nickel",
      "cobalt",
      "lead",
      "silver",
      "mercury",
      "gold",
      "platinum",
      "tungsten",
      "uranium",
      "iridium",
      "plutonium",
      "neptunium",
      "radium",
      "hydrogen",
      "oxygen",
      "nitrogen",
      "helium",
      "chlorine",
      "fluorine",
      "bromine",
      "neon",
      "argon",
      "iodine",
      "krypton",
      "xenon",
      "radon",
      "astatine",
      "pearl",
      "amethyst",
      "chromite",
      "topaz",
      "turquoise",
      "citrine",
      "azurite",
      "moonstone",
      "sunstone",
      "opal",
      "sapphire",
      "ruby",
      "emerald",
      "diamond",
      "redDiamond",
      "blackOpal",
      "alexandrite",
      "sand",
      "wax",
      "rubber",
      "coal",
      "cellulose",
      "oil",
      "carbon",
      "ink",
      "silk",
      "keratin",
      "silicon",
      "sulfur",
      "phosphorus",
      "chitin",
      "plasma",
      "graphene",
    ],
  },
} as const satisfies Record<string, ItemAtlas>;

const definitionGroups = {
  ring: definitions.rings,
  gem: definitions.gems,
  monster: definitions.monsters,
  spell: definitions.spells,
  material: definitions.materials,
} as const;

export function validateItemAssets(): void {
  for (const kind of Object.keys(itemAtlases) as ItemAssetKind[]) {
    const atlasIds = new Set<string>(itemAtlases[kind].ids);
    const missingIds = definitionGroups[kind]
      .map((definition) => definition.id)
      .filter((id) => !atlasIds.has(id));

    if (missingIds.length > 0) {
      throw new Error(`Missing ${kind} artwork for: ${missingIds.join(", ")}.`);
    }
  }
}

export function itemArtworkStyle(kind: ItemAssetKind, definitionId: string): string {
  const atlas = itemAtlases[kind];
  const index = atlas.ids.indexOf(definitionId as never);

  if (index < 0) {
    return "";
  }

  const column = index % atlas.columns;
  const row = Math.floor(index / atlas.columns);
  const x = (column / (atlas.columns - 1)) * 100;
  const y = (row / (atlas.rows - 1)) * 100;

  return [
    `--item-atlas: url('${atlas.path}')`,
    `--item-atlas-size: ${atlas.columns * 100}% ${atlas.rows * 100}%`,
    `--item-atlas-position: ${x}% ${y}%`,
  ].join(";");
}
