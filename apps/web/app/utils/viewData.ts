export type ViewMetric = {
  label: string;
  value: string;
};

export type ViewSection = {
  title: string;
  body: string;
  status?: string;
  items?: string[];
  actions?: { label: string; to: string }[];
};

export type ViewLink = {
  label: string;
  to: string;
};

export type MockView = {
  eyebrow: string;
  title: string;
  description: string;
  status?: string;
  metrics?: ViewMetric[];
  links?: ViewLink[];
  sections: ViewSection[];
};

export const mainNavigation: ViewLink[] = [
  { label: "Home", to: "/" },
  { label: "Battle", to: "/battle" },
  { label: "Forge", to: "/forge" },
  { label: "Inventory", to: "/inventory" },
  { label: "Market", to: "/market" },
  { label: "Profile", to: "/profile" },
];

export const sectionLinks = {
  battle: [
    { label: "Hub", to: "/battle" },
    { label: "Campaign", to: "/battle/campaign" },
    { label: "PvP", to: "/battle/pvp" },
    { label: "History", to: "/battle/history" },
  ],
  pvp: [
    { label: "PvP Hub", to: "/battle/pvp" },
    { label: "Private", to: "/battle/pvp/private" },
    { label: "Casual", to: "/battle/pvp/casual" },
    { label: "Ranked", to: "/battle/pvp/ranked" },
  ],
  forge: [
    { label: "Hub", to: "/forge" },
    { label: "Craft", to: "/forge/craft" },
    { label: "Socket", to: "/forge/socket" },
    { label: "Quality", to: "/forge/quality" },
  ],
  inventory: [
    { label: "Hub", to: "/inventory" },
    { label: "Items", to: "/inventory/items" },
    { label: "Materials", to: "/inventory/materials" },
    { label: "Equipment", to: "/inventory/equipment" },
    { label: "Loadouts", to: "/inventory/loadouts" },
  ],
  market: [
    { label: "Hub", to: "/market" },
    { label: "Game Market", to: "/market/game" },
    { label: "Player Market", to: "/market/players" },
  ],
  profile: [
    { label: "Overview", to: "/profile" },
    { label: "Progression", to: "/profile/progression" },
    { label: "History", to: "/profile/history" },
    { label: "Settings", to: "/profile/settings" },
  ],
} satisfies Record<string, ViewLink[]>;

const notBuilt = "Mock UI - backend workflow not implemented yet.";

