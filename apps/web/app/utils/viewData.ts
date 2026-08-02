export type ViewMetric = {
  labelKey: string;
  valueKey: string;
};

export type ViewSection = {
  titleKey: string;
  bodyKey: string;
  statusKey?: string;
  itemKeys?: string[];
  actions?: { labelKey: string; to: string }[];
};

export type ViewLink = {
  labelKey: string;
  to: string;
};

export type MockView = {
  eyebrowKey: string;
  titleKey: string;
  descriptionKey: string;
  statusKey?: string;
  metrics?: ViewMetric[];
  links?: ViewLink[];
  sections: ViewSection[];
};

export const mainNavigation: ViewLink[] = [
  { labelKey: "navigation.home", to: "/" },
  { labelKey: "navigation.battle", to: "/battle" },
  { labelKey: "navigation.forge", to: "/forge" },
  { labelKey: "navigation.inventory", to: "/inventory" },
  { labelKey: "navigation.market", to: "/market" },
  { labelKey: "navigation.profile", to: "/profile" },
];

export const sectionLinks = {
  battle: [
    { labelKey: "navigation.hub", to: "/battle" },
    { labelKey: "navigation.campaign", to: "/battle/campaign" },
    { labelKey: "navigation.pvp", to: "/battle/pvp" },
    { labelKey: "navigation.history", to: "/battle/history" },
  ],
  pvp: [
    { labelKey: "navigation.pvpHub", to: "/battle/pvp" },
    { labelKey: "navigation.private", to: "/battle/pvp/private" },
    { labelKey: "navigation.casual", to: "/battle/pvp/casual" },
    { labelKey: "navigation.ranked", to: "/battle/pvp/ranked" },
  ],
  forge: [
    { labelKey: "navigation.hub", to: "/forge" },
    { labelKey: "navigation.craft", to: "/forge/craft" },
    { labelKey: "navigation.socket", to: "/forge/socket" },
    { labelKey: "navigation.enchant", to: "/forge/enchant" },
    { labelKey: "navigation.quality", to: "/forge/quality" },
  ],
  inventory: [
    { labelKey: "navigation.hub", to: "/inventory" },
    { labelKey: "navigation.items", to: "/inventory/items" },
    { labelKey: "navigation.materials", to: "/inventory/materials" },
    { labelKey: "navigation.equipment", to: "/inventory/equipment" },
    { labelKey: "navigation.loadouts", to: "/inventory/loadouts" },
  ],
  market: [
    { labelKey: "navigation.hub", to: "/market" },
    { labelKey: "navigation.gameMarket", to: "/market/game" },
    { labelKey: "navigation.playerMarket", to: "/market/players" },
    { labelKey: "navigation.marketHistory", to: "/market/players/history" },
  ],
  profile: [
    { labelKey: "navigation.overview", to: "/profile" },
    { labelKey: "navigation.progression", to: "/profile/progression" },
    { labelKey: "navigation.history", to: "/profile/history" },
    { labelKey: "navigation.settings", to: "/profile/settings" },
  ],
} satisfies Record<string, ViewLink[]>;

const notBuilt = "mock.common.notBuilt";

export const viewsByPath: Record<string, MockView> = {
  "/battle/pvp": {
    eyebrowKey: "battle.section",
    titleKey: "mock.pvp.title",
    descriptionKey: "mock.pvp.description",
    statusKey: notBuilt,
    links: sectionLinks.pvp,
    sections: [
      {
        titleKey: "mock.pvp.private.title",
        bodyKey: "mock.pvp.private.body",
        actions: [{ labelKey: "mock.pvp.private.action", to: "/battle/pvp/private" }],
      },
      {
        titleKey: "mock.pvp.casual.title",
        bodyKey: "mock.pvp.casual.body",
        actions: [{ labelKey: "mock.pvp.casual.action", to: "/battle/pvp/casual" }],
      },
      {
        titleKey: "mock.pvp.ranked.title",
        bodyKey: "mock.pvp.ranked.body",
        actions: [{ labelKey: "mock.pvp.ranked.action", to: "/battle/pvp/ranked" }],
      },
    ],
  },
  "/battle/pvp/private": {
    eyebrowKey: "navigation.pvp",
    titleKey: "mock.pvp.private.title",
    descriptionKey: "mock.pvp.private.description",
    statusKey: notBuilt,
    links: sectionLinks.pvp,
    sections: [
      {
        titleKey: "mock.pvp.private.create.title",
        bodyKey: "mock.pvp.private.create.body",
        itemKeys: [
          "mock.pvp.private.create.code",
          "mock.pvp.private.create.authority",
          "mock.pvp.private.create.reconnect",
        ],
      },
      {
        titleKey: "mock.pvp.private.join.title",
        bodyKey: "mock.pvp.private.join.body",
        itemKeys: [
          "mock.pvp.private.join.code",
          "mock.pvp.private.join.loadout",
          "mock.pvp.private.join.confirm",
        ],
      },
    ],
  },
  "/battle/pvp/casual": {
    eyebrowKey: "navigation.pvp",
    titleKey: "mock.pvp.casual.title",
    descriptionKey: "mock.pvp.casual.description",
    statusKey: notBuilt,
    links: sectionLinks.pvp,
    sections: [
      {
        titleKey: "mock.pvp.casual.queue.title",
        bodyKey: "mock.pvp.casual.queue.body",
        itemKeys: [
          "mock.pvp.casual.queue.wait",
          "mock.pvp.casual.queue.loadout",
          "mock.pvp.casual.queue.rank",
        ],
      },
    ],
  },
  "/battle/pvp/ranked": {
    eyebrowKey: "navigation.pvp",
    titleKey: "mock.pvp.ranked.title",
    descriptionKey: "mock.pvp.ranked.description",
    statusKey: "mock.pvp.ranked.status",
    links: sectionLinks.pvp,
    sections: [
      {
        titleKey: "mock.pvp.ranked.overview.title",
        bodyKey: "mock.pvp.ranked.overview.body",
        itemKeys: [
          "mock.pvp.ranked.overview.rank",
          "mock.pvp.ranked.overview.season",
          "mock.pvp.ranked.overview.rewards",
        ],
      },
    ],
  },
  "/forge": {
    eyebrowKey: "forge.section",
    titleKey: "mock.forge.title",
    descriptionKey: "mock.forge.description",
    links: sectionLinks.forge,
    sections: [
      {
        titleKey: "forge.craft.title",
        bodyKey: "mock.forge.craftBody",
        actions: [{ labelKey: "mock.forge.openCraft", to: "/forge/craft" }],
      },
      {
        titleKey: "forge.socket.title",
        bodyKey: "mock.forge.socketBody",
        actions: [{ labelKey: "mock.forge.openSocket", to: "/forge/socket" }],
      },
      {
        titleKey: "forge.enchant.title",
        bodyKey: "forge.enchant.description",
        actions: [{ labelKey: "navigation.enchant", to: "/forge/enchant" }],
      },
      {
        titleKey: "forge.quality.title",
        bodyKey: "mock.forge.qualityBody",
        actions: [{ labelKey: "mock.forge.openQuality", to: "/forge/quality" }],
      },
    ],
  },
  "/inventory": {
    eyebrowKey: "inventory.section",
    titleKey: "mock.inventory.title",
    descriptionKey: "mock.inventory.description",
    links: sectionLinks.inventory,
    sections: [
      {
        titleKey: "inventory.items.title",
        bodyKey: "mock.inventory.itemsBody",
        actions: [{ labelKey: "mock.inventory.openItems", to: "/inventory/items" }],
      },
      {
        titleKey: "inventory.materials.title",
        bodyKey: "mock.inventory.materialsBody",
        actions: [{ labelKey: "mock.inventory.openMaterials", to: "/inventory/materials" }],
      },
      {
        titleKey: "inventory.equipment.title",
        bodyKey: "mock.inventory.equipmentBody",
        actions: [{ labelKey: "mock.inventory.openEquipment", to: "/inventory/equipment" }],
      },
      {
        titleKey: "inventory.loadouts.title",
        bodyKey: "mock.inventory.loadoutsBody",
        actions: [{ labelKey: "mock.inventory.openLoadouts", to: "/inventory/loadouts" }],
      },
    ],
  },
  "/market": {
    eyebrowKey: "market.section",
    titleKey: "mock.market.title",
    descriptionKey: "mock.market.description",
    links: sectionLinks.market,
    sections: [
      {
        titleKey: "market.game.title",
        bodyKey: "mock.market.gameBody",
        statusKey: "mock.market.gameStatus",
        actions: [{ labelKey: "mock.market.openGame", to: "/market/game" }],
      },
      {
        titleKey: "mock.market.players.title",
        bodyKey: "mock.market.players.body",
        statusKey: "mock.market.players.status",
        actions: [{ labelKey: "mock.market.players.action", to: "/market/players" }],
      },
    ],
  },
  "/market/players": {
    eyebrowKey: "market.section",
    titleKey: "mock.market.players.title",
    descriptionKey: "mock.market.players.description",
    statusKey: "mock.market.players.pageStatus",
    links: sectionLinks.market,
    sections: [
      {
        titleKey: "mock.market.players.browse.title",
        bodyKey: "mock.market.players.browse.body",
        itemKeys: [
          "mock.market.players.browse.type",
          "mock.market.players.browse.rarity",
          "mock.market.players.browse.element",
          "mock.market.players.browse.price",
        ],
      },
      {
        titleKey: "mock.market.players.mine.title",
        bodyKey: "mock.market.players.mine.body",
        itemKeys: [
          "mock.market.players.mine.item",
          "mock.market.players.mine.price",
          "mock.market.players.mine.status",
          "mock.market.players.mine.cancel",
        ],
      },
    ],
  },
  "/profile": {
    eyebrowKey: "navigation.profile",
    titleKey: "mock.profile.title",
    descriptionKey: "mock.profile.description",
    links: sectionLinks.profile,
    sections: [
      {
        titleKey: "mock.profile.account.title",
        bodyKey: "mock.profile.account.body",
        itemKeys: [
          "mock.profile.account.username",
          "mock.profile.account.providers",
          "mock.profile.account.language",
          "mock.profile.account.settings",
        ],
      },
      {
        titleKey: "progression.title",
        bodyKey: "mock.profile.progressionBody",
        actions: [{ labelKey: "mock.profile.openProgression", to: "/profile/progression" }],
      },
    ],
  },
};

export function viewForPath(path: string): MockView {
  return (
    viewsByPath[path] ?? {
      eyebrowKey: "app.gameApp",
      titleKey: "mock.fallback.title",
      descriptionKey: "mock.fallback.description",
      statusKey: "mock.fallback.status",
      sections: [
        {
          titleKey: "mock.fallback.sectionTitle",
          bodyKey: "mock.fallback.sectionBody",
        },
      ],
    }
  );
}