export const viewsByPath: Record<string, MockView> = {
  "/battle": {
    eyebrow: "Battle",
    title: "Battle Hub",
    description: "Choose a combat mode and verify that the active loadout is ready.",
    links: sectionLinks.battle,
    metrics: [
      { label: "Campaign", value: "planned" },
      { label: "PvP", value: "locked" },
      { label: "Loadout", value: "required" },
    ],
    sections: [
      {
        title: "Campaign",
        body: "Solo battles against game-owned opponents.",
        status: "Next major gameplay mode.",
        actions: [{ label: "Open Campaign", to: "/battle/campaign" }],
      },
      {
        title: "PvP",
        body: "Private, casual, and ranked multiplayer entry points.",
        status: "Requires authoritative server work.",
        actions: [{ label: "Open PvP", to: "/battle/pvp" }],
      },
      {
        title: "Battle History",
        body: "Review completed matches and replay records.",
        status: "Persistent development records and rewards available.",
        actions: [{ label: "Open History", to: "/battle/history" }],
      },
    ],
  },
  "/battle/campaign": {
    eyebrow: "Battle",
    title: "Campaign",
    description: "Select solo opponents, inspect rewards, and start campaign battles.",
    status: notBuilt,
    links: sectionLinks.battle,
    metrics: [
      { label: "Unlocked", value: "3 mock" },
      { label: "Completed", value: "0" },
      { label: "Next reward", value: "materials" },
    ],
    sections: [
      {
        title: "Ember Trial",
        body: "Starter fire opponent focused on direct damage.",
        items: ["Recommended level 1", "Reward preview: common ring materials", "State: unlocked"],
      },
      {
        title: "Storm Initiate",
        body: "Electric opponent used to test speed and low energy costs.",
        items: ["Recommended level 3", "Reward preview: common gem materials", "State: locked"],
      },
      {
        title: "Frost Gate",
        body: "Ice opponent used to test shields and higher health.",
        items: ["Recommended level 5", "Reward preview: common monster materials", "State: locked"],
      },
    ],
  },
  "/battle/pvp": {
    eyebrow: "Battle",
    title: "PvP",
    description: "Multiplayer entry point for private, casual, and ranked combat.",
    status: notBuilt,
    links: sectionLinks.pvp,
    sections: [
      {
        title: "Private Match",
        body: "Create or join a match by code. This should be the first PvP mode.",
        actions: [{ label: "Open Private Match", to: "/battle/pvp/private" }],
      },
      {
        title: "Casual Match",
        body: "Queue without rank impact after private matches work.",
        actions: [{ label: "Open Casual Match", to: "/battle/pvp/casual" }],
      },
      {
        title: "Ranked Match",
        body: "Competitive mode for later seasons and ranking rules.",
        actions: [{ label: "Open Ranked Match", to: "/battle/pvp/ranked" }],
      },
    ],
  },
  "/battle/pvp/private": {
    eyebrow: "PvP",
    title: "Private Match",
    description: "Create or join a private match by code.",
    status: notBuilt,
    links: sectionLinks.pvp,
    sections: [
      {
        title: "Create Match",
        body: "Generates a private code and waits for another player.",
        items: ["Mock code: BN-2048", "Server authority required", "Reconnect support planned"],
      },
      {
        title: "Join Match",
        body: "Enter a code provided by another player.",
        items: [
          "Code input placeholder",
          "Loadout validation required",
          "Match starts after both players confirm",
        ],
      },
    ],
  },
  "/battle/pvp/casual": {
    eyebrow: "PvP",
    title: "Casual Match",
    description: "Unranked matchmaking mockup.",
    status: notBuilt,
    links: sectionLinks.pvp,
    sections: [
      {
        title: "Queue State",
        body: "Casual queue should come after private match support.",
        items: ["Estimated wait: mock", "Uses active loadout", "No rank impact"],
      },
    ],
  },
  "/battle/pvp/ranked": {
    eyebrow: "PvP",
    title: "Ranked Match",
    description: "Competitive matchmaking and rank overview.",
    status: "Locked mock - ranking rules are not defined yet.",
    links: sectionLinks.pvp,
    sections: [
      {
        title: "Rank Overview",
        body: "Display rank, rating, season progress, and ranked rewards later.",
        items: ["Current rank: unranked", "Season: not started", "Reward rules: pending"],
      },
    ],
  },
  "/battle/history": {
    eyebrow: "Battle",
    title: "Battle History",
    description: "Completed battle records and replay links.",
    status: "Live Prisma-backed history and reward claims.",
    links: sectionLinks.battle,
    sections: [
      {
        title: "Recent Records",
        body: "Lists persisted battle results, reward grants, and replay verification metadata.",
        items: ["Result", "Mode", "Turn count", "Replay/action log link"],
      },
    ],
  },
  "/forge": {
    eyebrow: "Forge",
    title: "Forge Hub",
    description: "Craft items, manage sockets, and improve quality.",
    links: sectionLinks.forge,
    sections: [
      {
        title: "Craft",
        body: "Create rings, gems, monsters, and spells from recipes.",
        actions: [{ label: "Open Craft", to: "/forge/craft" }],
      },
      {
        title: "Socket",
        body: "Add or remove gems from owned rings.",
        actions: [{ label: "Open Socket", to: "/forge/socket" }],
      },
      {
        title: "Quality",
        body: "Spend credits to improve item quality.",
        actions: [{ label: "Open Quality", to: "/forge/quality" }],
      },
    ],
  },
  "/forge/socket": {
    eyebrow: "Forge",
    title: "Socket",
    description: "Manage gems inside rings.",
    links: sectionLinks.forge,
    sections: [
      {
        title: "Ring Selector",
        body: "Select an owned ring and inspect its socket capacity.",
        items: ["Socket 1", "Socket 2", "Socket 3", "Only unsocketed gems should be selectable"],
      },
      {
        title: "Available Gems",
        body: "Gem list will exclude gems already socketed in another ring.",
        items: ["Element", "Rarity", "Enchantment indicator", "Quality"],
      },
    ],
  },
  "/forge/quality": {
    eyebrow: "Forge",
    title: "Quality",
    description: "Improve item quality with credits.",
    links: sectionLinks.forge,
    sections: [
      {
        title: "Improvement Detail",
        body: "Select an item to preview quality cost and projected stat changes.",
        items: ["Current quality", "Next quality", "Credit cost", "Projected combat stats"],
      },
    ],
  },
  "/inventory": {
    eyebrow: "Inventory",
    title: "Inventory Hub",
    description: "Browse owned items, materials, equipment, and saved loadouts.",
    links: sectionLinks.inventory,
    sections: [
      {
        title: "Items",
        body: "Rings, gems, monsters, and spells.",
        actions: [{ label: "Open Items", to: "/inventory/items" }],
      },
      {
        title: "Materials",
        body: "Crafting stock grouped by family and rarity.",
        actions: [{ label: "Open Materials", to: "/inventory/materials" }],
      },
      {
        title: "Equipment",
        body: "Manage up to 10 equipped rings.",
        actions: [{ label: "Open Equipment", to: "/inventory/equipment" }],
      },
      {
        title: "Loadouts",
        body: "Save and activate reusable ring sets.",
        actions: [{ label: "Open Loadouts", to: "/inventory/loadouts" }],
      },
    ],
  },
  "/inventory/equipment": {
    eyebrow: "Inventory",
    title: "Equipment",
    description: "Manage the active equipped ring set.",
    status: notBuilt,
    links: sectionLinks.inventory,
    sections: [
      {
        title: "Current Equipment",
        body: "Up to 10 rings can be equipped for combat.",
        items: [
          "Equipped ring slots",
          "Total speed",
          "Loadout validation",
          "Equip and unequip actions",
        ],
      },
    ],
  },
  "/inventory/loadouts": {
    eyebrow: "Inventory",
    title: "Loadouts",
    description: "Save, edit, and activate ring loadouts.",
    links: sectionLinks.inventory,
    sections: [
      {
        title: "Saved Loadouts",
        body: "Loadout persistence will move from Dev Lab localStorage into the Game App database.",
        items: ["Name", "Ring count", "Summary stats", "Activate/Edit/Delete actions"],
      },
    ],
  },
  "/market": {
    eyebrow: "Market",
    title: "Market Hub",
    description: "Buy and sell through the game economy or future player listings.",
    links: sectionLinks.market,
    sections: [
      {
        title: "Game Market",
        body: "Fixed economy with persistent material buying, selling, and transaction history.",
        status: "Material trading available",
        actions: [{ label: "Open Game Market", to: "/market/game" }],
      },
      {
        title: "Player Market",
        body: "Future player listing system.",
        status: "Later - requires account safety and transaction logs.",
        actions: [{ label: "Open Player Market", to: "/market/players" }],
      },
    ],
  },
  "/market/game": {
    eyebrow: "Market",
    title: "Game Market",
    description: "Buy and sell against the game economy.",
    status: "Material buying and selling available",
    links: sectionLinks.market,
    sections: [
      {
        title: "Buy Materials",
        body: "Persistent material purchases against the fixed game economy.",
        items: ["Material filters", "Unit price", "Quantity selector", "Credits preview"],
      },
      {
        title: "Sell Resources",
        body: "Sell owned materials for credits with persistent transaction history.",
        items: ["Owned stock validation", "Sell price", "Quantity", "Transaction preview"],
      },
    ],
  },
  "/market/players": {
    eyebrow: "Market",
    title: "Player Market",
    description: "Browse and create player listings.",
    status: "Later mock - do not implement real trades before transaction safety exists.",
    links: sectionLinks.market,
    sections: [
      {
        title: "Browse Listings",
        body: "Future listing search and buying flow.",
        items: ["Type filter", "Rarity filter", "Element filter", "Price range"],
      },
      {
        title: "My Listings",
        body: "Future listing management.",
        items: ["Listed item", "Price", "Status", "Cancel listing"],
      },
    ],
  },
  "/profile": {
    eyebrow: "Profile",
    title: "Profile Overview",
    description: "Player identity, account resources, and shortcuts.",
    links: sectionLinks.profile,
    sections: [
      {
        title: "Account",
        body: "OAuth-first account model is planned.",
        items: ["Username", "Linked providers", "Language", "Account settings"],
      },
      {
        title: "Progression",
        body: "Hero XP, level, and campaign progress.",
        actions: [{ label: "Open Progression", to: "/profile/progression" }],
      },
    ],
  },
  "/profile/progression": {
    eyebrow: "Profile",
    title: "Progression",
    description: "Hero level, XP, unlocks, and campaign milestones.",
    status: notBuilt,
    links: sectionLinks.profile,
    sections: [
      {
        title: "Hero XP",
        body: "Hero XP is persisted by battle rewards; the dedicated progression view remains to be implemented.",
        items: ["Current level", "Current XP", "Next level", "Unlocks"],
      },
    ],
  },
  "/profile/history": {
    eyebrow: "Profile",
    title: "Match History",
    description: "Personal history of battles and rewards.",
    status: "Live Prisma-backed battle and reward history.",
    links: sectionLinks.profile,
    sections: [
      {
        title: "History List",
        body: "Reuses persisted battle records and supports outstanding reward claims.",
        items: ["Mode", "Result", "Rewards", "Replay link"],
      },
    ],
  },
  "/profile/settings": {
    eyebrow: "Profile",
    title: "Settings",
    description: "Account, localization, audio, and display preferences.",
    status: notBuilt,
    links: sectionLinks.profile,
    sections: [
      {
        title: "Preferences",
        body: "Settings mockup until account persistence and localization are wired.",
        items: ["Language", "Audio", "Display density", "Account links"],
      },
    ],
  },
};

export function viewForPath(path: string): MockView {
  if (path.startsWith("/battle/live/")) {
    const battleId = path.split("/").at(-1) ?? "mock-battle";
    return {
      eyebrow: "Battle",
      title: "Active Battle",
      description: `Player-facing battle screen mock for ${battleId}.`,
      status: "Mock UI - server battle state is not implemented yet.",
      links: sectionLinks.battle,
      metrics: [
        { label: "Opponent", value: "Mock Rival" },
        { label: "Turn", value: "Player" },
        { label: "Energy", value: "3/8" },
      ],
      sections: [
        {
          title: "Battlefield",
          body: "The final Game App battle screen should hide opponent rings unless a future reveal rule exposes them.",
          items: [
            "Opponent hero",
            "Opponent monsters",
            "Player hero",
            "Player monsters",
            "Player ring row",
          ],
        },
        {
          title: "Action Context",
          body: "Actions should follow the Dev Lab prepare-action-then-target flow, without debug panels.",
          items: ["Selected ring or monster", "Legal target highlights", "End turn"],
        },
      ],
    };
  }

  return (
    viewsByPath[path] ?? {
      eyebrow: "Game App",
      title: "View Not Defined",
      description: "This route exists through the catch-all mock renderer but has no proposal yet.",
      status: "Missing view proposal.",
      sections: [
        {
          title: "Next Step",
          body: "Add this route to viewData.ts before implementing real behavior.",
        },
      ],
    }
  );
}
