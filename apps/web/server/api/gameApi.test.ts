import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { execFileSync } from "node:child_process";
import { IncomingMessage, ServerResponse } from "node:http";
import { Socket } from "node:net";
import { PrismaClient } from "@prisma/client";
import { createEvent, type H3Event } from "h3";
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { settleRankedBattleRating } from "../utils/rankedRatingSettlement";
import { runRankedSeasonMaintenance } from "../utils/rankedSeasonMaintenance";
import { runAsPlayer } from "../utils/playerContext";

type TestEvent = {
  body?: unknown;
  context?: {
    params?: Record<string, string>;
  };
};

type ApiHandler = (event: TestEvent) => Promise<unknown> | unknown;
type H3ApiHandler = (event: H3Event) => Promise<unknown> | unknown;

type TestGlobal = typeof globalThis & {
  createError?: (input: { statusCode: number; statusMessage: string }) => Error;
  defineEventHandler?: <T extends ApiHandler>(handler: T) => T;
  getRouterParam?: (event: TestEvent, name: string) => string | undefined;
  readBody?: <T>(event: TestEvent) => Promise<T>;
};

type PlayerApiResponse = {
  content: { version: string; checksum: string };
  player: {
    id: string;
    displayName: string;
    credits: number;
    experience: number;
    level: number;
    maxHealth: number;
    progression: {
      nextLevelExperience: number | null;
      experienceRemaining: number;
      progressPercent: number;
    };
  };
  materials: { id: string; quantity: number; contentVersion: string }[];
  inventory: {
    id: string;
    type: string;
    definitionId: string;
    contentVersion: string;
    level: number;
    bonusPercent: number;
    damage?: number;
    baseDamage?: number;
    ringDamage?: number;
    gemDamage?: number;
    spellDamage?: number;
    monsterDamage?: number;
    energyCost?: number;
    baseEnergyCost?: number;
    health?: number;
    cooldown?: number;
    baseCooldown?: number;
    baseSpeed?: number;
    speed?: number;
    energyPenalty?: number;
    cooldownPenalty?: number;
    socketedRing?: null | {
      id: string;
      type: string;
      definitionId: string;
      label: string;
    };
    enchantedGem?: null | {
      id: string;
      type: string;
      definitionId: string;
      label: string;
    };
    gems?: EquipmentRingResponse["gems"];
    progression: { nextLevelExperience: number | null; progressPercent: number };
    enchantment?: null | { id: string; type: "spell" | "monster" };
    enchantedGemId?: string | null;
    enchantedGemLabel?: string | null;
  }[];
  recipes: { id: string; canCraft: boolean }[];
};

type CraftApiResponse = {
  crafted: { id: string; type: string; definitionId: string };
  state: PlayerApiResponse;
};

type EquipmentApiResponse = {
  maxEquippedRings: number;
  equippedRings: EquipmentRingResponse[];
  availableRings: {
    id: string;
    definitionId: string;
    equipped: boolean;
    baseDamage: number;
    baseSpeed: number;
    damage: number;
    energyCost: number;
    cooldown: number;
  }[];
  summary: {
    ringCount: number;
    totalSpeed: number;
    totalDamage: number;
    totalRingDamage: number;
    totalGemDamage: number;
    totalSpellDamage: number;
    totalMonsterDamage: number;
    totalEnergyPenalty: number;
    totalCooldownPenalty: number;
  };
};

type EquipmentRingResponse = {
  id: string;
  definitionId: string;
  equipped: boolean;
  slotIndex: number | null;
  socketCount: number | null;
  baseDamage: number;
  baseEnergyCost: number;
  baseCooldown: number;
  baseSpeed: number;
  speed: number;
  damage: number;
  ringDamage: number;
  gemDamage: number;
  spellDamage: number;
  monsterDamage: number;
  energyCost: number;
  cooldown: number;
  energyPenalty: number;
  cooldownPenalty: number;
  gems: {
    id: string;
    definitionId: string;
    damage: number;
    energyPenalty: number;
    cooldownPenalty: number;
    speed: number;
    enchantment: null | {
      id: string;
      type: "spell" | "monster";
      definitionId: string;
      damage: number;
      energyPenalty: number;
      cooldownPenalty: number;
      speed: number;
    };
  }[];
};

type SocketRingResponse = EquipmentRingResponse & {
  nextSocketCount: number | null;
  socketImprovementCost: number | null;
  canImproveSockets: boolean;
};

type LoadoutsApiResponse = {
  player: {
    activeLoadoutId: string | null;
  };
  currentEquipment: {
    rings: EquipmentRingResponse[];
  };
  loadouts: {
    id: string;
    name: string;
    active: boolean;
    ringCount: number;
    rings: EquipmentRingResponse[];
  }[];
};

type SocketApiResponse = {
  player: {
    credits: number;
  };
  rings: SocketRingResponse[];
  gems: {
    id: string;
    definitionId: string;
    damage: number;
    socketedRingId: string | null;
    socketIndex: number | null;
    enchantment: null | {
      id: string;
      type: "spell" | "monster";
      definitionId: string;
      damage: number;
    };
  }[];
  enchantmentTargets: {
    id: string;
    type: "spell" | "monster";
    definitionId: string;
    damage: number;
    health?: number;
    cooldown?: number;
    energyPenalty: number;
    cooldownPenalty: number;
    baseSpeed: number;
    speed: number;
    enchantedGemId: string | null;
  }[];
};

type QualityApiResponse = {
  player: {
    credits: number;
  };
  qualityStep: number;
  items: {
    id: string;
    type: string;
    definitionId: string;
    quality: number;
    nextQuality: number;
    cost: number | null;
    canImprove: boolean;
    stats: {
      label: string;
      current: number;
      next: number;
    }[];
  }[];
};

type GameMarketApiResponse = {
  content: { version: string; checksum: string };
  player: {
    id: string;
    credits: number;
  };
  materials: {
    id: string;
    rarity: string;
    quantity: number;
    contentVersion: string;
    buyPrice: number;
    sellPrice: number;
  }[];
  items: {
    id: string;
    type: string;
    definitionId: string;
    label: string;
    recipeId: string | null;
    recipeValue: number | null;
    sellPrice: number | null;
    canSell: boolean;
    blockedReason: string | null;
    ingredients: {
      materialId: string;
      quantity: number;
      unitPrice: number;
    }[];
  }[];
  transactions: {
    id: string;
    requestId: string;
    action: "buy" | "sell";
    resourceType: "material" | "ring" | "gem" | "monster" | "spell";
    resourceId: string;
    resourceDefinitionId: string;
    resourceLabel: string;
    quantity: number;
    unitPrice: number;
    creditsDelta: number;
    contentVersion: string;
    createdAt: string;
  }[];
};

type ProfileSettingsApiResponse = {
  profile: {
    id: string;
    username: string;
    displayName: string;
    visibility: "public" | "private";
    createdAt: string;
    lastActiveAt: string;
  };
  preferences: {
    locale: "en" | "fr";
    theme: "system" | "dark" | "light";
    reducedMotion: boolean;
    interfaceDensity: "comfortable" | "compact";
    muted: boolean;
    masterVolume: number;
    musicVolume: number;
    effectsVolume: number;
    updatedAt: string | null;
  };
};

type BattleHistoryApiResponse = {
  player: {
    id: string;
    credits: number;
    experience: number;
    level: number;
  };
  records: {
    id: string;
    mode: string;
    outcome: "win" | "draw" | "loss";
    actionCount: number;
    finalStateChecksum: string | null;
    replayAvailable: boolean;
    summary: BattleResultSummaryApiResponse | null;
    reward: null | {
      id: string;
      status: "unclaimed" | "claimed";
      credits: number;
      heroExperience: number;
      claimedAt: string | null;
      materials: { materialId: string; quantity: number }[];
      items: { inventoryItemId: string; experience: number }[];
    };
  }[];
};

type BattleResultSummaryApiResponse = {
  turnCount: number;
  actionCount: number;
  players: { playerId: string; username: string; damage: number; actionCount: number }[];
  ringsUsed: { id: string; label: string; playerId: string; count: number }[];
  spellsCast: { id: string; label: string; playerId: string; count: number }[];
  monstersSummoned: { id: string; label: string; playerId: string; count: number }[];
  monstersUsed: { id: string; label: string; playerId: string; count: number }[];
  loadouts: {
    playerId: string;
    username: string;
    level: number;
    rings: LiveBattleRingApiResponse[];
  }[];
};

type DevelopmentBattleResultApiResponse = {
  recordId: string;
  state: BattleHistoryApiResponse;
};

type LiveBattleApiResponse = {
  id: string;
  mode: string;
  status: "choosingFirstPlayer" | "active" | "finished";
  activePlayerId: string | null;
  actionCount: number;
  openingDuelDeadlineAt: string | null;
  openingDuelChoiceSubmitted: boolean;
  openingDuelRound: number;
  viewer: {
    id: string;
    username: string;
    energy: { current: number; maxForTurn: number; turnCount: number };
    rings?: LiveBattleRingApiResponse[];
  };
  opponent: {
    id: string;
    username: string;
    rings?: LiveBattleRingApiResponse[];
  };
  result: null | { type: "draw" } | { type: "winner"; winnerId: string; loserId: string };
  reward: null | {
    id: string;
    status: "unclaimed" | "claimed";
    credits: number;
    heroExperience: number;
    materials: { materialId: string; quantity: number }[];
    items: { inventoryItemId: string; experience: number }[];
  };
  summary: BattleResultSummaryApiResponse | null;
};

type LiveBattleRingApiResponse = {
  id: string;
  definitionId: string;
  damage: number;
  energyCost: number;
  cooldown: number;
  currentCooldown: number;
  gems: {
    id: string;
    definitionId: string;
    damage: number;
    energyPenalty: number;
    cooldownPenalty: number;
    enchantment?: {
      type: "monster" | "spell";
      definitionId: string;
    } | null;
  }[];
};

type LiveBattleActionApiResponse = {
  battle: LiveBattleApiResponse;
  events: { type: string }[];
};

type CampaignApiResponse = {
  player: { id: string; level: number; activeLoadoutId: string | null };
  progress: { completedCount: number; unlockedCount: number; totalCount: number };
  opponents: {
    id: string;
    label: string;
    status: "available" | "locked" | "completed";
    victoryCount: number;
    prerequisite: { id: string; label: string } | null;
    rings: {
      definitionId: string;
      gems: { definitionId: string; enchantment: { definitionId: string } | null }[];
    }[];
    firstClearReward: {
      credits: number;
      materials: { materialId: string; label: string; quantity: number }[];
    };
  }[];
};

type PrivateMatchApiResponse = {
  playerId: string;
  match: null | {
    id: string;
    code: string;
    status: string;
    battleId: string | null;
    turnDeadlineAt: string | null;
    openingDuelDeadlineAt: string | null;
    participants: {
      isCurrentPlayer: boolean;
      displayName: string;
      level: number;
      rank: { tier: string; division: number | null } | null;
      slot: string;
      ready: boolean;
      loadoutId?: string | null;
      loadoutName?: string | null;
      ringCount?: number;
    }[];
  };
  loadouts: { id: string; name: string; ringCount: number }[];
};

type CasualMatchmakingApiResponse = {
  playerId: string;
  status: "idle" | "searching" | "matched";
  activeLoadout: { id: string; name: string; ringCount: number } | null;
  queue: { id: string; joinedAt: string; expiresAt: string } | null;
  match: { battleId: string; opponent: PvpOpponentApiResponse } | null;
  recentBattleId: string | null;
};

type RankedMatchmakingApiResponse = {
  playerId: string;
  status: "unavailable" | "idle" | "searching" | "accepting" | "matched";
  season: { id: string; endsAt: string } | null;
  rating: { value: number; placementMatches: number } | null;
  queue: { id: string; ratingRange: number; heroLevelRange: number } | null;
  proposal: {
    pairingKey: string;
    accepted: boolean;
    opponent: PvpOpponentApiResponse;
  } | null;
  match: { battleId: string; opponent: PvpOpponentApiResponse } | null;
  recentBattleId: string | null;
  discipline: { missedAcceptances: number; lockedUntil: string | null };
};

type PvpOpponentApiResponse = {
  displayName: string;
  level: number;
  rank: { tier: string; division: number | null } | null;
  ready: boolean;
};

function expectLimitedPvpOpponent(
  opponent: PvpOpponentApiResponse,
  expected: Partial<PvpOpponentApiResponse>,
): void {
  expect(opponent).toMatchObject(expected);
  expect(Object.keys(opponent).sort()).toEqual(["displayName", "level", "rank", "ready"]);
  expect(JSON.stringify(opponent)).not.toMatch(/loadout|ringCount|ringItem|inventory/i);
}

function expectHiddenPvpLiveLoadout(battle: LiveBattleApiResponse, mode: string): void {
  expect(battle.mode).toBe(mode);
  expect(battle.viewer.rings?.length).toBeGreaterThan(0);
  expect(battle.opponent.rings).toBeUndefined();
  expect(battle.summary).toBeNull();
}

function expectCompletePvpResultLoadouts(
  battle: LiveBattleApiResponse,
  expectedPlayerIds: readonly string[],
): void {
  expect(battle.status).toBe("finished");
  expect(battle.summary?.loadouts.map((loadout) => loadout.playerId).sort()).toEqual(
    [...expectedPlayerIds].sort(),
  );
  expect(battle.summary?.loadouts.every((loadout) => loadout.rings.length > 0)).toBe(true);
}

type RankedLeaderboardApiResponse = {
  season: { id: string; endsAt: string } | null;
  top: {
    position: number;
    playerId: string;
    username: string | null;
    isCurrentPlayer: boolean;
    rating: number;
    deviation: number;
    standing: { tier: string; division: number | null };
    wins: number;
    losses: number;
    draws: number;
  }[];
  current: RankedLeaderboardApiResponse["top"][number] | null;
  nearby: RankedLeaderboardApiResponse["top"];
};

type PublicPvpProfileApiResponse = {
  profile: { playerId: string; displayName: string; isCurrentPlayer: boolean };
  season: { id: string; endsAt: string } | null;
  rating: {
    value: number | null;
    placementMatches: number;
    placementTarget: number;
    standing: { tier: string; division: number | null } | null;
    peakRating: number | null;
    peakStanding: { tier: string; division: number | null } | null;
    wins: number;
    losses: number;
    matchCount: number;
  } | null;
};

type PlayerMarketBrowseApiResponse = {
  createOptions: {
    activeListingCount: number;
    maxActiveListings: number;
    items: { inventoryItemId: string; bundleItemCount: number }[];
    materials: { materialId: string; quantity: number }[];
  };
  pagination: { page: number; pageSize: number; total: number; totalPages: number };
  listings: {
    id: string;
    definitionId: string;
    price: number;
    isOwnListing: boolean;
    nameKey: string | null;
    label: string;
  }[];
};

type PlayerMarketHistoryApiResponse = {
  filter: { role: "all" | "buyer" | "seller" };
  pagination: { page: number; pageSize: number; total: number; totalPages: number };
  transactions: {
    id: string;
    direction: "purchase" | "sale";
    definitionId: string;
    price: number;
    soldAt: string;
    bundleItemCount: number;
  }[];
};

const projectRoot = fileURLToPath(new URL("../../../..", import.meta.url));
const tempDir = mkdtempSync(join(tmpdir(), "battleness-api-test-"));
const testDatabasePath = join(tempDir, "battleness.test.sqlite").replace(/\\/g, "/");
const testDatabaseUrl = `file:${testDatabasePath}`;

let playerHandler: ApiHandler;
let craftHandler: ApiHandler;
let equipmentGetHandler: ApiHandler;
let equipmentPostHandler: ApiHandler;
let loadoutsGetHandler: ApiHandler;
let loadoutsPostHandler: ApiHandler;
let socketGetHandler: ApiHandler;
let socketPostHandler: ApiHandler;
let qualityGetHandler: ApiHandler;
let qualityPostHandler: ApiHandler;
let marketGameGetHandler: ApiHandler;
let marketGamePostHandler: ApiHandler;
let marketPlayersGetHandler: H3ApiHandler;
let marketPlayersPostHandler: H3ApiHandler;
let marketPlayersDeleteHandler: H3ApiHandler;
let marketPlayersPurchaseHandler: H3ApiHandler;
let marketPlayersHistoryHandler: H3ApiHandler;
let battleHistoryGetHandler: ApiHandler;
let campaignGetHandler: ApiHandler;
let campaignStartHandler: ApiHandler;
let privateMatchGetHandler: H3ApiHandler;
let privateMatchPostHandler: H3ApiHandler;
let casualMatchGetHandler: H3ApiHandler;
let casualMatchPostHandler: H3ApiHandler;
let rankedMatchGetHandler: H3ApiHandler;
let rankedMatchPostHandler: H3ApiHandler;
let rankedLeaderboardGetHandler: H3ApiHandler;
let publicPvpProfileGetHandler: H3ApiHandler;
let battleStartHandler: ApiHandler;
let battleLiveGetHandler: ApiHandler;
let battleActionHandler: ApiHandler;
let battleRewardClaimHandler: ApiHandler;
let developmentBattleResultHandler: ApiHandler;
let profileSettingsGetHandler: ApiHandler;
let profileSettingsPostHandler: ApiHandler;
let resetHandler: ApiHandler;
let authSessionHandler: H3ApiHandler;
let authLogoutHandler: H3ApiHandler;
let googleStartHandler: H3ApiHandler;
let googleCallbackHandler: H3ApiHandler;
let createPlayerSession: (
  event: H3Event,
  playerId: string,
) => Promise<{ id: string; player: { id: string } }>;
let disconnectGameStateClientForTests: () => Promise<void>;
let ensurePlayerOnboarding: (client: PrismaClient) => Promise<void>;
let prisma: PrismaClient;

describe("Nuxt Game App APIs", () => {
  beforeAll(async () => {
    installNuxtHandlerGlobals();
    process.env.BATTLENESS_DATABASE_URL = testDatabaseUrl;
    pushPrismaSchemaToTestDatabase();
    prisma = new PrismaClient({
      datasources: {
        db: { url: testDatabaseUrl },
      },
    });

    const [
      playerModule,
      craftModule,
      equipmentGetModule,
      equipmentPostModule,
      loadoutsGetModule,
      loadoutsPostModule,
      socketGetModule,
      socketPostModule,
      qualityGetModule,
      qualityPostModule,
      marketGameGetModule,
      marketGamePostModule,
      marketPlayersGetModule,
      marketPlayersPostModule,
      marketPlayersDeleteModule,
      marketPlayersPurchaseModule,
      marketPlayersHistoryModule,
      battleHistoryGetModule,
      campaignGetModule,
      campaignStartModule,
      privateMatchGetModule,
      privateMatchPostModule,
      casualMatchGetModule,
      casualMatchPostModule,
      rankedMatchGetModule,
      rankedMatchPostModule,
      rankedLeaderboardGetModule,
      publicPvpProfileGetModule,
      battleStartModule,
      battleLiveGetModule,
      battleActionModule,
      battleRewardClaimModule,
      developmentBattleResultModule,
      profileSettingsGetModule,
      profileSettingsPostModule,
      resetModule,
      authSessionModule,
      authLogoutModule,
      authSessionUtilityModule,
      googleStartModule,
      googleCallbackModule,
      gameStateModule,
    ] = await Promise.all([
      import("./player.get"),
      import("./forge/craft.post"),
      import("./inventory/equipment.get"),
      import("./inventory/equipment.post"),
      import("./inventory/loadouts.get"),
      import("./inventory/loadouts.post"),
      import("./forge/socket.get"),
      import("./forge/socket.post"),
      import("./forge/quality.get"),
      import("./forge/quality.post"),
      import("./market/game.get"),
      import("./market/game.post"),
      import("./market/players.get"),
      import("./market/players.post"),
      import("./market/players/[listingId].delete"),
      import("./market/players/[listingId]/purchase.post"),
      import("./market/players/history.get"),
      import("./battle/history.get"),
      import("./campaign.get"),
      import("./battle/campaign/start.post"),
      import("./pvp/private.get"),
      import("./pvp/private.post"),
      import("./pvp/casual.get"),
      import("./pvp/casual.post"),
      import("./pvp/ranked.get"),
      import("./pvp/ranked.post"),
      import("./pvp/ranked/leaderboard.get"),
      import("./pvp/profile/[playerId].get"),
      import("./battle/start.post"),
      import("./battle/live/[battleId].get"),
      import("./battle/live/[battleId]/actions.post"),
      import("./battle/rewards/claim.post"),
      import("./dev/battle-result.post"),
      import("./profile/settings.get"),
      import("./profile/settings.post"),
      import("./dev/reset.post"),
      import("./auth/session.get"),
      import("./auth/logout.post"),
      import("../utils/authSession"),
      import("./auth/google.get"),
      import("./auth/google/callback.get"),
      import("../utils/gameState"),
    ]);

    playerHandler = playerModule.default;
    craftHandler = craftModule.default;
    equipmentGetHandler = equipmentGetModule.default;
    equipmentPostHandler = equipmentPostModule.default;
    loadoutsGetHandler = loadoutsGetModule.default;
    loadoutsPostHandler = loadoutsPostModule.default;
    socketGetHandler = socketGetModule.default;
    socketPostHandler = socketPostModule.default;
    qualityGetHandler = qualityGetModule.default;
    qualityPostHandler = qualityPostModule.default;
    marketGameGetHandler = marketGameGetModule.default;
    marketGamePostHandler = marketGamePostModule.default;
    marketPlayersGetHandler = marketPlayersGetModule.default;
    marketPlayersPostHandler = marketPlayersPostModule.default;
    marketPlayersDeleteHandler = marketPlayersDeleteModule.default;
    marketPlayersPurchaseHandler = marketPlayersPurchaseModule.default;
    marketPlayersHistoryHandler = marketPlayersHistoryModule.default;
    battleHistoryGetHandler = battleHistoryGetModule.default;
    campaignGetHandler = campaignGetModule.default;
    campaignStartHandler = campaignStartModule.default;
    privateMatchGetHandler = privateMatchGetModule.default;
    privateMatchPostHandler = privateMatchPostModule.default;
    casualMatchGetHandler = casualMatchGetModule.default;
    casualMatchPostHandler = casualMatchPostModule.default;
    rankedMatchGetHandler = rankedMatchGetModule.default;
    rankedMatchPostHandler = rankedMatchPostModule.default;
    rankedLeaderboardGetHandler = rankedLeaderboardGetModule.default;
    publicPvpProfileGetHandler = publicPvpProfileGetModule.default;
    battleStartHandler = battleStartModule.default;
    battleLiveGetHandler = battleLiveGetModule.default;
    battleActionHandler = battleActionModule.default;
    battleRewardClaimHandler = battleRewardClaimModule.default;
    developmentBattleResultHandler = developmentBattleResultModule.default;
    profileSettingsGetHandler = profileSettingsGetModule.default;
    profileSettingsPostHandler = profileSettingsPostModule.default;
    resetHandler = resetModule.default;
    authSessionHandler = authSessionModule.default;
    authLogoutHandler = authLogoutModule.default;
    createPlayerSession = authSessionUtilityModule.createPlayerSession;
    googleStartHandler = googleStartModule.default;
    googleCallbackHandler = googleCallbackModule.default;
    disconnectGameStateClientForTests = gameStateModule.disconnectGameStateClientForTests;
    ensurePlayerOnboarding = gameStateModule.ensurePlayerOnboarding;
  }, 30_000);

  beforeEach(async () => {
    await resetHandler({});
  }, 30_000);

  afterAll(async () => {
    await prisma?.$disconnect();
    await disconnectGameStateClientForTests?.();
    rmSync(tempDir, { force: true, recursive: true });
  });

  it("returns seeded player state", async () => {
    const response = (await playerHandler({})) as PlayerApiResponse;

    expect(response.content.version).toBe("production-items-v2");
    expect(response.content.checksum).toMatch(/^[a-f0-9]{64}$/);
    expect(response.player).toMatchObject({ id: "devPlayer", credits: 1_000_000 });
    expect(response.materials).toHaveLength(70);
    expect(response.inventory).toHaveLength(0);
    expect(response.recipes).toHaveLength(219);
    expect(response.recipes.every((recipe) => recipe.canCraft)).toBe(true);
    expect(
      response.materials.every((material) => material.contentVersion === "production-items-v2"),
    ).toBe(true);

    const release = await prisma.contentRelease.findUniqueOrThrow({
      where: { version: "production-items-v2" },
    });
    expect(release.checksum).toBe(response.content.checksum);
    expect(JSON.parse(release.manifestJson)).toMatchObject({
      materials: 70,
      recipes: 219,
      spells: 42,
    });
  });

  it("resets obsolete local development gameplay before validating the new content", async () => {
    await prisma.player.update({
      where: { id: "devPlayer" },
      data: { onboardingVersion: 0 },
    });
    await prisma.inventoryItem.createMany({
      data: [
        {
          id: "devPlayer.ring.emberLoop.crafted.1",
          playerId: "devPlayer",
          type: "ring",
          definitionId: "emberLoop",
          contentVersion: "prototype-6",
          experience: 0,
          quality: 0,
          socketCount: 1,
        },
        {
          id: "devPlayer.gem.rubyShard.crafted.2",
          playerId: "devPlayer",
          type: "gem",
          definitionId: "rubyShard",
          contentVersion: "prototype-6",
          experience: 0,
          quality: 0,
        },
      ],
    });

    const response = (await playerHandler({})) as PlayerApiResponse;
    const player = await prisma.player.findUniqueOrThrow({
      where: { id: "devPlayer" },
      include: { inventoryItems: true, materialStock: true },
    });

    expect(response.inventory).toEqual([]);
    expect(response.player.credits).toBe(1_000_000);
    expect(player.onboardingVersion).toBe(3);
    expect(player.inventoryItems).toEqual([]);
    expect(player.materialStock).toHaveLength(70);
  });

  it("persists player-market listings, escrow locks, and idempotent mutation journals", async () => {
    const buyerId = "playerMarketBuyer";
    const ringId = "playerMarket.ring";
    const gemId = "playerMarket.gem";
    const spellId = "playerMarket.spell";
    await prisma.player.create({
      data: { id: buyerId, username: "Player Market Buyer", credits: 10_000 },
    });
    await prisma.inventoryItem.createMany({
      data: [
        {
          id: ringId,
          playerId: "devPlayer",
          type: "ring",
          definitionId: "ashenLoop",
          contentVersion: "production-items-v2",
          experience: 0,
          quality: 25,
          socketCount: 1,
        },
        {
          id: gemId,
          playerId: "devPlayer",
          type: "gem",
          definitionId: "cinderShard",
          contentVersion: "production-items-v2",
          experience: 0,
          quality: 10,
        },
        {
          id: spellId,
          playerId: "devPlayer",
          type: "spell",
          definitionId: "fireLance",
          contentVersion: "production-items-v2",
          experience: 0,
          quality: 5,
        },
      ],
    });
    await prisma.ringSocket.create({
      data: { playerId: "devPlayer", ringItemId: ringId, gemItemId: gemId, socketIndex: 0 },
    });
    await prisma.gemEnchantment.create({
      data: {
        playerId: "devPlayer",
        gemItemId: gemId,
        targetItemId: spellId,
        targetType: "spell",
      },
    });

    const listing = await prisma.playerMarketListing.create({
      data: {
        id: "playerMarket.listing.ring",
        sellerId: "devPlayer",
        status: "active",
        resourceType: "ring",
        definitionId: "ashenLoop",
        rarity: "common",
        element: "fire",
        level: 0,
        quality: 25,
        quantity: 1,
        price: 2_500,
        rootItemId: ringId,
        itemSnapshotJson: JSON.stringify({ rootItemId: ringId, itemIds: [ringId, gemId, spellId] }),
        contentVersion: "production-items-v2",
        escrowItems: {
          create: [
            { inventoryItemId: ringId, role: "root" },
            { inventoryItemId: gemId, role: "socketedGem" },
            { inventoryItemId: spellId, role: "enchantment" },
          ],
        },
        mutations: {
          create: {
            requestId: "playerMarket.create.ring",
            playerId: "devPlayer",
            action: "create",
            payloadHash: "create-ring-payload",
          },
        },
      },
      include: { seller: true, rootItem: true, escrowItems: true, mutations: true },
    });

    expect(listing).toMatchObject({
      status: "active",
      seller: { id: "devPlayer" },
      buyerId: null,
      rootItem: { id: ringId },
      quantity: 1,
      price: 2_500,
      soldAt: null,
      cancelledAt: null,
    });
    expect(listing.escrowItems.map((item) => item.inventoryItemId).sort()).toEqual(
      [ringId, gemId, spellId].sort(),
    );
    expect(listing.mutations).toEqual([
      expect.objectContaining({ requestId: "playerMarket.create.ring", action: "create" }),
    ]);

    const materialListing = await prisma.playerMarketListing.create({
      data: {
        id: "playerMarket.listing.material",
        sellerId: "devPlayer",
        resourceType: "material",
        definitionId: "aluminium",
        rarity: "common",
        quantity: 12,
        price: 600,
        contentVersion: "production-items-v2",
      },
    });
    expect(materialListing).toMatchObject({
      status: "active",
      rootItemId: null,
      itemSnapshotJson: null,
      quantity: 12,
    });

    await expect(
      prisma.playerMarketEscrowItem.create({
        data: {
          listingId: materialListing.id,
          inventoryItemId: ringId,
          role: "root",
        },
      }),
    ).rejects.toMatchObject({ code: "P2002" });
    await expect(
      prisma.playerMarketMutation.create({
        data: {
          requestId: "playerMarket.create.ring",
          playerId: buyerId,
          listingId: materialListing.id,
          action: "buy",
          payloadHash: "different-payload",
        },
      }),
    ).rejects.toMatchObject({ code: "P2002" });

    await prisma.playerMarketListing.deleteMany({
      where: { id: { in: [listing.id, materialListing.id] } },
    });
    await prisma.player.delete({ where: { id: buyerId } });
  });

  it("browses active player-market listings with validated anonymous filters", async () => {
    const sellerId = "playerMarketSeller";
    await prisma.player.create({
      data: { id: sellerId, username: "Hidden Market Seller", credits: 0 },
    });
    await prisma.playerMarketListing.createMany({
      data: [
        {
          id: "browse.market.seller.rare",
          sellerId,
          resourceType: "material",
          definitionId: "gold",
          rarity: "rare",
          quantity: 5,
          price: 300,
          contentVersion: "production-items-v2",
          createdAt: new Date("2026-07-15T10:00:00.000Z"),
        },
        {
          id: "browse.market.own.rare",
          sellerId: "devPlayer",
          resourceType: "material",
          definitionId: "silver",
          rarity: "rare",
          quantity: 3,
          price: 200,
          contentVersion: "production-items-v2",
          createdAt: new Date("2026-07-15T11:00:00.000Z"),
        },
        {
          id: "browse.market.common",
          sellerId,
          resourceType: "ring",
          definitionId: "ashenLoop",
          rarity: "common",
          element: "fire",
          level: 4,
          quality: 20,
          price: 100,
          itemSnapshotJson: "{}",
          contentVersion: "production-items-v2",
          createdAt: new Date("2026-07-15T12:00:00.000Z"),
        },
        {
          id: "browse.market.sold",
          sellerId,
          buyerId: "devPlayer",
          status: "sold",
          resourceType: "material",
          definitionId: "platinum",
          rarity: "rare",
          quantity: 1,
          price: 150,
          contentVersion: "production-items-v2",
          soldAt: new Date("2026-07-15T13:00:00.000Z"),
        },
      ],
    });

    const login = createH3TestEvent();
    await createPlayerSession(login.event, "devPlayer");
    const cookie = responseCookie(login.response, "battleness_session");
    const firstPage = (await marketPlayersGetHandler(
      createH3TestEvent(
        cookie,
        undefined,
        "/api/market/players?resourceType=material&rarity=rare&minPrice=100&maxPrice=500&sort=priceAsc&page=1&pageSize=1",
      ).event,
    )) as PlayerMarketBrowseApiResponse;

    expect(firstPage).toMatchObject({
      pagination: { page: 1, pageSize: 1, total: 2, totalPages: 2 },
      listings: [
        {
          id: "browse.market.own.rare",
          definitionId: "silver",
          price: 200,
          isOwnListing: true,
          nameKey: expect.any(String),
        },
      ],
    });
    expect(JSON.stringify(firstPage)).not.toContain(sellerId);
    expect(JSON.stringify(firstPage)).not.toContain("Hidden Market Seller");

    const secondPage = (await marketPlayersGetHandler(
      createH3TestEvent(
        cookie,
        undefined,
        "/api/market/players?resourceType=material&rarity=rare&sort=priceAsc&page=2&pageSize=1",
      ).event,
    )) as PlayerMarketBrowseApiResponse;
    expect(secondPage.listings).toEqual([
      expect.objectContaining({
        id: "browse.market.seller.rare",
        price: 300,
        isOwnListing: false,
      }),
    ]);

    await expect(
      marketPlayersGetHandler(
        createH3TestEvent(cookie, undefined, "/api/market/players?minPrice=500&maxPrice=100").event,
      ),
    ).rejects.toMatchObject({
      statusCode: 400,
      statusMessage: "minPrice cannot exceed maxPrice.",
    });

    await prisma.playerMarketListing.deleteMany({
      where: { sellerId: { in: ["devPlayer", sellerId] } },
    });
    await prisma.player.delete({ where: { id: sellerId } });
  });

  it("creates item bundles and material listings idempotently", async () => {
    const ringId = "createMarket.ring";
    const gemId = "createMarket.gem";
    const spellId = "createMarket.spell";
    await prisma.inventoryItem.createMany({
      data: [
        {
          id: ringId,
          playerId: "devPlayer",
          type: "ring",
          definitionId: "ashenLoop",
          contentVersion: "production-items-v2",
          experience: 400,
          quality: 25,
          socketCount: 1,
        },
        {
          id: gemId,
          playerId: "devPlayer",
          type: "gem",
          definitionId: "emberShard",
          contentVersion: "production-items-v2",
          experience: 100,
          quality: 10,
        },
        {
          id: spellId,
          playerId: "devPlayer",
          type: "spell",
          definitionId: "carbonize",
          contentVersion: "production-items-v2",
          experience: 0,
          quality: 5,
        },
      ],
    });
    await prisma.ringSocket.create({
      data: { playerId: "devPlayer", ringItemId: ringId, gemItemId: gemId, socketIndex: 0 },
    });
    await prisma.gemEnchantment.create({
      data: {
        playerId: "devPlayer",
        gemItemId: gemId,
        targetItemId: spellId,
        targetType: "spell",
      },
    });

    const login = createH3TestEvent();
    await createPlayerSession(login.event, "devPlayer");
    const cookie = responseCookie(login.response, "battleness_session");
    const before = (await marketPlayersGetHandler(
      createH3TestEvent(cookie, undefined, "/api/market/players").event,
    )) as PlayerMarketBrowseApiResponse;
    expect(before.createOptions.items).toEqual([
      expect.objectContaining({ inventoryItemId: ringId, bundleItemCount: 3 }),
    ]);

    const itemBody = {
      inventoryItemId: ringId,
      price: 2_500,
      requestId: "create-market-ring",
    };
    const firstItemResult = (await marketPlayersPostHandler(
      createH3TestEvent(cookie, itemBody).event,
    )) as { listingId: string };
    const retriedItemResult = (await marketPlayersPostHandler(
      createH3TestEvent(cookie, itemBody).event,
    )) as { listingId: string };
    expect(retriedItemResult).toEqual(firstItemResult);

    const itemListing = await prisma.playerMarketListing.findUniqueOrThrow({
      where: { id: firstItemResult.listingId },
      include: { escrowItems: true, mutations: true },
    });
    expect(itemListing).toMatchObject({
      resourceType: "ring",
      definitionId: "ashenLoop",
      level: 2,
      quality: 25,
      quantity: 1,
      price: 2_500,
    });
    expect(itemListing.escrowItems.map((entry) => entry.inventoryItemId).sort()).toEqual(
      [ringId, gemId, spellId].sort(),
    );
    expect(JSON.parse(itemListing.itemSnapshotJson ?? "{}")).toMatchObject({
      version: 1,
      rootItemId: ringId,
      items: [{ id: ringId }, { id: gemId }, { id: spellId }],
      sockets: [{ ringItemId: ringId, gemItemId: gemId, socketIndex: 0 }],
      enchantments: [{ gemItemId: gemId, targetItemId: spellId, targetType: "spell" }],
    });
    expect(itemListing.mutations).toHaveLength(1);
    await expect(
      qualityPostHandler({ body: { action: "improveQuality", itemId: ringId } }),
    ).rejects.toMatchObject({
      statusCode: 400,
      statusMessage: `Inventory item "${ringId}" is locked in market escrow.`,
    });
    await expect(
      socketPostHandler({ body: { action: "unsocket", gemItemId: gemId } }),
    ).rejects.toMatchObject({
      statusCode: 400,
      statusMessage: expect.stringContaining("is locked in market escrow"),
    });

    const aluminiumBefore = await materialStockQuantity("aluminium");
    const materialBody = {
      materialId: "aluminium",
      quantity: 2,
      price: 600,
      requestId: "create-market-material",
    };
    const firstMaterialResult = (await marketPlayersPostHandler(
      createH3TestEvent(cookie, materialBody).event,
    )) as { listingId: string };
    const retriedMaterialResult = (await marketPlayersPostHandler(
      createH3TestEvent(cookie, materialBody).event,
    )) as { listingId: string };
    expect(retriedMaterialResult).toEqual(firstMaterialResult);
    expect(await materialStockQuantity("aluminium")).toBe(aluminiumBefore - 2);

    const materialListing = await prisma.playerMarketListing.findUniqueOrThrow({
      where: { id: firstMaterialResult.listingId },
    });
    expect(materialListing).toMatchObject({
      resourceType: "material",
      definitionId: "aluminium",
      quantity: 2,
      price: 600,
      rootItemId: null,
    });

    await expect(
      marketPlayersPostHandler(createH3TestEvent(cookie, { ...materialBody, price: 601 }).event),
    ).rejects.toMatchObject({
      statusCode: 400,
      statusMessage: "requestId was already used for a different player-market mutation.",
    });
  });

  it("rejects ineligible resources and the twenty-listing limit", async () => {
    const equippedRingId = "createMarket.equippedRing";
    await prisma.inventoryItem.create({
      data: {
        id: equippedRingId,
        playerId: "devPlayer",
        type: "ring",
        definitionId: "ashenLoop",
        contentVersion: "production-items-v2",
        experience: 0,
        quality: 0,
        socketCount: 1,
        equipped: true,
      },
    });
    await prisma.equippedRing.create({
      data: { playerId: "devPlayer", ringItemId: equippedRingId, slotIndex: 0 },
    });

    const login = createH3TestEvent();
    await createPlayerSession(login.event, "devPlayer");
    const cookie = responseCookie(login.response, "battleness_session");
    await expect(
      marketPlayersPostHandler(
        createH3TestEvent(cookie, {
          inventoryItemId: equippedRingId,
          price: 100,
          requestId: "create-equipped-ring",
        }).event,
      ),
    ).rejects.toMatchObject({
      statusCode: 400,
      statusMessage: `Inventory item "${equippedRingId}" is not eligible for listing.`,
    });

    await prisma.playerMarketListing.createMany({
      data: Array.from({ length: 20 }, (_, index) => ({
        id: `createMarket.limit.${index}`,
        sellerId: "devPlayer",
        resourceType: "material",
        definitionId: "iron",
        rarity: "common",
        quantity: 1,
        price: 10 + index,
        contentVersion: "production-items-v2",
      })),
    });
    const stockBefore = await materialStockQuantity("iron");
    await expect(
      marketPlayersPostHandler(
        createH3TestEvent(cookie, {
          materialId: "iron",
          quantity: 1,
          price: 100,
          requestId: "create-over-limit",
        }).event,
      ),
    ).rejects.toMatchObject({
      statusCode: 400,
      statusMessage: "A player can have at most 20 active listings.",
    });
    expect(await materialStockQuantity("iron")).toBe(stockBefore);
  });

  it("cancels listings idempotently and returns every escrowed resource", async () => {
    const ringId = "cancelMarket.ring";
    await prisma.inventoryItem.create({
      data: {
        id: ringId,
        playerId: "devPlayer",
        type: "ring",
        definitionId: "ashenLoop",
        contentVersion: "production-items-v2",
        experience: 0,
        quality: 0,
        socketCount: 1,
      },
    });
    const login = createH3TestEvent();
    await createPlayerSession(login.event, "devPlayer");
    const cookie = responseCookie(login.response, "battleness_session");

    const itemCreation = (await marketPlayersPostHandler(
      createH3TestEvent(cookie, {
        inventoryItemId: ringId,
        price: 500,
        requestId: "cancel-market-create-ring",
      }).event,
    )) as { listingId: string };
    const itemCancelEvent = createH3TestEvent(cookie, {
      requestId: "cancel-market-ring",
    });
    itemCancelEvent.event.context.params = { listingId: itemCreation.listingId };
    expect(await marketPlayersDeleteHandler(itemCancelEvent.event)).toEqual({
      listingId: itemCreation.listingId,
      status: "cancelled",
    });
    const itemRetryEvent = createH3TestEvent(cookie, { requestId: "cancel-market-ring" });
    itemRetryEvent.event.context.params = { listingId: itemCreation.listingId };
    expect(await marketPlayersDeleteHandler(itemRetryEvent.event)).toEqual({
      listingId: itemCreation.listingId,
      status: "cancelled",
    });
    expect(
      await prisma.playerMarketEscrowItem.count({ where: { listingId: itemCreation.listingId } }),
    ).toBe(0);
    await expect(
      qualityPostHandler({ body: { action: "improveQuality", itemId: ringId } }),
    ).resolves.toBeDefined();

    const aluminiumBefore = await materialStockQuantity("aluminium");
    const materialCreation = (await marketPlayersPostHandler(
      createH3TestEvent(cookie, {
        materialId: "aluminium",
        quantity: 1,
        price: 50,
        requestId: "cancel-market-create-material",
      }).event,
    )) as { listingId: string };
    expect(await materialStockQuantity("aluminium")).toBe(aluminiumBefore - 1);
    const materialCancelEvent = createH3TestEvent(cookie, {
      requestId: "cancel-market-material",
    });
    materialCancelEvent.event.context.params = { listingId: materialCreation.listingId };
    await marketPlayersDeleteHandler(materialCancelEvent.event);
    expect(await materialStockQuantity("aluminium")).toBe(aluminiumBefore);

    const lateCancelEvent = createH3TestEvent(cookie, {
      requestId: "cancel-market-material-again",
    });
    lateCancelEvent.event.context.params = { listingId: materialCreation.listingId };
    await expect(marketPlayersDeleteHandler(lateCancelEvent.event)).rejects.toMatchObject({
      statusCode: 400,
      statusMessage: `Listing "${materialCreation.listingId}" is no longer active.`,
    });
    expect(await materialStockQuantity("aluminium")).toBe(aluminiumBefore);
  });

  it("prevents another player from cancelling a seller listing", async () => {
    const otherPlayerId = "marketCancelIntruder";
    await prisma.player.create({
      data: { id: otherPlayerId, username: "Market Cancel Intruder", credits: 1_000 },
    });
    const sellerLogin = createH3TestEvent();
    await createPlayerSession(sellerLogin.event, "devPlayer");
    const sellerCookie = responseCookie(sellerLogin.response, "battleness_session");
    const creation = (await marketPlayersPostHandler(
      createH3TestEvent(sellerCookie, {
        materialId: "iron",
        quantity: 1,
        price: 75,
        requestId: "cancel-market-owned-create",
      }).event,
    )) as { listingId: string };

    const otherLogin = createH3TestEvent();
    await createPlayerSession(otherLogin.event, otherPlayerId);
    const otherCookie = responseCookie(otherLogin.response, "battleness_session");
    const cancelEvent = createH3TestEvent(otherCookie, {
      requestId: "cancel-market-intruder",
    });
    cancelEvent.event.context.params = { listingId: creation.listingId };
    await expect(marketPlayersDeleteHandler(cancelEvent.event)).rejects.toMatchObject({
      statusCode: 400,
      statusMessage: `Listing "${creation.listingId}" is not available for this player.`,
    });
    expect(
      await prisma.playerMarketListing.findUniqueOrThrow({ where: { id: creation.listingId } }),
    ).toMatchObject({ status: "active", sellerId: "devPlayer" });
  });

  it("purchases a material listing with atomic credits and idempotent settlement", async () => {
    const buyerId = "marketMaterialBuyer";
    await prisma.player.create({
      data: { id: buyerId, username: "Market Material Buyer", credits: 1_000 },
    });
    await prisma.materialStock.create({
      data: {
        playerId: buyerId,
        materialId: "iron",
        quantity: 0,
        contentVersion: "production-items-v2",
      },
    });
    const sellerCreditsBefore = (
      await prisma.player.findUniqueOrThrow({ where: { id: "devPlayer" } })
    ).credits;
    const sellerLogin = createH3TestEvent();
    await createPlayerSession(sellerLogin.event, "devPlayer");
    const sellerCookie = responseCookie(sellerLogin.response, "battleness_session");
    const creation = (await marketPlayersPostHandler(
      createH3TestEvent(sellerCookie, {
        materialId: "iron",
        quantity: 1,
        price: 250,
        requestId: "purchase-material-create",
      }).event,
    )) as { listingId: string };

    const selfPurchase = createH3TestEvent(sellerCookie, {
      requestId: "purchase-material-self",
    });
    selfPurchase.event.context.params = { listingId: creation.listingId };
    await expect(marketPlayersPurchaseHandler(selfPurchase.event)).rejects.toMatchObject({
      statusCode: 400,
      statusMessage: "Players cannot purchase their own listings.",
    });

    const buyerLogin = createH3TestEvent();
    await createPlayerSession(buyerLogin.event, buyerId);
    const buyerCookie = responseCookie(buyerLogin.response, "battleness_session");
    const buyerIronBefore =
      (
        await prisma.materialStock.findUnique({
          where: { playerId_materialId: { playerId: buyerId, materialId: "iron" } },
        })
      )?.quantity ?? 0;
    const purchaseEvent = createH3TestEvent(buyerCookie, {
      requestId: "purchase-material",
    });
    purchaseEvent.event.context.params = { listingId: creation.listingId };
    expect(await marketPlayersPurchaseHandler(purchaseEvent.event)).toEqual({
      listingId: creation.listingId,
      status: "sold",
    });
    const retryEvent = createH3TestEvent(buyerCookie, { requestId: "purchase-material" });
    retryEvent.event.context.params = { listingId: creation.listingId };
    expect(await marketPlayersPurchaseHandler(retryEvent.event)).toEqual({
      listingId: creation.listingId,
      status: "sold",
    });

    expect(await prisma.player.findUniqueOrThrow({ where: { id: buyerId } })).toMatchObject({
      credits: 750,
    });
    expect(await prisma.player.findUniqueOrThrow({ where: { id: "devPlayer" } })).toMatchObject({
      credits: sellerCreditsBefore + 250,
    });
    expect(
      await prisma.materialStock.findUniqueOrThrow({
        where: { playerId_materialId: { playerId: buyerId, materialId: "iron" } },
      }),
    ).toMatchObject({ quantity: buyerIronBefore + 1, contentVersion: "production-items-v2" });
    expect(
      await prisma.playerMarketListing.findUniqueOrThrow({ where: { id: creation.listingId } }),
    ).toMatchObject({
      status: "sold",
      buyerId,
      soldAt: expect.any(Date),
    });
    expect(
      await prisma.playerMarketMutation.count({
        where: { listingId: creation.listingId, action: "purchase" },
      }),
    ).toBe(1);

    const buyerHistory = (await marketPlayersHistoryHandler(
      createH3TestEvent(buyerCookie, undefined, "/api/market/players/history?role=buyer").event,
    )) as PlayerMarketHistoryApiResponse;
    expect(buyerHistory).toMatchObject({
      filter: { role: "buyer" },
      pagination: { total: 1 },
      transactions: [
        {
          id: creation.listingId,
          direction: "purchase",
          definitionId: "iron",
          price: 250,
        },
      ],
    });
    const sellerHistory = (await marketPlayersHistoryHandler(
      createH3TestEvent(sellerCookie, undefined, "/api/market/players/history?role=seller").event,
    )) as PlayerMarketHistoryApiResponse;
    expect(sellerHistory).toMatchObject({
      filter: { role: "seller" },
      pagination: { total: 1 },
      transactions: [{ id: creation.listingId, direction: "sale", price: 250 }],
    });
    expect(JSON.stringify(buyerHistory)).not.toContain("devPlayer");
    expect(JSON.stringify(sellerHistory)).not.toContain(buyerId);

    const latePurchase = createH3TestEvent(buyerCookie, {
      requestId: "purchase-material-late",
    });
    latePurchase.event.context.params = { listingId: creation.listingId };
    await expect(marketPlayersPurchaseHandler(latePurchase.event)).rejects.toMatchObject({
      statusCode: 400,
      statusMessage: `Listing "${creation.listingId}" is no longer available.`,
    });
  });

  it("transfers a complete item bundle and preserves attachment relations", async () => {
    const buyerId = "marketBundleBuyer";
    const ringId = "purchaseBundle.ring";
    const gemId = "purchaseBundle.gem";
    const spellId = "purchaseBundle.spell";
    await prisma.player.create({
      data: { id: buyerId, username: "Market Bundle Buyer", credits: 2_000 },
    });
    await prisma.inventoryItem.createMany({
      data: [
        {
          id: ringId,
          playerId: "devPlayer",
          type: "ring",
          definitionId: "ashenLoop",
          contentVersion: "production-items-v2",
          experience: 0,
          quality: 20,
          socketCount: 1,
        },
        {
          id: gemId,
          playerId: "devPlayer",
          type: "gem",
          definitionId: "emberShard",
          contentVersion: "production-items-v2",
          experience: 0,
          quality: 10,
        },
        {
          id: spellId,
          playerId: "devPlayer",
          type: "spell",
          definitionId: "carbonize",
          contentVersion: "production-items-v2",
          experience: 0,
          quality: 5,
        },
      ],
    });
    await prisma.ringSocket.create({
      data: { playerId: "devPlayer", ringItemId: ringId, gemItemId: gemId, socketIndex: 0 },
    });
    await prisma.gemEnchantment.create({
      data: {
        playerId: "devPlayer",
        gemItemId: gemId,
        targetItemId: spellId,
        targetType: "spell",
      },
    });

    const sellerLogin = createH3TestEvent();
    await createPlayerSession(sellerLogin.event, "devPlayer");
    const sellerCookie = responseCookie(sellerLogin.response, "battleness_session");
    const creation = (await marketPlayersPostHandler(
      createH3TestEvent(sellerCookie, {
        inventoryItemId: ringId,
        price: 1_200,
        requestId: "purchase-bundle-create",
      }).event,
    )) as { listingId: string };
    const buyerLogin = createH3TestEvent();
    await createPlayerSession(buyerLogin.event, buyerId);
    const buyerCookie = responseCookie(buyerLogin.response, "battleness_session");
    const purchaseEvent = createH3TestEvent(buyerCookie, {
      requestId: "purchase-bundle",
    });
    purchaseEvent.event.context.params = { listingId: creation.listingId };
    await marketPlayersPurchaseHandler(purchaseEvent.event);

    expect(
      await prisma.inventoryItem.findMany({
        where: { id: { in: [ringId, gemId, spellId] } },
        orderBy: { id: "asc" },
      }),
    ).toEqual([
      expect.objectContaining({ id: gemId, playerId: buyerId }),
      expect.objectContaining({ id: ringId, playerId: buyerId, equipped: false }),
      expect.objectContaining({ id: spellId, playerId: buyerId }),
    ]);
    expect(
      await prisma.ringSocket.findUniqueOrThrow({ where: { gemItemId: gemId } }),
    ).toMatchObject({ playerId: buyerId, ringItemId: ringId });
    expect(
      await prisma.gemEnchantment.findUniqueOrThrow({ where: { gemItemId: gemId } }),
    ).toMatchObject({ playerId: buyerId, targetItemId: spellId });
    expect(
      await prisma.playerMarketEscrowItem.count({ where: { listingId: creation.listingId } }),
    ).toBe(0);

    const buyerMarket = (await marketPlayersGetHandler(
      createH3TestEvent(buyerCookie, undefined, "/api/market/players").event,
    )) as PlayerMarketBrowseApiResponse;
    expect(buyerMarket.createOptions.items).toContainEqual(
      expect.objectContaining({ inventoryItemId: ringId, bundleItemCount: 3 }),
    );
  });

  it("rolls back a purchase when the buyer lacks credits", async () => {
    const buyerId = "marketPoorBuyer";
    await prisma.player.create({
      data: { id: buyerId, username: "Market Poor Buyer", credits: 10 },
    });
    const sellerCreditsBefore = (
      await prisma.player.findUniqueOrThrow({ where: { id: "devPlayer" } })
    ).credits;
    const sellerLogin = createH3TestEvent();
    await createPlayerSession(sellerLogin.event, "devPlayer");
    const sellerCookie = responseCookie(sellerLogin.response, "battleness_session");
    const creation = (await marketPlayersPostHandler(
      createH3TestEvent(sellerCookie, {
        materialId: "iron",
        quantity: 1,
        price: 500,
        requestId: "purchase-poor-create",
      }).event,
    )) as { listingId: string };
    const buyerLogin = createH3TestEvent();
    await createPlayerSession(buyerLogin.event, buyerId);
    const buyerCookie = responseCookie(buyerLogin.response, "battleness_session");
    const purchaseEvent = createH3TestEvent(buyerCookie, { requestId: "purchase-poor" });
    purchaseEvent.event.context.params = { listingId: creation.listingId };
    await expect(marketPlayersPurchaseHandler(purchaseEvent.event)).rejects.toMatchObject({
      statusCode: 400,
      statusMessage: "Not enough credits.",
    });
    expect(
      await prisma.playerMarketListing.findUniqueOrThrow({ where: { id: creation.listingId } }),
    ).toMatchObject({ status: "active", buyerId: null, soldAt: null });
    expect(await prisma.player.findUniqueOrThrow({ where: { id: buyerId } })).toMatchObject({
      credits: 10,
    });
    expect(await prisma.player.findUniqueOrThrow({ where: { id: "devPlayer" } })).toMatchObject({
      credits: sellerCreditsBefore,
    });
  });

  it("settles a contested listing for only one concurrent buyer", async () => {
    const buyerIds = ["marketRaceBuyerOne", "marketRaceBuyerTwo"];
    await prisma.player.createMany({
      data: buyerIds.map((id, index) => ({
        id,
        username: `Market Race Buyer ${index + 1}`,
        credits: 1_000,
      })),
    });
    const sellerCreditsBefore = (
      await prisma.player.findUniqueOrThrow({ where: { id: "devPlayer" } })
    ).credits;
    const sellerLogin = createH3TestEvent();
    await createPlayerSession(sellerLogin.event, "devPlayer");
    const sellerCookie = responseCookie(sellerLogin.response, "battleness_session");
    const creation = (await marketPlayersPostHandler(
      createH3TestEvent(sellerCookie, {
        materialId: "iron",
        quantity: 1,
        price: 300,
        requestId: "purchase-race-create",
      }).event,
    )) as { listingId: string };

    const purchaseEvents = await Promise.all(
      buyerIds.map(async (buyerId, index) => {
        const login = createH3TestEvent();
        await createPlayerSession(login.event, buyerId);
        const cookie = responseCookie(login.response, "battleness_session");
        const event = createH3TestEvent(cookie, { requestId: `purchase-race-${index + 1}` });
        event.event.context.params = { listingId: creation.listingId };
        return event.event;
      }),
    );
    const results = await Promise.allSettled(
      purchaseEvents.map((event) => marketPlayersPurchaseHandler(event)),
    );

    expect(results.filter((result) => result.status === "fulfilled")).toHaveLength(1);
    expect(results.filter((result) => result.status === "rejected")).toHaveLength(1);
    const listing = await prisma.playerMarketListing.findUniqueOrThrow({
      where: { id: creation.listingId },
    });
    expect(listing).toMatchObject({ status: "sold", soldAt: expect.any(Date) });
    expect(buyerIds).toContain(listing.buyerId);
    const buyers = await prisma.player.findMany({
      where: { id: { in: buyerIds } },
      orderBy: { id: "asc" },
    });
    expect(buyers.map((buyer) => buyer.credits).sort((left, right) => left - right)).toEqual([
      700, 1_000,
    ]);
    expect(await prisma.player.findUniqueOrThrow({ where: { id: "devPlayer" } })).toMatchObject({
      credits: sellerCreditsBefore + 300,
    });
    expect(
      await prisma.playerMarketMutation.count({
        where: { listingId: creation.listingId, action: "purchase" },
      }),
    ).toBe(1);
  }, 60_000);

  it("returns only the current player's permanent market history with stable pagination", async () => {
    const otherSellerId = "historyOtherSeller";
    const otherBuyerId = "historyOtherBuyer";
    const unrelatedSellerId = "historyUnrelatedSeller";
    const unrelatedBuyerId = "historyUnrelatedBuyer";
    await prisma.player.createMany({
      data: [
        { id: otherSellerId, username: "History Other Seller" },
        { id: otherBuyerId, username: "History Other Buyer" },
        { id: unrelatedSellerId, username: "History Unrelated Seller" },
        { id: unrelatedBuyerId, username: "History Unrelated Buyer" },
      ],
    });
    await prisma.playerMarketListing.createMany({
      data: [
        {
          id: "history.purchase",
          sellerId: otherSellerId,
          buyerId: "devPlayer",
          status: "sold",
          resourceType: "ring",
          definitionId: "ashenLoop",
          rarity: "common",
          element: "fire",
          level: 2,
          quality: 30,
          price: 400,
          itemSnapshotJson: JSON.stringify({ items: [{}, {}, {}] }),
          contentVersion: "production-items-v2",
          soldAt: new Date("2026-07-15T15:00:00.000Z"),
        },
        {
          id: "history.sale",
          sellerId: "devPlayer",
          buyerId: otherBuyerId,
          status: "sold",
          resourceType: "material",
          definitionId: "gold",
          rarity: "rare",
          quantity: 2,
          price: 700,
          contentVersion: "production-items-v2",
          soldAt: new Date("2026-07-15T14:00:00.000Z"),
        },
        {
          id: "history.unrelated",
          sellerId: unrelatedSellerId,
          buyerId: unrelatedBuyerId,
          status: "sold",
          resourceType: "material",
          definitionId: "silver",
          rarity: "rare",
          quantity: 1,
          price: 900,
          contentVersion: "production-items-v2",
          soldAt: new Date("2026-07-15T16:00:00.000Z"),
        },
        {
          id: "history.cancelled",
          sellerId: "devPlayer",
          status: "cancelled",
          resourceType: "material",
          definitionId: "iron",
          rarity: "common",
          quantity: 1,
          price: 100,
          contentVersion: "production-items-v2",
          cancelledAt: new Date("2026-07-15T17:00:00.000Z"),
        },
      ],
    });

    const login = createH3TestEvent();
    await createPlayerSession(login.event, "devPlayer");
    const cookie = responseCookie(login.response, "battleness_session");
    const firstPage = (await marketPlayersHistoryHandler(
      createH3TestEvent(cookie, undefined, "/api/market/players/history?role=all&page=1&pageSize=1")
        .event,
    )) as PlayerMarketHistoryApiResponse;
    expect(firstPage).toMatchObject({
      filter: { role: "all" },
      pagination: { page: 1, pageSize: 1, total: 2, totalPages: 2 },
      transactions: [
        {
          id: "history.purchase",
          direction: "purchase",
          definitionId: "ashenLoop",
          bundleItemCount: 3,
        },
      ],
    });
    const secondPage = (await marketPlayersHistoryHandler(
      createH3TestEvent(cookie, undefined, "/api/market/players/history?role=all&page=2&pageSize=1")
        .event,
    )) as PlayerMarketHistoryApiResponse;
    expect(secondPage.transactions).toEqual([
      expect.objectContaining({
        id: "history.sale",
        direction: "sale",
        definitionId: "gold",
        bundleItemCount: 0,
      }),
    ]);
    const purchases = (await marketPlayersHistoryHandler(
      createH3TestEvent(cookie, undefined, "/api/market/players/history?role=buyer").event,
    )) as PlayerMarketHistoryApiResponse;
    expect(purchases.transactions.map((transaction) => transaction.id)).toEqual([
      "history.purchase",
    ]);
    const sales = (await marketPlayersHistoryHandler(
      createH3TestEvent(cookie, undefined, "/api/market/players/history?role=seller").event,
    )) as PlayerMarketHistoryApiResponse;
    expect(sales.transactions.map((transaction) => transaction.id)).toEqual(["history.sale"]);
    const serializedHistory = JSON.stringify({ firstPage, secondPage, purchases, sales });
    for (const hiddenPlayerId of [
      otherSellerId,
      otherBuyerId,
      unrelatedSellerId,
      unrelatedBuyerId,
    ]) {
      expect(serializedHistory).not.toContain(hiddenPlayerId);
    }
    await expect(
      marketPlayersHistoryHandler(
        createH3TestEvent(cookie, undefined, "/api/market/players/history?role=moderator").event,
      ),
    ).rejects.toMatchObject({
      statusCode: 400,
      statusMessage: "role must be one of: all, buyer, seller.",
    });

    await prisma.playerMarketListing.deleteMany({
      where: {
        OR: [
          { sellerId: { in: ["devPlayer", otherSellerId, unrelatedSellerId] } },
          { buyerId: { in: ["devPlayer", otherBuyerId, unrelatedBuyerId] } },
        ],
      },
    });
    await prisma.player.deleteMany({
      where: { id: { in: [otherSellerId, otherBuyerId, unrelatedSellerId, unrelatedBuyerId] } },
    });
  });

  it("persists ranked season rating state with Glicko-2 defaults", async () => {
    const season = await prisma.rankedSeason.create({
      data: {
        id: "ranked-season-test",
        status: "active",
        startsAt: new Date("2026-07-01T00:00:00.000Z"),
        endsAt: new Date("2026-08-26T00:00:00.000Z"),
        ratings: { create: { playerId: "devPlayer" } },
      },
      include: { ratings: true },
    });

    expect(season.ratings).toEqual([
      expect.objectContaining({
        playerId: "devPlayer",
        rating: 1_500,
        deviation: 350,
        volatility: 0.06,
        placementMatches: 0,
        wins: 0,
        losses: 0,
        draws: 0,
        lastMatchAt: null,
      }),
    ]);

    await prisma.rankedSeasonRating.update({
      where: {
        seasonId_playerId: { seasonId: season.id, playerId: "devPlayer" },
      },
      data: {
        rating: 1_527.25,
        deviation: 241.5,
        volatility: 0.0599,
        placementMatches: 1,
        wins: 1,
        lastMatchAt: new Date("2026-07-15T12:00:00.000Z"),
      },
    });
    await expect(
      prisma.rankedSeasonRating.findUniqueOrThrow({
        where: {
          seasonId_playerId: { seasonId: season.id, playerId: "devPlayer" },
        },
      }),
    ).resolves.toMatchObject({
      rating: 1_527.25,
      deviation: 241.5,
      volatility: 0.0599,
      placementMatches: 1,
      wins: 1,
    });

    await prisma.rankedSeason.delete({ where: { id: season.id } });
    await expect(prisma.rankedSeasonRating.count({ where: { seasonId: season.id } })).resolves.toBe(
      0,
    );
  });

  it("rolls an ended ranked season forward once and journals soft resets", async () => {
    const seasonId = "ranked-maintenance-ended-season";
    const lastMatchAt = new Date("2026-02-20T12:00:00.000Z");
    const endsAt = new Date("2026-02-26T00:00:00.000Z");
    await prisma.rankedSeason.create({
      data: {
        id: seasonId,
        status: "active",
        startsAt: new Date("2026-01-01T00:00:00.000Z"),
        endsAt,
        ratings: {
          create: {
            playerId: "devPlayer",
            rating: 2_300,
            deviation: 120,
            volatility: 0.05,
            placementMatches: 5,
            peakRating: 2_450,
            wins: 12,
            losses: 4,
            draws: 1,
            lastMatchAt,
          },
        },
      },
    });
    const now = new Date("2026-02-26T00:00:01.000Z");

    const first = await runRankedSeasonMaintenance(prisma, now);
    expect(first).toMatchObject({ transitions: 1, decays: 0 });
    const nextSeason = await prisma.rankedSeason.findUniqueOrThrow({
      where: { previousSeasonId: seasonId },
      include: { ratings: true },
    });
    expect(nextSeason).toMatchObject({
      id: first.activeSeasonId,
      previousSeasonId: seasonId,
      status: "active",
      startsAt: endsAt,
    });
    expect(nextSeason.endsAt.getTime() - nextSeason.startsAt.getTime()).toBe(
      56 * 24 * 60 * 60 * 1_000,
    );
    expect(nextSeason.ratings).toEqual([
      expect.objectContaining({
        playerId: "devPlayer",
        rating: 2_100,
        deviation: 200,
        volatility: 0.05,
        placementMatches: 0,
        wins: 0,
        losses: 0,
        draws: 0,
        version: 0,
        lastMatchAt,
      }),
    ]);
    await expect(
      prisma.rankedSeason.findUniqueOrThrow({ where: { id: seasonId } }),
    ).resolves.toMatchObject({ status: "closed" });
    await expect(
      prisma.rankedRatingAdjustment.findMany({
        where: { seasonId: nextSeason.id, playerId: "devPlayer", reason: "season_soft_reset" },
      }),
    ).resolves.toEqual([
      expect.objectContaining({
        ratingBefore: 2_300,
        ratingAfter: 2_100,
        deviationBefore: 120,
        deviationAfter: 200,
        placementMatchesBefore: 5,
        placementMatchesAfter: 0,
      }),
    ]);

    const seasonReward = await prisma.rankedSeasonReward.findUniqueOrThrow({
      where: { seasonId_playerId: { seasonId, playerId: "devPlayer" } },
      include: { rewardGrant: { include: { materials: true } } },
    });
    expect(seasonReward).toMatchObject({
      tier: "master",
      peakRating: 2_450,
      rewardGrant: {
        status: "unclaimed",
        credits: 3_000,
        heroExperience: 0,
        materials: expect.arrayContaining([
          expect.objectContaining({ quantity: 1 }),
          expect.objectContaining({ quantity: 1 }),
          expect.objectContaining({ quantity: 1 }),
        ]),
      },
    });
    expect(seasonReward.rewardGrant.materials).toHaveLength(3);
    const creditsBeforeClaim = (
      await prisma.player.findUniqueOrThrow({ where: { id: "devPlayer" } })
    ).credits;
    const materialStockBeforeClaim = new Map(
      (
        await prisma.materialStock.findMany({
          where: {
            playerId: "devPlayer",
            materialId: {
              in: seasonReward.rewardGrant.materials.map((material) => material.materialId),
            },
          },
        })
      ).map((material) => [material.materialId, material.quantity]),
    );
    await battleRewardClaimHandler({ body: { rewardGrantId: seasonReward.rewardGrantId } });
    await expect(
      prisma.rewardGrant.findUniqueOrThrow({ where: { id: seasonReward.rewardGrantId } }),
    ).resolves.toMatchObject({ status: "claimed", claimedAt: expect.any(Date) });
    await expect(
      prisma.player.findUniqueOrThrow({ where: { id: "devPlayer" } }),
    ).resolves.toMatchObject({ credits: creditsBeforeClaim + 3_000 });
    await expect(
      prisma.playerCosmeticUnlock.findMany({
        where: { playerId: "devPlayer", sourceType: "rankedSeason", sourceId: seasonId },
      }),
    ).resolves.toEqual(
      expect.arrayContaining([
        expect.objectContaining({ type: "badge", cosmeticId: seasonReward.badgeCosmeticId }),
        expect.objectContaining({ type: "title", cosmeticId: seasonReward.titleCosmeticId }),
      ]),
    );
    for (const material of seasonReward.rewardGrant.materials) {
      await expect(
        prisma.materialStock.findUniqueOrThrow({
          where: {
            playerId_materialId: { playerId: "devPlayer", materialId: material.materialId },
          },
        }),
      ).resolves.toMatchObject({
        quantity: (materialStockBeforeClaim.get(material.materialId) ?? 0) + 1,
      });
    }

    const repeated = await runRankedSeasonMaintenance(prisma, now);
    expect(repeated).toMatchObject({ transitions: 0, decays: 0 });
    await expect(
      prisma.rankedRatingAdjustment.count({
        where: { seasonId: nextSeason.id, playerId: "devPlayer", reason: "season_soft_reset" },
      }),
    ).resolves.toBe(1);
  });

  it("applies ranked inactivity decay once per completed weekly period", async () => {
    const seasonId = "ranked-maintenance-decay-season";
    await prisma.rankedSeason.create({
      data: {
        id: seasonId,
        status: "active",
        startsAt: new Date("2026-01-01T00:00:00.000Z"),
        endsAt: new Date("2026-04-01T00:00:00.000Z"),
        ratings: {
          create: {
            playerId: "devPlayer",
            rating: 2_150,
            deviation: 100,
            placementMatches: 5,
            lastMatchAt: new Date("2026-01-01T00:00:00.000Z"),
          },
        },
      },
    });
    const first = await runRankedSeasonMaintenance(prisma, new Date("2026-01-15T00:00:01.000Z"));
    expect(first).toMatchObject({ transitions: 0, decays: 2 });
    await expect(
      prisma.rankedSeasonRating.findUniqueOrThrow({
        where: { seasonId_playerId: { seasonId, playerId: "devPlayer" } },
      }),
    ).resolves.toMatchObject({ rating: 2_100, version: 2 });

    const repeated = await runRankedSeasonMaintenance(prisma, new Date("2026-01-15T00:00:01.000Z"));
    expect(repeated.decays).toBe(0);
    const nextWeek = await runRankedSeasonMaintenance(prisma, new Date("2026-01-22T00:00:01.000Z"));
    expect(nextWeek.decays).toBe(1);
    await expect(
      prisma.rankedSeasonRating.findUniqueOrThrow({
        where: { seasonId_playerId: { seasonId, playerId: "devPlayer" } },
      }),
    ).resolves.toMatchObject({ rating: 2_075, version: 3 });
    await expect(
      prisma.rankedRatingAdjustment.count({
        where: { seasonId, playerId: "devPlayer", reason: "inactivity_decay" },
      }),
    ).resolves.toBe(3);
  });

  it("settles both ranked ratings atomically and journals the battle once", async () => {
    const opponentId = "rankedSettlementOpponent";
    const seasonId = "ranked-settlement-season";
    await prisma.player.create({
      data: {
        id: opponentId,
        username: "Ranked Settlement Opponent",
        displayName: "Ranked Settlement Opponent",
        preferences: { create: {} },
      },
    });
    await prisma.rankedSeason.create({
      data: {
        id: seasonId,
        status: "active",
        startsAt: new Date("2026-07-01T00:00:00.000Z"),
        endsAt: new Date("2026-08-26T00:00:00.000Z"),
      },
    });
    await prisma.rankedSeasonRating.createMany({
      data: [
        { seasonId, playerId: "devPlayer", placementMatches: 4 },
        { seasonId, playerId: opponentId, placementMatches: 4 },
      ],
    });
    const battle = await prisma.battleRecord.create({
      data: {
        mode: "ranked_pvp",
        status: "finished",
        result: "finished",
        playerOneId: "devPlayer",
        playerTwoId: opponentId,
        winnerPlayerId: "devPlayer",
        seed: "ranked-settlement-seed",
        rulesVersion: "prototype-2",
        contentVersion: "production-items-v2",
        setupJson: "{}",
        actionLogJson: "[]",
        createdAt: new Date("2026-07-15T12:00:00.000Z"),
      },
    });
    const settledAt = new Date("2026-07-15T12:30:00.000Z");

    const settled = await settleRankedBattleRating(prisma, {
      seasonId,
      battleRecordId: battle.id,
      settledAt,
    });
    expect(settled).toMatchObject({
      alreadySettled: false,
      playerOne: {
        playerId: "devPlayer",
        score: 1,
        placementMatchesBefore: 4,
        placementMatchesAfter: 5,
      },
      playerTwo: {
        playerId: opponentId,
        score: 0,
        placementMatchesBefore: 4,
        placementMatchesAfter: 5,
      },
    });
    expect(settled.playerOne.after.rating).toBeGreaterThan(1_500);
    expect(settled.playerTwo.after.rating).toBeLessThan(1_500);

    const repeated = await settleRankedBattleRating(prisma, {
      seasonId,
      battleRecordId: battle.id,
      settledAt: new Date("2026-07-15T13:00:00.000Z"),
    });
    expect(repeated).toMatchObject({
      seasonId: settled.seasonId,
      battleRecordId: settled.battleRecordId,
      alreadySettled: true,
      playerOne: {
        playerId: settled.playerOne.playerId,
        score: settled.playerOne.score,
        placementMatchesAfter: settled.playerOne.placementMatchesAfter,
      },
      playerTwo: {
        playerId: settled.playerTwo.playerId,
        score: settled.playerTwo.score,
        placementMatchesAfter: settled.playerTwo.placementMatchesAfter,
      },
    });
    expect(repeated.playerOne.after.rating).toBeCloseTo(settled.playerOne.after.rating, 10);
    expect(repeated.playerTwo.after.rating).toBeCloseTo(settled.playerTwo.after.rating, 10);

    const [ratings, adjustments] = await Promise.all([
      prisma.rankedSeasonRating.findMany({
        where: { seasonId },
        orderBy: { playerId: "asc" },
      }),
      prisma.rankedRatingAdjustment.findMany({
        where: { battleRecordId: battle.id },
        orderBy: { playerId: "asc" },
      }),
    ]);
    expect(ratings).toHaveLength(2);
    expect(ratings).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          playerId: "devPlayer",
          placementMatches: 5,
          wins: 1,
          losses: 0,
          version: 1,
          lastMatchAt: settledAt,
        }),
        expect.objectContaining({
          playerId: opponentId,
          placementMatches: 5,
          wins: 0,
          losses: 1,
          version: 1,
          lastMatchAt: settledAt,
        }),
      ]),
    );
    expect(ratings.find((rating) => rating.playerId === "devPlayer")?.peakRating).toBeCloseTo(
      settled.playerOne.after.rating,
      10,
    );
    expect(ratings.find((rating) => rating.playerId === opponentId)?.peakRating).toBeCloseTo(
      settled.playerTwo.after.rating,
      10,
    );
    expect(adjustments).toHaveLength(2);
    expect(adjustments.every((adjustment) => adjustment.reason === "match")).toBe(true);
    expect(adjustments.map((adjustment) => adjustment.score).sort()).toEqual([0, 1]);

    await prisma.rankedSeason.delete({ where: { id: seasonId } });
    await prisma.battleRecord.delete({ where: { id: battle.id } });
    await prisma.player.delete({ where: { id: opponentId } });
  });

  it("creates hashed development sessions and revokes them on logout", async () => {
    const initial = createH3TestEvent();
    const response = (await authSessionHandler(initial.event)) as {
      authenticated: boolean;
      session: { id: string; player: { id: string } };
    };
    const sessionCookie = responseCookie(initial.response, "battleness_session");
    const rawToken = sessionCookie.split("=")[1];

    expect(response.authenticated).toBe(true);
    expect(response.session.player.id).toBe("devPlayer");
    expect(rawToken).toBeTruthy();

    const storedSession = await prisma.playerSession.findUniqueOrThrow({
      where: { id: response.session.id },
    });
    expect(storedSession.tokenHash).toHaveLength(64);
    expect(storedSession.tokenHash).not.toBe(rawToken);

    await prisma.playerSession.update({
      where: { id: response.session.id },
      data: { expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1_000) },
    });
    const renewal = createH3TestEvent(sessionCookie);
    await authSessionHandler(renewal.event);
    const renewedSession = await prisma.playerSession.findUniqueOrThrow({
      where: { id: response.session.id },
    });
    expect(renewedSession.expiresAt.getTime()).toBeGreaterThan(
      Date.now() + 29 * 24 * 60 * 60 * 1_000,
    );
    expect(responseCookie(renewal.response, "battleness_session")).toBe(sessionCookie);

    const logout = createH3TestEvent(sessionCookie);
    await authLogoutHandler(logout.event);
    await expect(
      prisma.playerSession.findUniqueOrThrow({ where: { id: response.session.id } }),
    ).resolves.toMatchObject({ revokedAt: expect.any(Date) });

    const signedOut = createH3TestEvent(responseCookie(logout.response, "battleness_signed_out"));
    const signedOutResponse = (await authSessionHandler(signedOut.event)) as {
      authenticated: boolean;
      session: null;
    };
    expect(signedOutResponse).toMatchObject({ authenticated: false, session: null });

    const expiredLogin = createH3TestEvent();
    const expiredSession = await createPlayerSession(expiredLogin.event, "devPlayer");
    const expiredCookie = responseCookie(expiredLogin.response, "battleness_session");
    await prisma.playerSession.update({
      where: { id: expiredSession.id },
      data: { expiresAt: new Date(Date.now() - 1_000) },
    });
    process.env.BATTLENESS_DEV_AUTH = "disabled";
    try {
      const expired = createH3TestEvent(expiredCookie);
      await expect(authSessionHandler(expired.event)).resolves.toMatchObject({
        authenticated: false,
        session: null,
      });
    } finally {
      delete process.env.BATTLENESS_DEV_AUTH;
    }
  });

  it("isolates profile state between authenticated players", async () => {
    await prisma.player.create({
      data: {
        id: "secondPlayer",
        username: "Second Player",
        displayName: "Second Player",
        credits: 500,
        preferences: { create: {} },
      },
    });

    const login = createH3TestEvent();
    await createPlayerSession(login.event, "secondPlayer");
    const sessionCookie = responseCookie(login.response, "battleness_session");
    const update = createH3TestEvent(sessionCookie, {
      displayName: "Isolated Player",
      profileVisibility: "private",
      locale: "fr",
      theme: "dark",
      reducedMotion: true,
      interfaceDensity: "compact",
      muted: true,
      masterVolume: 40,
      musicVolume: 30,
      effectsVolume: 20,
    });

    const updated = (await profileSettingsPostHandler(update.event as unknown as TestEvent)) as {
      profile: { id: string; displayName: string };
    };
    expect(updated.profile).toMatchObject({ id: "secondPlayer", displayName: "Isolated Player" });
    await expect(
      prisma.player.findUniqueOrThrow({ where: { id: "devPlayer" } }),
    ).resolves.toMatchObject({ displayName: "Dev Player" });
    await prisma.player.delete({ where: { id: "secondPlayer" } });
  });

  it("creates and starts a persistent private match for two authenticated players", async () => {
    const hostRingId = "devPlayer.ring.private";
    const guestId = "privateGuest";
    const guestRingId = `${guestId}.ring.private`;
    const guestGemId = `${guestId}.gem.private`;
    const guestSpellId = `${guestId}.spell.private`;

    await prisma.player.create({
      data: {
        id: guestId,
        username: "Private Guest",
        displayName: "Private Guest",
        credits: 1_000,
        preferences: { create: {} },
      },
    });
    await prisma.inventoryItem.createMany({
      data: [
        {
          id: hostRingId,
          playerId: "devPlayer",
          type: "ring",
          definitionId: "furnaceLink",
          contentVersion: "production-items-v2",
          experience: 0,
          quality: 0,
          socketCount: 1,
          socketedGemInstanceIds: "[]",
        },
        {
          id: guestRingId,
          playerId: guestId,
          type: "ring",
          definitionId: "furnaceLink",
          contentVersion: "production-items-v2",
          experience: 0,
          quality: 0,
          socketCount: 1,
          socketedGemInstanceIds: JSON.stringify([guestGemId]),
        },
        {
          id: guestGemId,
          playerId: guestId,
          type: "gem",
          definitionId: "cinderPearl",
          contentVersion: "production-items-v2",
          experience: 0,
          quality: 0,
          socketCount: null,
          enchantment: JSON.stringify({ type: "spell", spellInstanceId: guestSpellId }),
        },
        {
          id: guestSpellId,
          playerId: guestId,
          type: "spell",
          definitionId: "carbonize",
          contentVersion: "production-items-v2",
          experience: 0,
          quality: 0,
          socketCount: null,
        },
      ],
    });
    await prisma.ringSocket.create({
      data: { playerId: guestId, ringItemId: guestRingId, gemItemId: guestGemId, socketIndex: 0 },
    });
    await prisma.gemEnchantment.create({
      data: {
        playerId: guestId,
        gemItemId: guestGemId,
        targetItemId: guestSpellId,
        targetType: "spell",
      },
    });
    const [hostLoadout, guestLoadout] = await Promise.all([
      prisma.loadout.create({
        data: {
          playerId: "devPlayer",
          name: "Private Host",
          rings: { create: { ringItemId: hostRingId, slotIndex: 0 } },
        },
      }),
      prisma.loadout.create({
        data: {
          playerId: guestId,
          name: "Private Guest",
          rings: { create: { ringItemId: guestRingId, slotIndex: 0 } },
        },
      }),
    ]);

    const hostLogin = createH3TestEvent();
    await createPlayerSession(hostLogin.event, "devPlayer");
    const hostCookie = responseCookie(hostLogin.response, "battleness_session");
    const guestLogin = createH3TestEvent();
    await createPlayerSession(guestLogin.event, guestId);
    const guestCookie = responseCookie(guestLogin.response, "battleness_session");

    const createdEvent = createH3TestEvent(hostCookie, { action: "create" });
    const created = (await privateMatchPostHandler(createdEvent.event)) as PrivateMatchApiResponse;
    expect(created.match?.code).toMatch(/^BN-[A-Z2-9]{6}$/);
    expect(created.match?.participants).toHaveLength(1);
    expect(created.match?.participants[0]).toMatchObject({
      isCurrentPlayer: true,
      displayName: "Dev Player",
      loadoutId: null,
      loadoutName: null,
      ringCount: 0,
    });
    const reloaded = (await privateMatchGetHandler(
      createH3TestEvent(hostCookie).event,
    )) as PrivateMatchApiResponse;
    expect(reloaded.match?.id).toBe(created.match?.id);

    const joinedEvent = createH3TestEvent(guestCookie, {
      action: "join",
      code: created.match?.code.toLowerCase(),
    });
    const joined = (await privateMatchPostHandler(joinedEvent.event)) as PrivateMatchApiResponse;
    expect(joined.match?.participants).toMatchObject([
      {
        isCurrentPlayer: false,
        displayName: "Dev Player",
        level: 0,
        rank: null,
        slot: "host",
        ready: false,
      },
      {
        isCurrentPlayer: true,
        displayName: "Private Guest",
        level: 0,
        rank: null,
        slot: "guest",
        ready: false,
      },
    ]);
    const privateOpponent = joined.match?.participants.find(
      (participant) => !participant.isCurrentPlayer,
    );
    expect(privateOpponent).toEqual({
      isCurrentPlayer: false,
      displayName: "Dev Player",
      level: 0,
      rank: null,
      slot: "host",
      ready: false,
    });

    const guestReadyEvent = createH3TestEvent(guestCookie, {
      action: "ready",
      loadoutId: guestLoadout.id,
      ready: true,
    });
    const guestReady = (await privateMatchPostHandler(
      guestReadyEvent.event,
    )) as PrivateMatchApiResponse;
    expect(guestReady.match?.status).toBe("waiting");
    const hostBeforeStart = (await privateMatchGetHandler(
      createH3TestEvent(hostCookie).event,
    )) as PrivateMatchApiResponse;
    const guestSeenByHost = hostBeforeStart.match?.participants.find(
      (participant) => !participant.isCurrentPlayer,
    );
    expect(guestSeenByHost).toEqual({
      isCurrentPlayer: false,
      displayName: "Private Guest",
      level: 0,
      rank: null,
      slot: "guest",
      ready: true,
    });

    const hostReadyEvent = createH3TestEvent(hostCookie, {
      action: "ready",
      loadoutId: hostLoadout.id,
      ready: true,
    });
    const started = (await privateMatchPostHandler(
      hostReadyEvent.event,
    )) as PrivateMatchApiResponse;
    expect(started.match).toMatchObject({ status: "active", battleId: expect.any(String) });

    const hostBattleEvent = createH3TestEvent(hostCookie);
    hostBattleEvent.event.context.params = { battleId: started.match!.battleId! };
    const hostBattle = (await battleLiveGetHandler(
      hostBattleEvent.event as unknown as TestEvent,
    )) as LiveBattleApiResponse;
    const guestBattleEvent = createH3TestEvent(guestCookie);
    guestBattleEvent.event.context.params = { battleId: started.match!.battleId! };
    const guestBattle = (await battleLiveGetHandler(
      guestBattleEvent.event as unknown as TestEvent,
    )) as LiveBattleApiResponse;

    expect(hostBattle).toMatchObject({ viewer: { id: "devPlayer" } });
    expect(guestBattle).toMatchObject({ mode: "private_pvp", viewer: { id: guestId } });
    expect(guestBattle.viewer.rings?.[0]?.gems[0]?.enchantment).toMatchObject({
      type: "spell",
      definitionId: "carbonize",
    });
    expectHiddenPvpLiveLoadout(hostBattle, "private_pvp");
    expectHiddenPvpLiveLoadout(guestBattle, "private_pvp");

    expect(hostBattle).toMatchObject({
      status: "choosingFirstPlayer",
      openingDuelDeadlineAt: expect.any(String),
      openingDuelChoiceSubmitted: false,
      openingDuelRound: 1,
    });
    const firstDuelDeadline = Date.parse(hostBattle.openingDuelDeadlineAt!);

    const hostChoiceEvent = createH3TestEvent(hostCookie, {
      expectedActionCount: hostBattle.actionCount,
      action: { type: "chooseElement", element: "fire" },
    });
    hostChoiceEvent.event.context.params = { battleId: hostBattle.id };
    const hostChoice = (await battleActionHandler(
      hostChoiceEvent.event as unknown as TestEvent,
    )) as LiveBattleActionApiResponse;
    expect(hostChoice.battle).toMatchObject({
      status: "choosingFirstPlayer",
      openingDuelChoiceSubmitted: true,
      openingDuelRound: 1,
    });
    expect(Date.parse(hostChoice.battle.openingDuelDeadlineAt!)).toBe(firstDuelDeadline);

    const guestTieEvent = createH3TestEvent(guestCookie, {
      expectedActionCount: hostChoice.battle.actionCount,
      action: { type: "chooseElement", element: "fire" },
    });
    guestTieEvent.event.context.params = { battleId: hostBattle.id };
    const tiedBattle = (
      (await battleActionHandler(
        guestTieEvent.event as unknown as TestEvent,
      )) as LiveBattleActionApiResponse
    ).battle;
    expect(tiedBattle).toMatchObject({
      status: "choosingFirstPlayer",
      openingDuelChoiceSubmitted: false,
      openingDuelRound: 2,
    });
    expect(Date.parse(tiedBattle.openingDuelDeadlineAt!)).toBeGreaterThanOrEqual(firstDuelDeadline);

    const secondHostChoiceEvent = createH3TestEvent(hostCookie, {
      expectedActionCount: tiedBattle.actionCount,
      action: { type: "chooseElement", element: "fire" },
    });
    secondHostChoiceEvent.event.context.params = { battleId: hostBattle.id };
    const secondHostChoice = (await battleActionHandler(
      secondHostChoiceEvent.event as unknown as TestEvent,
    )) as LiveBattleActionApiResponse;
    const guestChoiceEvent = createH3TestEvent(guestCookie, {
      expectedActionCount: secondHostChoice.battle.actionCount,
      action: { type: "chooseElement", element: "ice" },
    });
    guestChoiceEvent.event.context.params = { battleId: hostBattle.id };
    const activeBattle = (
      (await battleActionHandler(
        guestChoiceEvent.event as unknown as TestEvent,
      )) as LiveBattleActionApiResponse
    ).battle;

    expect(activeBattle.status).toBe("active");
    expect(activeBattle.activePlayerId).toBeTruthy();
    const timedOutPlayerId = activeBattle.activePlayerId!;
    await prisma.privateMatch.update({
      where: { id: started.match!.id },
      data: {
        turnPlayerId: timedOutPlayerId,
        turnDeadlineAt: new Date(Date.now() - 1_000),
      },
    });

    const timeoutObserverEvents = [hostCookie, guestCookie].map((cookie) => {
      const event = createH3TestEvent(cookie);
      event.event.context.params = { battleId: activeBattle.id };
      return event;
    });
    const timedOutBattles = (await Promise.all(
      timeoutObserverEvents.map((event) =>
        battleLiveGetHandler(event.event as unknown as TestEvent),
      ),
    )) as LiveBattleApiResponse[];
    const timedOutBattle = timedOutBattles[0]!;
    expect(timedOutBattles.every((battle) => battle.status === "finished")).toBe(true);
    expect(timedOutBattle.status).toBe("finished");
    expect(timedOutBattle.result).toMatchObject({
      type: "winner",
      loserId: timedOutPlayerId,
    });
    expectCompletePvpResultLoadouts(timedOutBattle, ["devPlayer", guestId]);
    await expect(
      prisma.privateMatch.findUniqueOrThrow({ where: { id: started.match!.id } }),
    ).resolves.toMatchObject({
      status: "finished",
      turnPlayerId: null,
      turnDeadlineAt: null,
      openingDuelDeadlineAt: null,
    });
    const timedOutRecord = await prisma.battleRecord.findUniqueOrThrow({
      where: { id: activeBattle.id },
    });
    expect(
      (JSON.parse(timedOutRecord.actionLogJson) as { type: string; playerId?: string }[]).filter(
        (action) => action.type === "concede" && action.playerId === timedOutPlayerId,
      ),
    ).toHaveLength(1);
    const finishedPrivateState = (await privateMatchGetHandler(
      createH3TestEvent(hostCookie).event,
    )) as PrivateMatchApiResponse;
    expect(finishedPrivateState.match).toBeNull();

    const timeoutMatchCreated = (await privateMatchPostHandler(
      createH3TestEvent(hostCookie, { action: "create" }).event,
    )) as PrivateMatchApiResponse;
    expect(timeoutMatchCreated.match?.id).not.toBe(started.match!.id);
    await privateMatchPostHandler(
      createH3TestEvent(guestCookie, {
        action: "join",
        code: timeoutMatchCreated.match!.code,
      }).event,
    );
    await privateMatchPostHandler(
      createH3TestEvent(guestCookie, {
        action: "ready",
        loadoutId: guestLoadout.id,
        ready: true,
      }).event,
    );
    const timeoutMatchStarted = (await privateMatchPostHandler(
      createH3TestEvent(hostCookie, {
        action: "ready",
        loadoutId: hostLoadout.id,
        ready: true,
      }).event,
    )) as PrivateMatchApiResponse;
    expect(timeoutMatchStarted.match).toMatchObject({
      status: "active",
      openingDuelDeadlineAt: expect.any(String),
    });

    const timeoutChoiceEvent = createH3TestEvent(hostCookie, {
      expectedActionCount: 0,
      action: { type: "chooseElement", element: "electric" },
    });
    timeoutChoiceEvent.event.context.params = { battleId: timeoutMatchStarted.match!.battleId! };
    const timeoutChoice = (await battleActionHandler(
      timeoutChoiceEvent.event as unknown as TestEvent,
    )) as LiveBattleActionApiResponse;
    expect(timeoutChoice.battle.openingDuelChoiceSubmitted).toBe(true);

    await prisma.privateMatch.update({
      where: { id: timeoutMatchStarted.match!.id },
      data: { openingDuelDeadlineAt: new Date(Date.now() - 1_000) },
    });
    const openingTimeoutEvents = [hostCookie, guestCookie].map((cookie) => {
      const event = createH3TestEvent(cookie);
      event.event.context.params = { battleId: timeoutMatchStarted.match!.battleId! };
      return event;
    });
    const openingTimedOutBattles = (await Promise.all(
      openingTimeoutEvents.map((event) =>
        battleLiveGetHandler(event.event as unknown as TestEvent),
      ),
    )) as LiveBattleApiResponse[];
    const openingTimedOutBattle = openingTimedOutBattles[0]!;
    expect(openingTimedOutBattles.every((battle) => battle.status === "finished")).toBe(true);
    expect(openingTimedOutBattle).toMatchObject({
      status: "finished",
      result: { type: "winner", winnerId: "devPlayer", loserId: guestId },
    });
    const openingTimeoutRecord = await prisma.battleRecord.findUniqueOrThrow({
      where: { id: timeoutMatchStarted.match!.battleId! },
    });
    expect(JSON.parse(openingTimeoutRecord.actionLogJson)).toContainEqual({
      type: "resolveOpeningDuelTimeout",
      timedOutPlayerId: guestId,
    });
    expect(
      (JSON.parse(openingTimeoutRecord.actionLogJson) as { type: string }[]).filter(
        (action) => action.type === "resolveOpeningDuelTimeout",
      ),
    ).toHaveLength(1);

    await prisma.privateMatch.delete({ where: { id: timeoutMatchStarted.match!.id } });
    await prisma.battleRecord.delete({ where: { id: timeoutMatchStarted.match!.battleId! } });
    await prisma.privateMatch.delete({ where: { id: started.match!.id } });
    await prisma.battleRecord.delete({ where: { id: started.match!.battleId! } });
    await prisma.player.delete({ where: { id: guestId } });
  });

  it("matches casual players with locked loadouts and supports expiry and cancellation", async () => {
    const guestId = "casualGuest";
    const hostRingId = "devPlayer.ring.casual.locked";
    const replacementRingId = "devPlayer.ring.casual.replacement";
    const guestRingId = `${guestId}.ring.casual`;

    await prisma.player.create({
      data: {
        id: guestId,
        username: "Casual Guest",
        displayName: "Casual Guest",
        credits: 1_000,
        preferences: { create: {} },
      },
    });
    await prisma.inventoryItem.createMany({
      data: [
        {
          id: hostRingId,
          playerId: "devPlayer",
          type: "ring",
          definitionId: "furnaceLink",
          contentVersion: "production-items-v2",
          experience: 0,
          quality: 0,
          socketCount: 1,
          socketedGemInstanceIds: "[]",
        },
        {
          id: replacementRingId,
          playerId: "devPlayer",
          type: "ring",
          definitionId: "ashenLoop",
          contentVersion: "production-items-v2",
          experience: 0,
          quality: 0,
          socketCount: 1,
          socketedGemInstanceIds: "[]",
        },
        {
          id: guestRingId,
          playerId: guestId,
          type: "ring",
          definitionId: "furnaceLink",
          contentVersion: "production-items-v2",
          experience: 0,
          quality: 0,
          socketCount: 1,
          socketedGemInstanceIds: "[]",
        },
      ],
    });
    const [hostLoadout, guestLoadout] = await Promise.all([
      prisma.loadout.create({
        data: {
          playerId: "devPlayer",
          name: "Casual Host",
          rings: { create: { ringItemId: hostRingId, slotIndex: 0 } },
        },
      }),
      prisma.loadout.create({
        data: {
          playerId: guestId,
          name: "Casual Guest",
          rings: { create: { ringItemId: guestRingId, slotIndex: 0 } },
        },
      }),
    ]);
    await Promise.all([
      prisma.player.update({
        where: { id: "devPlayer" },
        data: { activeLoadoutId: hostLoadout.id },
      }),
      prisma.player.update({
        where: { id: guestId },
        data: { activeLoadoutId: guestLoadout.id },
      }),
    ]);

    const hostLogin = createH3TestEvent();
    await createPlayerSession(hostLogin.event, "devPlayer");
    const hostCookie = responseCookie(hostLogin.response, "battleness_session");
    const guestLogin = createH3TestEvent();
    await createPlayerSession(guestLogin.event, guestId);
    const guestCookie = responseCookie(guestLogin.response, "battleness_session");

    const queued = (await casualMatchPostHandler(
      createH3TestEvent(hostCookie, { action: "enter" }).event,
    )) as CasualMatchmakingApiResponse;
    expect(queued).toMatchObject({
      status: "searching",
      activeLoadout: { id: hostLoadout.id, ringCount: 1 },
      queue: { id: expect.any(String) },
      match: null,
    });
    expect(JSON.stringify(queued)).not.toContain(guestId);

    await prisma.loadoutRing.deleteMany({ where: { loadoutId: hostLoadout.id } });
    await prisma.loadoutRing.create({
      data: { loadoutId: hostLoadout.id, ringItemId: replacementRingId, slotIndex: 0 },
    });

    const matchedGuest = (await casualMatchPostHandler(
      createH3TestEvent(guestCookie, { action: "enter" }).event,
    )) as CasualMatchmakingApiResponse;
    expect(matchedGuest).toMatchObject({
      status: "matched",
      match: {
        battleId: expect.any(String),
        opponent: { displayName: "Dev Player", level: 0, rank: null, ready: true },
      },
    });
    const matchedHost = (await casualMatchGetHandler(
      createH3TestEvent(hostCookie).event,
    )) as CasualMatchmakingApiResponse;
    expect(matchedHost).toMatchObject({
      status: "matched",
      match: {
        battleId: matchedGuest.match!.battleId,
        opponent: { displayName: "Casual Guest", level: 0, rank: null, ready: true },
      },
    });
    expectLimitedPvpOpponent(matchedHost.match!.opponent, {
      displayName: "Casual Guest",
      level: 0,
      rank: null,
      ready: true,
    });

    const hostBattleEvent = createH3TestEvent(hostCookie);
    hostBattleEvent.event.context.params = { battleId: matchedGuest.match!.battleId };
    const hostBattle = (await battleLiveGetHandler(
      hostBattleEvent.event as unknown as TestEvent,
    )) as LiveBattleApiResponse;
    expect(hostBattle).toMatchObject({ viewer: { id: "devPlayer" } });
    expect(hostBattle.viewer.rings?.map((ring) => ring.id)).toEqual([hostRingId]);
    expectHiddenPvpLiveLoadout(hostBattle, "casual_pvp");

    const concedeEvent = createH3TestEvent(hostCookie, {
      expectedActionCount: hostBattle.actionCount,
      action: { type: "concede" },
    });
    concedeEvent.event.context.params = { battleId: hostBattle.id };
    const conceded = (await battleActionHandler(
      concedeEvent.event as unknown as TestEvent,
    )) as LiveBattleActionApiResponse;
    expect(conceded.battle).toMatchObject({ status: "finished", reward: null });
    expectCompletePvpResultLoadouts(conceded.battle, ["devPlayer", guestId]);
    await expect(
      prisma.rewardGrant.findFirst({ where: { battleRecordId: hostBattle.id } }),
    ).resolves.toBeNull();

    const completed = (await casualMatchGetHandler(
      createH3TestEvent(hostCookie).event,
    )) as CasualMatchmakingApiResponse;
    expect(completed).toMatchObject({ status: "idle", recentBattleId: hostBattle.id });

    const expiring = (await casualMatchPostHandler(
      createH3TestEvent(hostCookie, { action: "enter" }).event,
    )) as CasualMatchmakingApiResponse;
    await prisma.casualQueueEntry.update({
      where: { id: expiring.queue!.id },
      data: { expiresAt: new Date(Date.now() - 1_000) },
    });
    const expired = (await casualMatchGetHandler(
      createH3TestEvent(hostCookie).event,
    )) as CasualMatchmakingApiResponse;
    expect(expired.status).toBe("idle");
    await expect(
      prisma.casualQueueEntry.findUniqueOrThrow({ where: { id: expiring.queue!.id } }),
    ).resolves.toMatchObject({ status: "expired" });

    const cancellable = (await casualMatchPostHandler(
      createH3TestEvent(hostCookie, { action: "enter" }).event,
    )) as CasualMatchmakingApiResponse;
    const cancelled = (await casualMatchPostHandler(
      createH3TestEvent(hostCookie, { action: "cancel" }).event,
    )) as CasualMatchmakingApiResponse;
    expect(cancelled.status).toBe("idle");
    await expect(
      prisma.casualQueueEntry.findUniqueOrThrow({ where: { id: cancellable.queue!.id } }),
    ).resolves.toMatchObject({ status: "cancelled" });

    const concurrentEntries = await Promise.all([
      casualMatchPostHandler(createH3TestEvent(hostCookie, { action: "enter" }).event),
      casualMatchPostHandler(createH3TestEvent(guestCookie, { action: "enter" }).event),
    ]);
    const concurrentStates = concurrentEntries as CasualMatchmakingApiResponse[];
    expect(concurrentStates).toHaveLength(2);
    const concurrentHost = (await casualMatchGetHandler(
      createH3TestEvent(hostCookie).event,
    )) as CasualMatchmakingApiResponse;
    const concurrentGuest = (await casualMatchGetHandler(
      createH3TestEvent(guestCookie).event,
    )) as CasualMatchmakingApiResponse;
    expect(concurrentHost).toMatchObject({
      status: "matched",
      match: { battleId: expect.any(String), opponent: { displayName: "Casual Guest" } },
    });
    expect(concurrentGuest).toMatchObject({
      status: "matched",
      match: { battleId: concurrentHost.match!.battleId, opponent: { displayName: "Dev Player" } },
    });
    const concurrentPair = await prisma.casualQueueEntry.findMany({
      where: {
        playerId: { in: ["devPlayer", guestId] },
        battleRecordId: concurrentHost.match!.battleId,
      },
    });
    expect(concurrentPair).toHaveLength(2);

    const casualBattles = await prisma.casualQueueEntry.findMany({
      where: { playerId: { in: ["devPlayer", guestId] }, battleRecordId: { not: null } },
      select: { battleRecordId: true },
    });
    const casualBattleIds = [
      ...new Set(
        casualBattles.flatMap((entry) => (entry.battleRecordId ? [entry.battleRecordId] : [])),
      ),
    ];
    await prisma.casualQueueEntry.deleteMany({
      where: { playerId: { in: ["devPlayer", guestId] } },
    });
    await prisma.privateMatch.deleteMany({ where: { battleRecordId: { in: casualBattleIds } } });
    await prisma.battleRecord.deleteMany({ where: { id: { in: casualBattleIds } } });
    await prisma.player.delete({ where: { id: guestId } });
  });

  it("matches ranked players through bilateral acceptance and settles rating once", async () => {
    const guestId = "rankedQueueGuest";
    const hostRingId = "rankedQueueHostRing";
    const guestRingId = "rankedQueueGuestRing";
    await prisma.player.create({
      data: { id: guestId, username: "Ranked Queue Guest", experience: 0, credits: 0 },
    });
    await prisma.inventoryItem.createMany({
      data: [
        {
          id: hostRingId,
          playerId: "devPlayer",
          type: "ring",
          definitionId: "furnaceLink",
          contentVersion: "production-items-v2",
          experience: 0,
          quality: 0,
          socketCount: 1,
          socketedGemInstanceIds: "[]",
        },
        {
          id: guestRingId,
          playerId: guestId,
          type: "ring",
          definitionId: "furnaceLink",
          contentVersion: "production-items-v2",
          experience: 0,
          quality: 0,
          socketCount: 1,
          socketedGemInstanceIds: "[]",
        },
      ],
    });
    const [hostLoadout, guestLoadout] = await Promise.all([
      prisma.loadout.create({
        data: {
          playerId: "devPlayer",
          name: "Ranked Host",
          rings: { create: { ringItemId: hostRingId, slotIndex: 0 } },
        },
      }),
      prisma.loadout.create({
        data: {
          playerId: guestId,
          name: "Ranked Guest",
          rings: { create: { ringItemId: guestRingId, slotIndex: 0 } },
        },
      }),
    ]);
    await Promise.all([
      prisma.player.update({
        where: { id: "devPlayer" },
        data: { activeLoadoutId: hostLoadout.id },
      }),
      prisma.player.update({
        where: { id: guestId },
        data: { activeLoadoutId: guestLoadout.id },
      }),
    ]);

    const hostLogin = createH3TestEvent();
    await createPlayerSession(hostLogin.event, "devPlayer");
    const hostCookie = responseCookie(hostLogin.response, "battleness_session");
    const guestLogin = createH3TestEvent();
    await createPlayerSession(guestLogin.event, guestId);
    const guestCookie = responseCookie(guestLogin.response, "battleness_session");

    const queued = (await rankedMatchPostHandler(
      createH3TestEvent(hostCookie, { action: "enter" }).event,
    )) as RankedMatchmakingApiResponse;
    expect(queued).toMatchObject({
      status: "searching",
      rating: { value: 1500, placementMatches: 0 },
      queue: { ratingRange: 100, heroLevelRange: 2 },
      proposal: null,
      match: null,
    });
    expect(JSON.stringify(queued)).not.toContain(guestId);
    const proposedGuest = (await rankedMatchPostHandler(
      createH3TestEvent(guestCookie, { action: "enter" }).event,
    )) as RankedMatchmakingApiResponse;
    expect(proposedGuest).toMatchObject({
      status: "accepting",
      proposal: {
        accepted: false,
        opponent: { displayName: "Dev Player", level: 0, rank: null, ready: false },
      },
    });
    const proposedHost = (await rankedMatchGetHandler(
      createH3TestEvent(hostCookie).event,
    )) as RankedMatchmakingApiResponse;
    expect(proposedHost).toMatchObject({
      status: "accepting",
      proposal: {
        pairingKey: proposedGuest.proposal!.pairingKey,
        accepted: false,
        opponent: { displayName: "Ranked Queue Guest", level: 0, rank: null, ready: false },
      },
    });
    expectLimitedPvpOpponent(proposedGuest.proposal!.opponent, {
      displayName: "Dev Player",
      level: 0,
      rank: null,
      ready: false,
    });
    expectLimitedPvpOpponent(proposedHost.proposal!.opponent, {
      displayName: "Ranked Queue Guest",
      level: 0,
      rank: null,
      ready: false,
    });

    const acceptanceResults = (await Promise.all([
      rankedMatchPostHandler(createH3TestEvent(hostCookie, { action: "accept" }).event),
      rankedMatchPostHandler(createH3TestEvent(guestCookie, { action: "accept" }).event),
    ])) as RankedMatchmakingApiResponse[];
    const matchedGuest = (await rankedMatchGetHandler(
      createH3TestEvent(guestCookie).event,
    )) as RankedMatchmakingApiResponse;
    expect(matchedGuest).toMatchObject({
      status: "matched",
      match: {
        battleId: expect.any(String),
        opponent: { displayName: "Dev Player", level: 0, rank: null, ready: true },
      },
    });
    expectLimitedPvpOpponent(matchedGuest.match!.opponent, {
      displayName: "Dev Player",
      level: 0,
      rank: null,
      ready: true,
    });
    expect(acceptanceResults.some((state) => state.status === "matched")).toBe(true);
    const matchedProposalEntries = await prisma.rankedQueueEntry.findMany({
      where: { pairingKey: proposedGuest.proposal!.pairingKey },
      select: { status: true, battleRecordId: true },
    });
    expect(matchedProposalEntries).toHaveLength(2);
    expect(matchedProposalEntries.every((entry) => entry.status === "matched")).toBe(true);
    expect(new Set(matchedProposalEntries.map((entry) => entry.battleRecordId))).toEqual(
      new Set([matchedGuest.match!.battleId]),
    );

    const battleEvent = createH3TestEvent(hostCookie);
    battleEvent.event.context.params = { battleId: matchedGuest.match!.battleId };
    const battle = (await battleLiveGetHandler(
      battleEvent.event as unknown as TestEvent,
    )) as LiveBattleApiResponse;
    expect(battle).toMatchObject({ viewer: { id: "devPlayer" } });
    expectHiddenPvpLiveLoadout(battle, "ranked_pvp");

    const concedeEvent = createH3TestEvent(hostCookie, {
      expectedActionCount: battle.actionCount,
      action: { type: "concede" },
    });
    concedeEvent.event.context.params = { battleId: battle.id };
    const conceded = (await battleActionHandler(
      concedeEvent.event as unknown as TestEvent,
    )) as LiveBattleActionApiResponse;
    expect(conceded.battle).toMatchObject({ status: "finished", reward: null });
    expectCompletePvpResultLoadouts(conceded.battle, ["devPlayer", guestId]);
    await expect(
      prisma.rankedRatingAdjustment.count({ where: { battleRecordId: battle.id } }),
    ).resolves.toBe(2);

    const completed = (await rankedMatchGetHandler(
      createH3TestEvent(hostCookie).event,
    )) as RankedMatchmakingApiResponse;
    expect(completed).toMatchObject({
      status: "idle",
      recentBattleId: battle.id,
      rating: { placementMatches: 1 },
    });

    await rankedMatchPostHandler(createH3TestEvent(hostCookie, { action: "enter" }).event);
    await rankedMatchPostHandler(createH3TestEvent(guestCookie, { action: "enter" }).event);
    await prisma.rankedQueueEntry.updateMany({
      where: { playerId: { in: ["devPlayer", guestId] }, status: "waiting" },
      data: { createdAt: new Date(Date.now() - 60_000) },
    });
    await rankedMatchGetHandler(createH3TestEvent(hostCookie).event);
    const declineResults = await Promise.allSettled([
      rankedMatchPostHandler(createH3TestEvent(hostCookie, { action: "decline" }).event),
      rankedMatchPostHandler(createH3TestEvent(hostCookie, { action: "decline" }).event),
    ]);
    expect(declineResults.filter((result) => result.status === "fulfilled")).toHaveLength(1);
    const declined = declineResults.find(
      (result): result is PromiseFulfilledResult<unknown> => result.status === "fulfilled",
    )!.value as RankedMatchmakingApiResponse;
    expect(declined).toMatchObject({
      status: "idle",
      discipline: { missedAcceptances: 1, lockedUntil: expect.any(String) },
    });
    const releasedGuest = (await rankedMatchGetHandler(
      createH3TestEvent(guestCookie).event,
    )) as RankedMatchmakingApiResponse;
    expect(releasedGuest).toMatchObject({
      status: "idle",
      discipline: { missedAcceptances: 0, lockedUntil: null },
    });

    await prisma.rankedQueueDiscipline.update({
      where: { playerId: "devPlayer" },
      data: { missedAcceptances: 0, lockedUntil: null, lastMissedAt: null },
    });
    await rankedMatchPostHandler(createH3TestEvent(hostCookie, { action: "enter" }).event);
    await rankedMatchPostHandler(createH3TestEvent(guestCookie, { action: "enter" }).event);
    await prisma.rankedQueueEntry.updateMany({
      where: { playerId: { in: ["devPlayer", guestId] }, status: "waiting" },
      data: { createdAt: new Date(Date.now() - 60_000) },
    });
    await rankedMatchGetHandler(createH3TestEvent(hostCookie).event);
    const expiringProposal = await prisma.rankedQueueEntry.findFirstOrThrow({
      where: { playerId: "devPlayer", status: "accepting" },
      orderBy: [{ id: "desc" }],
    });
    expect(expiringProposal.pairingKey).toEqual(expect.any(String));
    await prisma.rankedQueueEntry.updateMany({
      where: { pairingKey: expiringProposal.pairingKey! },
      data: { acceptanceDeadlineAt: new Date(Date.now() - 1_000) },
    });
    await Promise.all([
      rankedMatchGetHandler(createH3TestEvent(hostCookie).event),
      rankedMatchGetHandler(createH3TestEvent(guestCookie).event),
    ]);
    const expiredPair = await prisma.rankedQueueEntry.findMany({
      where: { pairingKey: expiringProposal.pairingKey! },
    });
    expect(expiredPair).toHaveLength(2);
    expect(expiredPair.every((entry) => entry.status === "expired")).toBe(true);
    await expect(
      prisma.rankedQueueDiscipline.findUniqueOrThrow({ where: { playerId: "devPlayer" } }),
    ).resolves.toMatchObject({ missedAcceptances: 1 });
    await expect(
      prisma.rankedQueueDiscipline.findUniqueOrThrow({ where: { playerId: guestId } }),
    ).resolves.toMatchObject({ missedAcceptances: 1 });

    const seasonId = completed.season!.id;
    const match = await prisma.privateMatch.findFirstOrThrow({
      where: { battleRecordId: battle.id },
    });
    await prisma.rankedSeason.delete({ where: { id: seasonId } });
    await prisma.privateMatch.delete({ where: { id: match.id } });
    await prisma.battleRecord.delete({ where: { id: battle.id } });
    await prisma.player.delete({ where: { id: guestId } });
  });

  it("orders the ranked top 100 and nearby players deterministically", async () => {
    const login = createH3TestEvent();
    await createPlayerSession(login.event, "devPlayer");
    const cookie = responseCookie(login.response, "battleness_session");
    const rankedState = (await rankedMatchGetHandler(
      createH3TestEvent(cookie).event,
    )) as RankedMatchmakingApiResponse;
    const seasonId = rankedState.season!.id;
    const competitors = [
      {
        id: "leaderboardAlpha",
        username: "Alpha",
        visibility: "public",
        rating: 1800,
        deviation: 120,
        wins: 2,
      },
      {
        id: "leaderboardPrivate",
        username: "Hidden Name",
        visibility: "private",
        rating: 1600,
        deviation: 90,
        wins: 2,
      },
      {
        id: "leaderboardZeta",
        username: "Zeta",
        visibility: "public",
        rating: 1600,
        deviation: 100,
        wins: 8,
      },
      {
        id: "leaderboardLow",
        username: "Low",
        visibility: "public",
        rating: 1200,
        deviation: 80,
        wins: 20,
      },
    ];
    for (const competitor of competitors) {
      await prisma.player.create({
        data: {
          id: competitor.id,
          username: competitor.username,
          profileVisibility: competitor.visibility,
          rankedSeasonRatings: {
            create: {
              seasonId,
              rating: competitor.rating,
              deviation: competitor.deviation,
              placementMatches: 5,
              wins: competitor.wins,
              losses: 1,
              draws: 0,
            },
          },
        },
      });
    }
    await prisma.rankedSeasonRating.update({
      where: { seasonId_playerId: { seasonId, playerId: "devPlayer" } },
      data: {
        rating: 1600,
        deviation: 100,
        placementMatches: 5,
        wins: 10,
        losses: 2,
        draws: 1,
      },
    });

    const leaderboard = (await rankedLeaderboardGetHandler(
      createH3TestEvent(cookie).event,
    )) as RankedLeaderboardApiResponse;
    expect(leaderboard.top.map((entry) => entry.playerId)).toEqual([
      "leaderboardAlpha",
      "leaderboardPrivate",
      "devPlayer",
      "leaderboardZeta",
      "leaderboardLow",
    ]);
    expect(leaderboard.top[0]).toMatchObject({
      position: 1,
      username: "Alpha",
      rating: 1800,
      standing: { tier: "platinum", division: 3 },
    });
    expect(leaderboard.top[1]).toMatchObject({ position: 2, username: null });
    expect(leaderboard.current).toMatchObject({
      position: 3,
      playerId: "devPlayer",
      isCurrentPlayer: true,
      wins: 10,
    });
    expect(leaderboard.nearby.map((entry) => entry.position)).toEqual([1, 2, 3, 4, 5]);

    await prisma.rankedSeasonRating.update({
      where: { seasonId_playerId: { seasonId, playerId: "leaderboardAlpha" } },
      data: { peakRating: 1_920 },
    });
    const publicProfileEvent = createH3TestEvent(cookie);
    publicProfileEvent.event.context.params = { playerId: "leaderboardAlpha" };
    const publicProfile = (await publicPvpProfileGetHandler(
      publicProfileEvent.event,
    )) as PublicPvpProfileApiResponse;
    expect(publicProfile).toEqual({
      profile: {
        playerId: "leaderboardAlpha",
        displayName: "Alpha",
        isCurrentPlayer: false,
      },
      season: { id: seasonId, endsAt: expect.any(String) },
      rating: {
        value: 1_800,
        placementMatches: 5,
        placementTarget: 5,
        standing: { tier: "platinum", division: 3 },
        peakRating: 1_920,
        peakStanding: { tier: "platinum", division: 2 },
        wins: 2,
        losses: 1,
        matchCount: 3,
      },
    });
    expect(publicProfile).not.toHaveProperty("inventory");
    expect(publicProfile).not.toHaveProperty("loadouts");

    const privateProfileEvent = createH3TestEvent(cookie);
    privateProfileEvent.event.context.params = { playerId: "leaderboardPrivate" };
    await expect(publicPvpProfileGetHandler(privateProfileEvent.event)).rejects.toMatchObject({
      statusCode: 404,
    });

    await prisma.player.update({
      where: { id: "devPlayer" },
      data: { profileVisibility: "private" },
    });
    const ownPrivateProfileEvent = createH3TestEvent(cookie);
    ownPrivateProfileEvent.event.context.params = { playerId: "devPlayer" };
    await expect(publicPvpProfileGetHandler(ownPrivateProfileEvent.event)).resolves.toMatchObject({
      profile: { playerId: "devPlayer", isCurrentPlayer: true },
      rating: { value: 1_600, wins: 10, losses: 2, matchCount: 13 },
    });
    await prisma.player.update({
      where: { id: "devPlayer" },
      data: { profileVisibility: "public" },
    });

    await prisma.rankedSeason.delete({ where: { id: seasonId } });
    await prisma.player.deleteMany({
      where: { id: { in: competitors.map((competitor) => competitor.id) } },
    });
  });

  it("completes Google OAuth with browser-bound state, PKCE, and stable account identity", async () => {
    const originalFetch = globalThis.fetch;
    const originalAppEnvironment = process.env.BATTLENESS_APP_ENV;
    process.env.GOOGLE_OAUTH_CLIENT_ID = "google-client-id";
    process.env.GOOGLE_OAUTH_CLIENT_SECRET = "google-client-secret";
    process.env.GOOGLE_OAUTH_REDIRECT_URI = "http://127.0.0.1:3000/api/auth/google/callback";
    process.env.BATTLENESS_APP_ENV = "staging";

    try {
      const start = createH3TestEvent(undefined, undefined, "/api/auth/google?returnTo=%2Fprofile");
      await googleStartHandler(start.event);
      const authorizationLocation = String(start.response.getHeader("location"));
      const authorizationUrl = new URL(authorizationLocation);
      const state = authorizationUrl.searchParams.get("state");
      const codeChallenge = authorizationUrl.searchParams.get("code_challenge");
      const bindingCookie = responseCookie(start.response, "battleness_oauth_binding");

      expect(authorizationUrl.origin).toBe("https://accounts.google.com");
      expect(authorizationUrl.searchParams.get("scope")).toBe("openid profile email");
      expect(authorizationUrl.searchParams.get("code_challenge_method")).toBe("S256");
      expect(state).toBeTruthy();
      expect(codeChallenge).toMatch(/^[A-Za-z0-9_-]{43}$/);

      const storedAttempt = await prisma.oAuthLoginAttempt.findFirstOrThrow();
      expect(storedAttempt.stateHash).toHaveLength(64);
      expect(storedAttempt.stateHash).not.toBe(state);
      expect(storedAttempt.returnTo).toBe("/profile");
      expect(storedAttempt.codeVerifier.length).toBeGreaterThanOrEqual(43);

      const fetchMock = vi
        .fn<typeof fetch>()
        .mockResolvedValueOnce(
          new Response(JSON.stringify({ access_token: "temporary-google-token" }), {
            status: 200,
            headers: { "content-type": "application/json" },
          }),
        )
        .mockResolvedValueOnce(
          new Response(
            JSON.stringify({
              sub: "google-account-123",
              email: "player@example.com",
              email_verified: true,
              name: "Google Player",
            }),
            { status: 200, headers: { "content-type": "application/json" } },
          ),
        );
      globalThis.fetch = fetchMock;

      const callbackUrl = `/api/auth/google/callback?code=authorization-code&state=${encodeURIComponent(state!)}`;
      const callback = createH3TestEvent(bindingCookie, undefined, callbackUrl);
      await googleCallbackHandler(callback.event);

      expect(callback.response.getHeader("location")).toBe("/profile");
      expect(responseCookie(callback.response, "battleness_session")).toContain(
        "battleness_session=",
      );
      expect(await prisma.oAuthLoginAttempt.count()).toBe(0);
      const identity = await prisma.authIdentity.findUniqueOrThrow({
        where: {
          provider_providerAccountId: {
            provider: "google",
            providerAccountId: "google-account-123",
          },
        },
        include: {
          player: {
            include: {
              inventoryItems: { orderBy: { type: "asc" } },
              ringSockets: true,
              gemEnchantments: true,
              equippedRings: true,
              loadouts: { include: { rings: true } },
            },
          },
        },
      });
      expect(identity.email).toBe("player@example.com");
      expect(identity.player.displayName).toBe("Google Player");
      expect(identity.player.onboardingVersion).toBe(3);
      expect(identity.player.inventoryItems).toEqual([
        expect.objectContaining({
          id: `${identity.playerId}.starter.v3.gem`,
          type: "gem",
          definitionId: "emberShard",
        }),
        expect.objectContaining({
          id: `${identity.playerId}.starter.v3.ring`,
          type: "ring",
          definitionId: "ashenLoop",
          equipped: true,
        }),
        expect.objectContaining({
          id: `${identity.playerId}.starter.v3.spell`,
          type: "spell",
          definitionId: "burnI",
        }),
      ]);
      expect(identity.player.ringSockets).toEqual([
        expect.objectContaining({
          ringItemId: `${identity.playerId}.starter.v3.ring`,
          gemItemId: `${identity.playerId}.starter.v3.gem`,
          socketIndex: 0,
        }),
      ]);
      expect(identity.player.gemEnchantments).toEqual([
        expect.objectContaining({
          gemItemId: `${identity.playerId}.starter.v3.gem`,
          targetItemId: `${identity.playerId}.starter.v3.spell`,
          targetType: "spell",
        }),
      ]);
      expect(identity.player.equippedRings).toEqual([
        expect.objectContaining({
          ringItemId: `${identity.playerId}.starter.v3.ring`,
          slotIndex: 0,
        }),
      ]);
      expect(identity.player.activeLoadoutId).toBe(`${identity.playerId}.starter.v3.loadout`);
      expect(identity.player.loadouts).toEqual([
        expect.objectContaining({
          id: `${identity.playerId}.starter.v3.loadout`,
          name: "Starter Loadout",
          rings: [
            expect.objectContaining({
              ringItemId: `${identity.playerId}.starter.v3.ring`,
              slotIndex: 0,
            }),
          ],
        }),
      ]);

      await runAsPlayer(identity.playerId, () => ensurePlayerOnboarding(prisma));
      expect(await prisma.inventoryItem.count({ where: { playerId: identity.playerId } })).toBe(3);
      expect(fetchMock).toHaveBeenCalledTimes(2);
      expect(String(fetchMock.mock.calls[0]?.[1]?.body)).toContain("code_verifier=");
      expect(fetchMock.mock.calls[1]?.[1]?.headers).toMatchObject({
        authorization: "Bearer temporary-google-token",
      });

      await prisma.player.delete({ where: { id: identity.playerId } });
    } finally {
      globalThis.fetch = originalFetch;
      delete process.env.GOOGLE_OAUTH_CLIENT_ID;
      delete process.env.GOOGLE_OAUTH_CLIENT_SECRET;
      delete process.env.GOOGLE_OAUTH_REDIRECT_URI;
      if (originalAppEnvironment === undefined) {
        delete process.env.BATTLENESS_APP_ENV;
      } else {
        process.env.BATTLENESS_APP_ENV = originalAppEnvironment;
      }
    }
  });

  it("marks existing players as onboarded without granting duplicate starter items", async () => {
    const before = await prisma.player.findUniqueOrThrow({
      where: { id: "devPlayer" },
      include: { inventoryItems: true, materialStock: true },
    });

    await runAsPlayer("devPlayer", () => ensurePlayerOnboarding(prisma));

    const after = await prisma.player.findUniqueOrThrow({
      where: { id: "devPlayer" },
      include: { inventoryItems: true, materialStock: true },
    });
    expect(after.onboardingVersion).toBe(3);
    expect(after.inventoryItems).toHaveLength(before.inventoryItems.length);
    expect(after.materialStock).toHaveLength(before.materialStock.length);
    expect(after.inventoryItems.some((item) => item.id.includes(".starter.v3."))).toBe(false);
  });

  it("rejects reusing a content version for different definitions", async () => {
    const state = (await playerHandler({})) as PlayerApiResponse;
    await prisma.contentRelease.update({
      where: { version: state.content.version },
      data: { checksum: "different-definitions" },
    });

    try {
      await expect(playerHandler({})).rejects.toThrow(
        'Content version "production-items-v2" is already registered with different definitions.',
      );
    } finally {
      await prisma.contentRelease.update({
        where: { version: state.content.version },
        data: { checksum: state.content.checksum },
      });
    }
  });

  it("marks legacy inventory rows that predate content provenance", async () => {
    await prisma.inventoryItem.create({
      data: {
        id: "legacy-ring",
        playerId: "devPlayer",
        type: "ring",
        definitionId: "ashenLoop",
        contentVersion: null,
        experience: 0,
        quality: 0,
        socketCount: 1,
      },
    });

    const state = (await playerHandler({})) as PlayerApiResponse;
    expect(state.inventory.find((item) => item.id === "legacy-ring")?.contentVersion).toBe(
      "legacy-unversioned",
    );
    await expect(
      prisma.inventoryItem.findUniqueOrThrow({ where: { id: "legacy-ring" } }),
    ).resolves.toMatchObject({ contentVersion: "legacy-unversioned" });
  });

  it("returns and persists profile display, localization, and audio preferences", async () => {
    const initial = (await profileSettingsGetHandler({})) as ProfileSettingsApiResponse;
    expect(initial).toMatchObject({
      profile: {
        id: "devPlayer",
        username: "Dev Player",
        displayName: "Dev Player",
        visibility: "public",
      },
      preferences: {
        locale: "en",
        theme: "system",
        reducedMotion: false,
        interfaceDensity: "comfortable",
        muted: false,
        masterVolume: 100,
        musicVolume: 70,
        effectsVolume: 80,
      },
    });

    const updated = (await profileSettingsPostHandler({
      body: {
        displayName: "  Arena Tester  ",
        profileVisibility: "private",
        locale: "fr",
        theme: "dark",
        reducedMotion: true,
        interfaceDensity: "compact",
        muted: true,
        masterVolume: 65,
        musicVolume: 40,
        effectsVolume: 75,
      },
    })) as ProfileSettingsApiResponse;

    expect(updated).toMatchObject({
      profile: { displayName: "Arena Tester", visibility: "private" },
      preferences: {
        locale: "fr",
        theme: "dark",
        reducedMotion: true,
        interfaceDensity: "compact",
        muted: true,
        masterVolume: 65,
        musicVolume: 40,
        effectsVolume: 75,
      },
    });
    expect(updated.preferences.updatedAt).not.toBeNull();
    await expect(
      prisma.player.findUniqueOrThrow({ where: { id: "devPlayer" } }),
    ).resolves.toMatchObject({ displayName: "Arena Tester", profileVisibility: "private" });
    await expect(
      prisma.playerPreferences.findUniqueOrThrow({ where: { playerId: "devPlayer" } }),
    ).resolves.toMatchObject({ locale: "fr", theme: "dark", masterVolume: 65 });
  });

  it("rejects invalid profile settings without partially updating the player", async () => {
    const initial = (await profileSettingsGetHandler({})) as ProfileSettingsApiResponse;

    await expect(
      profileSettingsPostHandler({
        body: {
          displayName: "X",
          profileVisibility: "public",
          locale: "en",
          theme: "system",
          reducedMotion: false,
          interfaceDensity: "comfortable",
          muted: false,
          masterVolume: 101,
          musicVolume: 70,
          effectsVolume: 80,
        },
      }),
    ).rejects.toMatchObject({
      statusCode: 400,
      statusMessage: "displayName must contain between 2 and 32 printable characters.",
    });

    const unchanged = (await profileSettingsGetHandler({})) as ProfileSettingsApiResponse;
    expect(unchanged.profile.displayName).toBe(initial.profile.displayName);
    expect(unchanged.preferences.masterVolume).toBe(initial.preferences.masterVolume);
  });

  it("returns the validated campaign catalogue with initial unlock state", async () => {
    const response = (await campaignGetHandler({})) as CampaignApiResponse;

    expect(response.player).toMatchObject({
      id: "devPlayer",
      level: 0,
      activeLoadoutId: null,
    });
    expect(response.progress).toEqual({ completedCount: 0, unlockedCount: 1, totalCount: 3 });
    expect(response.opponents.map((opponent) => opponent.status)).toEqual([
      "available",
      "locked",
      "locked",
    ]);
    expect(response.opponents[0]).toMatchObject({
      id: "emberTrial",
      label: "Ember Trial",
      prerequisite: null,
      rings: [
        {
          definitionId: "ashenLoop",
          gems: [
            {
              definitionId: "emberShard",
              enchantment: { definitionId: "emberImp" },
            },
          ],
        },
      ],
      firstClearReward: {
        credits: 200,
        materials: expect.arrayContaining([
          expect.objectContaining({ materialId: "aluminium", label: "Aluminium", quantity: 1 }),
        ]),
      },
    });
    expect(response.opponents[1]?.prerequisite).toEqual({
      id: "emberTrial",
      label: "Ember Trial",
    });
  });

  it("starts campaign battles, advances the opponent, and persists first-clear progression", async () => {
    const ringItemId = await createAndActivateCampaignTestLoadout();

    await expect(
      campaignStartHandler({
        body: { opponentId: "stormInitiate", requestId: "locked-campaign-start" },
      }),
    ).rejects.toMatchObject({
      statusCode: 400,
      statusMessage: 'Campaign opponent "stormInitiate" is locked until "emberTrial" is cleared.',
    });

    let battle = (await campaignStartHandler({
      body: { opponentId: "emberTrial", requestId: "ember-first-clear" },
    })) as LiveBattleApiResponse;

    expect(battle).toMatchObject({
      id: "ember-first-clear",
      mode: "campaign",
      status: "active",
      activePlayerId: "devPlayer",
      viewer: { rings: [{ id: ringItemId, definitionId: "crownOfThyr" }] },
      opponent: {
        id: "campaign.emberTrial",
        username: "Ember Trial",
      },
    });
    expect(battle.opponent.rings).toBeUndefined();

    const persistedStart = await prisma.battleRecord.findUniqueOrThrow({
      where: { id: battle.id },
    });
    expect(persistedStart).toMatchObject({
      mode: "campaign",
      modeReferenceId: "emberTrial",
      playerOneId: "devPlayer",
    });
    expect(JSON.parse(persistedStart.setupJson)).toMatchObject({
      id: "campaign.emberTrial.ember-first-clear",
      players: [
        { id: "devPlayer" },
        {
          id: "campaign.emberTrial",
          rings: [
            {
              id: "campaign.emberTrial.ring.ashenLoop.1",
              gems: [
                {
                  id: "campaign.emberTrial.gem.emberShard.1.1",
                  enchantment: {
                    type: "monster",
                    resolvedDefinitionId: "campaign.emberTrial.monster.emberImp.1.1",
                  },
                },
              ],
            },
          ],
        },
      ],
    });

    const nextTurn = (await battleActionHandler({
      context: { params: { battleId: battle.id } },
      body: {
        expectedActionCount: battle.actionCount,
        action: { type: "endTurn" },
      },
    })) as LiveBattleActionApiResponse;
    battle = nextTurn.battle;
    expect(battle).toMatchObject({
      status: "active",
      activePlayerId: "devPlayer",
      actionCount: 2,
      viewer: { energy: { current: 2, maxForTurn: 2, turnCount: 2 } },
    });
    expect(nextTurn.events.map((event) => event.type)).toEqual([
      "turnEnded",
      "turnStarted",
      "turnEnded",
      "turnStarted",
    ]);

    const victory = await finishCampaignBattle(battle, ringItemId);

    expect(victory).toMatchObject({
      status: "finished",
      result: { type: "winner", winnerId: "devPlayer" },
      reward: {
        status: "claimed",
        credits: 200,
        heroExperience: 150,
        materials: expect.arrayContaining([
          expect.objectContaining({ materialId: "aluminium", quantity: 1 }),
          expect.objectContaining({ materialId: "sand", quantity: 1 }),
        ]),
      },
    });
    expect(
      await prisma.campaignProgress.findUniqueOrThrow({
        where: {
          playerId_opponentId: { playerId: "devPlayer", opponentId: "emberTrial" },
        },
      }),
    ).toMatchObject({ victoryCount: 1, contentVersion: "production-items-v2" });

    const campaign = (await campaignGetHandler({})) as CampaignApiResponse;
    expect(campaign.progress).toEqual({ completedCount: 1, unlockedCount: 2, totalCount: 3 });
    expect(campaign.opponents[0]).toMatchObject({ status: "completed", victoryCount: 1 });
    expect(campaign.opponents[1]).toMatchObject({ status: "available", victoryCount: 0 });

    const repeatedStart = (await campaignStartHandler({
      body: { opponentId: "emberTrial", requestId: "ember-repeat-clear" },
    })) as LiveBattleApiResponse;
    const repeatedVictory = await finishCampaignBattle(repeatedStart, ringItemId);
    expect(repeatedVictory.reward).toMatchObject({
      status: "claimed",
      credits: 80,
      heroExperience: 60,
      materials: [{ materialId: "aluminium", quantity: 1 }],
    });
    expect(
      await prisma.campaignProgress.findUniqueOrThrow({
        where: {
          playerId_opponentId: { playerId: "devPlayer", opponentId: "emberTrial" },
        },
      }),
    ).toMatchObject({ victoryCount: 2 });
  });

  it("reveals only opponent items that have produced a live combat effect", async () => {
    await createAndActivateCampaignTestLoadout();
    let battle = (await campaignStartHandler({
      body: { opponentId: "emberTrial", requestId: "campaign-staged-reveal" },
    })) as LiveBattleApiResponse;

    expect(battle.opponent.rings).toBeUndefined();

    for (let turn = 1; turn <= 2; turn += 1) {
      const response = (await battleActionHandler({
        context: { params: { battleId: battle.id } },
        body: {
          expectedActionCount: battle.actionCount,
          action: { type: "endTurn" },
        },
      })) as LiveBattleActionApiResponse;
      battle = response.battle;

      if (turn === 1) {
        expect(battle.opponent.rings).toBeUndefined();
      }
    }

    expect(battle.opponent.rings).toEqual([
      expect.objectContaining({
        id: "campaign.emberTrial.ring.ashenLoop.1",
        definitionId: "ashenLoop",
        gems: [
          expect.objectContaining({
            id: "campaign.emberTrial.gem.emberShard.1.1",
            definitionId: "emberShard",
            enchantment: expect.objectContaining({
              type: "monster",
              definitionId: "emberImp",
            }),
          }),
        ],
      }),
    ]);
    expect(JSON.stringify(battle.opponent)).not.toContain("rimeLoop");
  });

  it("crafts a recipe and persists the crafted item plus consumed materials", async () => {
    const response = (await craftHandler({
      body: { recipeId: "craftRingAshenLoop" },
    })) as CraftApiResponse;

    expect(response.crafted).toMatchObject({
      type: "ring",
      definitionId: "ashenLoop",
    });
    expect(response.state.inventory).toHaveLength(1);
    expect(response.state.inventory[0]).toMatchObject({
      type: "ring",
      definitionId: "ashenLoop",
      contentVersion: "production-items-v2",
      damage: 5,
      energyCost: 2,
      cooldown: 2,
    });
    expect(materialQuantity(response.state, "aluminium")).toBe(0);
    expect(materialQuantity(response.state, "iron")).toBe(3);
    expect(materialQuantity(response.state, "sodium")).toBe(3);

    const reloadedState = (await playerHandler({})) as PlayerApiResponse;
    expect(reloadedState.inventory).toHaveLength(1);
    expect(reloadedState.inventory[0]?.id).toBe(response.crafted.id);
    expect(reloadedState.player).toMatchObject({
      experience: 0,
      level: 0,
      maxHealth: 30,
      progression: { nextLevelExperience: 100, experienceRemaining: 100, progressPercent: 0 },
    });
    expect(reloadedState.inventory[0]).toMatchObject({
      level: 1,
      contentVersion: "production-items-v2",
      bonusPercent: 0,
      progression: { nextLevelExperience: 400, progressPercent: 0 },
    });
  });

  it("rejects an unknown recipe without changing persisted state", async () => {
    await expect(craftHandler({ body: { recipeId: "missingRecipe" } })).rejects.toMatchObject({
      statusCode: 400,
      statusMessage: 'Unknown recipe "missingRecipe".',
    });

    const response = (await playerHandler({})) as PlayerApiResponse;
    expect(response.inventory).toHaveLength(0);
  });

  it("rejects craft requests without a recipe id", async () => {
    await expect(craftHandler({ body: {} })).rejects.toMatchObject({
      statusCode: 400,
      statusMessage: "recipeId is required.",
    });
  });

  it("equips and unequips a crafted ring", async () => {
    const crafted = (await craftHandler({
      body: { recipeId: "craftRingAshenLoop" },
    })) as CraftApiResponse;

    const equipped = (await equipmentPostHandler({
      body: { action: "equip", ringItemId: crafted.crafted.id },
    })) as EquipmentApiResponse;

    expect(equipped.equippedRings).toHaveLength(1);
    expect(equipped.equippedRings[0]).toMatchObject({
      id: crafted.crafted.id,
      equipped: true,
      slotIndex: 0,
    });
    expect(equipped.summary).toMatchObject({
      ringCount: 1,
      totalDamage: 5,
      totalSpeed: 2,
    });

    const reloaded = (await equipmentGetHandler({})) as EquipmentApiResponse;
    expect(reloaded.availableRings[0]).toMatchObject({
      id: crafted.crafted.id,
      equipped: true,
      baseDamage: 5,
      baseSpeed: 2,
    });
    const inventoryRing = (await playerHandler({})) as PlayerApiResponse;
    expect(inventoryRing.inventory[0]).toMatchObject({
      id: crafted.crafted.id,
      damage: reloaded.availableRings[0]?.damage,
      energyCost: reloaded.availableRings[0]?.energyCost,
      cooldown: reloaded.availableRings[0]?.cooldown,
    });

    const unequipped = (await equipmentPostHandler({
      body: { action: "unequip", ringItemId: crafted.crafted.id },
    })) as EquipmentApiResponse;

    expect(unequipped.equippedRings).toHaveLength(0);
    expect(unequipped.availableRings[0]).toMatchObject({
      id: crafted.crafted.id,
      equipped: false,
    });
  });

  it("returns resolved equipment metrics with socketed gems and enchantments", async () => {
    await prisma.inventoryItem.createMany({
      data: [
        {
          id: "devPlayer.ring.ashenLoop.metrics",
          playerId: "devPlayer",
          type: "ring",
          definitionId: "ashenLoop",
          contentVersion: "prototype-5",
          experience: 10_000,
          quality: 40,
          socketCount: 1,
          socketedGemInstanceIds: "[]",
          equipped: false,
        },
        {
          id: "devPlayer.gem.emberShard.metrics",
          playerId: "devPlayer",
          type: "gem",
          definitionId: "emberShard",
          contentVersion: "prototype-5",
          experience: 10_000,
          quality: 40,
          socketedGemInstanceIds: "[]",
          equipped: false,
        },
        {
          id: "devPlayer.spell.carbonize.metrics",
          playerId: "devPlayer",
          type: "spell",
          definitionId: "carbonize",
          contentVersion: "prototype-5",
          experience: 10_000,
          quality: 40,
          socketedGemInstanceIds: "[]",
          equipped: false,
        },
      ],
    });
    await prisma.ringSocket.create({
      data: {
        playerId: "devPlayer",
        ringItemId: "devPlayer.ring.ashenLoop.metrics",
        socketIndex: 0,
        gemItemId: "devPlayer.gem.emberShard.metrics",
      },
    });
    await prisma.gemEnchantment.create({
      data: {
        playerId: "devPlayer",
        gemItemId: "devPlayer.gem.emberShard.metrics",
        targetItemId: "devPlayer.spell.carbonize.metrics",
        targetType: "spell",
      },
    });

    const equipment = (await equipmentPostHandler({
      body: { action: "equip", ringItemId: "devPlayer.ring.ashenLoop.metrics" },
    })) as EquipmentApiResponse;
    const ring = equipment.equippedRings[0];

    expect(ring).toMatchObject({
      id: "devPlayer.ring.ashenLoop.metrics",
      damage: 8,
      ringDamage: 6,
      gemDamage: 2,
      spellDamage: 0,
      monsterDamage: 0,
      energyCost: 3,
      cooldown: 3,
      energyPenalty: 1,
      cooldownPenalty: 1.3,
    });
    expect(ring.gems[0]).toMatchObject({
      id: "devPlayer.gem.emberShard.metrics",
      damage: 2,
      energyPenalty: 1,
      cooldownPenalty: 1.3,
      enchantment: {
        id: "devPlayer.spell.carbonize.metrics",
        type: "spell",
        damage: 0,
      },
    });
    expect(equipment.summary).toMatchObject({
      totalDamage: 8,
      totalRingDamage: 6,
      totalGemDamage: 2,
      totalSpellDamage: 0,
      totalMonsterDamage: 0,
      totalEnergyPenalty: 1,
      totalCooldownPenalty: 1.3,
    });

    const inventory = (await playerHandler({})) as PlayerApiResponse;
    const inventoryRing = inventory.inventory.find(
      (item) => item.id === "devPlayer.ring.ashenLoop.metrics",
    );
    const inventoryGem = inventory.inventory.find(
      (item) => item.id === "devPlayer.gem.emberShard.metrics",
    );
    const inventorySpell = inventory.inventory.find(
      (item) => item.id === "devPlayer.spell.carbonize.metrics",
    );

    expect(inventoryRing).toMatchObject({
      baseDamage: ring.baseDamage,
      ringDamage: ring.ringDamage,
      gemDamage: ring.gemDamage,
      spellDamage: ring.spellDamage,
      monsterDamage: ring.monsterDamage,
      damage: ring.damage,
      baseEnergyCost: ring.baseEnergyCost,
      energyCost: ring.energyCost,
      baseCooldown: ring.baseCooldown,
      cooldown: ring.cooldown,
      baseSpeed: ring.baseSpeed,
      speed: ring.speed,
      gems: [
        expect.objectContaining({
          id: "devPlayer.gem.emberShard.metrics",
          speed: ring.gems[0]?.speed,
          enchantment: expect.objectContaining({
            id: "devPlayer.spell.carbonize.metrics",
            speed: ring.gems[0]?.enchantment?.speed,
          }),
        }),
      ],
    });
    expect(inventoryGem).toMatchObject({
      speed: ring.gems[0]?.speed,
      socketIndex: 0,
      socketedRing: {
        id: "devPlayer.ring.ashenLoop.metrics",
        type: "ring",
        definitionId: "ashenLoop",
        label: "Ashen Loop",
      },
      enchantment: expect.objectContaining({ id: "devPlayer.spell.carbonize.metrics" }),
    });
    expect(inventorySpell).toMatchObject({
      speed: ring.gems[0]?.enchantment?.speed,
      energyPenalty: ring.gems[0]?.enchantment?.energyPenalty,
      cooldownPenalty: ring.gems[0]?.enchantment?.cooldownPenalty,
      enchantedGem: {
        id: "devPlayer.gem.emberShard.metrics",
        type: "gem",
        definitionId: "emberShard",
        label: "Ember Shard",
      },
    });
  });

  it("rejects missing and invalid equipment actions", async () => {
    await expect(equipmentPostHandler({ body: {} })).rejects.toMatchObject({
      statusCode: 400,
      statusMessage: "ringItemId is required.",
    });
    await expect(
      equipmentPostHandler({ body: { action: "equip", ringItemId: "missingRing" } }),
    ).rejects.toMatchObject({
      statusCode: 400,
      statusMessage: 'Ring item "missingRing" is not available for this player.',
    });
    await expect(
      equipmentPostHandler({ body: { action: "delete", ringItemId: "missingRing" } }),
    ).rejects.toMatchObject({
      statusCode: 400,
      statusMessage: "action must be equip or unequip.",
    });
  });

  it("enforces the 10-ring equipment limit", async () => {
    const craftedRingIds = Array.from(
      { length: 11 },
      (_, index) => `devPlayer.ring.ashenLoop.limit.${index}`,
    );

    await prisma.inventoryItem.createMany({
      data: craftedRingIds.map((id) => ({
        id,
        playerId: "devPlayer",
        type: "ring",
        definitionId: "ashenLoop",
        contentVersion: "prototype-5",
        experience: 0,
        quality: 0,
        socketCount: 1,
        socketedGemInstanceIds: "[]",
        equipped: false,
      })),
    });

    for (const ringItemId of craftedRingIds.slice(0, 10)) {
      await equipmentPostHandler({ body: { action: "equip", ringItemId } });
    }

    await expect(
      equipmentPostHandler({ body: { action: "equip", ringItemId: craftedRingIds[10] } }),
    ).rejects.toMatchObject({
      statusCode: 400,
      statusMessage: "A player can equip at most 10 rings.",
    });

    const equipment = (await equipmentGetHandler({})) as EquipmentApiResponse;
    expect(equipment.equippedRings).toHaveLength(10);
  });

  it("saves, activates, and deletes a persisted loadout from equipped rings", async () => {
    const crafted = (await craftHandler({
      body: { recipeId: "craftRingAshenLoop" },
    })) as CraftApiResponse;
    await equipmentPostHandler({
      body: { action: "equip", ringItemId: crafted.crafted.id },
    });

    const saved = (await loadoutsPostHandler({
      body: { action: "saveFromEquipped", name: "Starter Loadout" },
    })) as LoadoutsApiResponse;

    expect(saved.currentEquipment.rings).toHaveLength(1);
    expect(saved.loadouts).toHaveLength(1);
    expect(saved.loadouts[0]).toMatchObject({
      name: "Starter Loadout",
      active: false,
      ringCount: 1,
    });
    expect(saved.loadouts[0].rings[0]).toMatchObject({
      id: crafted.crafted.id,
      damage: 5,
      slotIndex: 0,
    });

    const activated = (await loadoutsPostHandler({
      body: { action: "activate", loadoutId: saved.loadouts[0].id },
    })) as LoadoutsApiResponse;

    expect(activated.player.activeLoadoutId).toBe(saved.loadouts[0].id);
    expect(activated.loadouts[0].active).toBe(true);

    const deleted = (await loadoutsPostHandler({
      body: { action: "delete", loadoutId: saved.loadouts[0].id },
    })) as LoadoutsApiResponse;

    expect(deleted.player.activeLoadoutId).toBeNull();
    expect(deleted.loadouts).toHaveLength(0);

    const reloaded = (await loadoutsGetHandler({})) as LoadoutsApiResponse;
    expect(reloaded.loadouts).toHaveLength(0);
  });

  it("sockets and unsockets a gem in a persisted ring", async () => {
    const ring = (await craftHandler({
      body: { recipeId: "craftRingAshenLoop" },
    })) as CraftApiResponse;
    const gem = (await craftHandler({
      body: { recipeId: "craftGemEmberShard" },
    })) as CraftApiResponse;

    const socketed = (await socketPostHandler({
      body: { action: "socket", ringItemId: ring.crafted.id, gemItemId: gem.crafted.id },
    })) as SocketApiResponse;
    const socketedRing = socketed.rings.find((candidate) => candidate.id === ring.crafted.id);
    const socketedGem = socketed.gems.find((candidate) => candidate.id === gem.crafted.id);

    expect(socketedRing?.gems[0]).toMatchObject({
      id: gem.crafted.id,
      socketIndex: 0,
      damage: 2,
    });
    expect(socketedGem).toMatchObject({
      id: gem.crafted.id,
      socketedRingId: ring.crafted.id,
      socketIndex: 0,
    });
    await expectLegacySocketedGemIds(ring.crafted.id, [gem.crafted.id]);

    const unsocketed = (await socketPostHandler({
      body: { action: "unsocket", gemItemId: gem.crafted.id },
    })) as SocketApiResponse;
    const unsocketedRing = unsocketed.rings.find((candidate) => candidate.id === ring.crafted.id);
    const unsocketedGem = unsocketed.gems.find((candidate) => candidate.id === gem.crafted.id);

    expect(unsocketedRing?.gems).toHaveLength(0);
    expect(unsocketedGem).toMatchObject({
      id: gem.crafted.id,
      socketedRingId: null,
      socketIndex: null,
    });
    await expectLegacySocketedGemIds(ring.crafted.id, []);

    const reloaded = (await socketGetHandler({})) as SocketApiResponse;
    expect(reloaded.rings.find((candidate) => candidate.id === ring.crafted.id)?.gems).toHaveLength(
      0,
    );
  });

  it("rejects socketing one gem into multiple rings", async () => {
    const firstRing = (await craftHandler({
      body: { recipeId: "craftRingAshenLoop" },
    })) as CraftApiResponse;
    const secondRing = (await craftHandler({
      body: { recipeId: "craftRingCinderKnot" },
    })) as CraftApiResponse;
    const gem = (await craftHandler({
      body: { recipeId: "craftGemEmberShard" },
    })) as CraftApiResponse;

    await socketPostHandler({
      body: { action: "socket", ringItemId: firstRing.crafted.id, gemItemId: gem.crafted.id },
    });

    await expect(
      socketPostHandler({
        body: { action: "socket", ringItemId: secondRing.crafted.id, gemItemId: gem.crafted.id },
      }),
    ).rejects.toMatchObject({
      statusCode: 400,
      statusMessage: `Gem item "${gem.crafted.id}" is already socketed.`,
    });
  });

  it("improves persisted ring socket capacity by spending credits", async () => {
    const ring = (await craftHandler({
      body: { recipeId: "craftRingAshenLoop" },
    })) as CraftApiResponse;

    const before = (await socketGetHandler({})) as SocketApiResponse;
    expect(before.rings.find((candidate) => candidate.id === ring.crafted.id)).toMatchObject({
      socketCount: 1,
      nextSocketCount: 2,
      socketImprovementCost: 250,
      canImproveSockets: true,
    });

    const improved = (await socketPostHandler({
      body: { action: "improveSockets", ringItemId: ring.crafted.id },
    })) as SocketApiResponse;
    const improvedRing = improved.rings.find((candidate) => candidate.id === ring.crafted.id);

    expect(improved.player.credits).toBe(999_750);
    expect(improvedRing).toMatchObject({
      socketCount: 2,
      nextSocketCount: 3,
      socketImprovementCost: 375,
      canImproveSockets: true,
    });

    const persisted = await prisma.inventoryItem.findUniqueOrThrow({
      where: { id: ring.crafted.id },
    });
    expect(persisted.socketCount).toBe(2);
  });

  it("rejects ring socket capacity improvement without enough credits", async () => {
    const ring = (await craftHandler({
      body: { recipeId: "craftRingAshenLoop" },
    })) as CraftApiResponse;
    await prisma.player.update({
      where: { id: "devPlayer" },
      data: { credits: 0 },
    });

    await expect(
      socketPostHandler({
        body: { action: "improveSockets", ringItemId: ring.crafted.id },
      }),
    ).rejects.toMatchObject({
      statusCode: 400,
      statusMessage: "Not enough credits.",
    });
  });

  it("rejects ring socket capacity improvement at maximum sockets", async () => {
    const ring = (await craftHandler({
      body: { recipeId: "craftRingAshenLoop" },
    })) as CraftApiResponse;
    await prisma.inventoryItem.update({
      where: { id: ring.crafted.id },
      data: { socketCount: 3 },
    });

    const state = (await socketGetHandler({})) as SocketApiResponse;
    expect(state.rings.find((candidate) => candidate.id === ring.crafted.id)).toMatchObject({
      socketCount: 3,
      nextSocketCount: 3,
      socketImprovementCost: null,
      canImproveSockets: false,
    });

    await expect(
      socketPostHandler({
        body: { action: "improveSockets", ringItemId: ring.crafted.id },
      }),
    ).rejects.toMatchObject({
      statusCode: 400,
      statusMessage: "Ring socket count is already at the maximum.",
    });
  });

  it("rejects ring socket capacity improvement for non-ring items", async () => {
    const gem = (await craftHandler({
      body: { recipeId: "craftGemEmberShard" },
    })) as CraftApiResponse;

    await expect(
      socketPostHandler({
        body: { action: "improveSockets", ringItemId: gem.crafted.id },
      }),
    ).rejects.toMatchObject({
      statusCode: 400,
      statusMessage: `Ring item "${gem.crafted.id}" is not available for this player.`,
    });
  });

  it("enchants and unenchant a gem with a persisted spell", async () => {
    const gem = (await craftHandler({
      body: { recipeId: "craftGemEmberShard" },
    })) as CraftApiResponse;
    const spell = (await craftHandler({
      body: { recipeId: "craftSpellCarbonize" },
    })) as CraftApiResponse;

    const enchanted = (await socketPostHandler({
      body: {
        action: "enchant",
        gemItemId: gem.crafted.id,
        targetItemId: spell.crafted.id,
        targetType: "spell",
      },
    })) as SocketApiResponse;
    const enchantedGem = enchanted.gems.find((candidate) => candidate.id === gem.crafted.id);
    const usedTarget = enchanted.enchantmentTargets.find(
      (candidate) => candidate.id === spell.crafted.id,
    );

    expect(enchantedGem?.enchantment).toMatchObject({
      id: spell.crafted.id,
      type: "spell",
      damage: 0,
    });
    expect(usedTarget).toMatchObject({
      id: spell.crafted.id,
      enchantedGemId: gem.crafted.id,
    });

    const unenchant = (await socketPostHandler({
      body: { action: "unenchant", gemItemId: gem.crafted.id },
    })) as SocketApiResponse;

    expect(
      unenchant.gems.find((candidate) => candidate.id === gem.crafted.id)?.enchantment,
    ).toBeNull();
    expect(
      unenchant.enchantmentTargets.find((candidate) => candidate.id === spell.crafted.id)
        ?.enchantedGemId,
    ).toBeNull();
  });

  it("atomically replaces a gem enchantment and returns the previous target to inventory", async () => {
    const gem = (await craftHandler({
      body: { recipeId: "craftGemEmberShard" },
    })) as CraftApiResponse;
    const spell = (await craftHandler({
      body: { recipeId: "craftSpellCarbonize" },
    })) as CraftApiResponse;
    const monster = (await craftHandler({
      body: { recipeId: "craftMonsterEmberImp" },
    })) as CraftApiResponse;

    await socketPostHandler({
      body: {
        action: "enchant",
        gemItemId: gem.crafted.id,
        targetItemId: spell.crafted.id,
        targetType: "spell",
      },
    });
    const replaced = (await socketPostHandler({
      body: {
        action: "enchant",
        gemItemId: gem.crafted.id,
        targetItemId: monster.crafted.id,
        targetType: "monster",
      },
    })) as SocketApiResponse;

    expect(
      replaced.gems.find((candidate) => candidate.id === gem.crafted.id)?.enchantment,
    ).toMatchObject({ id: monster.crafted.id, type: "monster" });
    expect(
      replaced.enchantmentTargets.find((candidate) => candidate.id === spell.crafted.id)
        ?.enchantedGemId,
    ).toBeNull();
    expect(
      replaced.enchantmentTargets.find((candidate) => candidate.id === monster.crafted.id)
        ?.enchantedGemId,
    ).toBe(gem.crafted.id);

    const inventory = (await playerHandler({})) as PlayerApiResponse;
    expect(
      inventory.inventory.find((item) => item.id === gem.crafted.id)?.enchantment,
    ).toMatchObject({ id: monster.crafted.id, type: "monster" });
    expect(
      inventory.inventory.find((item) => item.id === spell.crafted.id)?.enchantedGemId,
    ).toBeNull();
    expect(
      inventory.inventory.find((item) => item.id === monster.crafted.id)?.enchantedGemLabel,
    ).toBe("Ember Shard");
    const inventoryMonster = inventory.inventory.find((item) => item.id === monster.crafted.id);
    const socketMonster = replaced.enchantmentTargets.find(
      (target) => target.id === monster.crafted.id,
    );
    expect(inventoryMonster).toMatchObject({
      cooldown: socketMonster?.cooldown,
      energyPenalty: socketMonster?.energyPenalty,
      cooldownPenalty: socketMonster?.cooldownPenalty,
      speed: socketMonster?.speed,
      enchantedGem: {
        id: gem.crafted.id,
        type: "gem",
        definitionId: "emberShard",
        label: "Ember Shard",
      },
    });
  });

  it("rejects reusing an enchantment target on multiple gems", async () => {
    const firstGem = (await craftHandler({
      body: { recipeId: "craftGemEmberShard" },
    })) as CraftApiResponse;
    const secondGem = (await craftHandler({
      body: { recipeId: "craftGemCinderPearl" },
    })) as CraftApiResponse;
    const spell = (await craftHandler({
      body: { recipeId: "craftSpellCarbonize" },
    })) as CraftApiResponse;

    await socketPostHandler({
      body: {
        action: "enchant",
        gemItemId: firstGem.crafted.id,
        targetItemId: spell.crafted.id,
        targetType: "spell",
      },
    });

    await expect(
      socketPostHandler({
        body: {
          action: "enchant",
          gemItemId: secondGem.crafted.id,
          targetItemId: spell.crafted.id,
          targetType: "spell",
        },
      }),
    ).rejects.toMatchObject({
      statusCode: 400,
      statusMessage: `Spell item "${spell.crafted.id}" is already used as an enchantment.`,
    });
  });

  it("improves persisted item quality by spending credits", async () => {
    const crafted = (await craftHandler({
      body: { recipeId: "craftRingAshenLoop" },
    })) as CraftApiResponse;

    const before = (await qualityGetHandler({})) as QualityApiResponse;
    expect(before.qualityStep).toBe(5);
    expect(before.items.find((item) => item.id === crafted.crafted.id)).toMatchObject({
      quality: 0,
      nextQuality: 5,
      cost: 25,
      canImprove: true,
    });

    const improved = (await qualityPostHandler({
      body: { action: "improveQuality", itemId: crafted.crafted.id },
    })) as QualityApiResponse;
    const improvedItem = improved.items.find((item) => item.id === crafted.crafted.id);

    expect(improved.player.credits).toBe(999_975);
    expect(improvedItem).toMatchObject({
      quality: 5,
      nextQuality: 10,
      cost: 25,
      canImprove: true,
    });

    const persisted = await prisma.inventoryItem.findUniqueOrThrow({
      where: { id: crafted.crafted.id },
    });
    expect(persisted.quality).toBe(5);
  });

  it("rejects quality improvement without enough credits", async () => {
    const crafted = (await craftHandler({
      body: { recipeId: "craftRingAshenLoop" },
    })) as CraftApiResponse;
    await prisma.player.update({
      where: { id: "devPlayer" },
      data: { credits: 0 },
    });

    await expect(
      qualityPostHandler({
        body: { action: "improveQuality", itemId: crafted.crafted.id },
      }),
    ).rejects.toMatchObject({
      statusCode: 400,
      statusMessage: "Not enough credits.",
    });
  });

  it("rejects quality improvement at maximum quality", async () => {
    const crafted = (await craftHandler({
      body: { recipeId: "craftRingAshenLoop" },
    })) as CraftApiResponse;
    await prisma.inventoryItem.update({
      where: { id: crafted.crafted.id },
      data: { quality: 100 },
    });

    const state = (await qualityGetHandler({})) as QualityApiResponse;
    expect(state.items.find((item) => item.id === crafted.crafted.id)).toMatchObject({
      quality: 100,
      nextQuality: 100,
      cost: null,
      canImprove: false,
    });

    await expect(
      qualityPostHandler({
        body: { action: "improveQuality", itemId: crafted.crafted.id },
      }),
    ).rejects.toMatchObject({
      statusCode: 400,
      statusMessage: "Item quality is already at the maximum.",
    });
  });

  it("returns the fixed game market material catalogue", async () => {
    const response = (await marketGameGetHandler({})) as GameMarketApiResponse;

    expect(response.player).toMatchObject({ id: "devPlayer", credits: 1_000_000 });
    expect(response.content.version).toBe("production-items-v2");
    expect(response.materials).toHaveLength(70);
    expect(response.materials.find((material) => material.id === "aluminium")).toMatchObject({
      rarity: "common",
      quantity: 3,
      buyPrice: 10,
      sellPrice: 2,
    });
    expect(response.materials.find((material) => material.rarity === "epic")?.buyPrice).toBe(150);
    expect(response.materials.find((material) => material.rarity === "epic")?.sellPrice).toBe(37);
    expect(response.items).toHaveLength(0);
    expect(response.transactions).toHaveLength(0);
  });

  it("buys game market materials and persists credits plus stock atomically", async () => {
    const response = (await marketGamePostHandler({
      body: {
        action: "buyMaterial",
        materialId: "aluminium",
        quantity: 3,
        requestId: "buy-aluminium-3",
      },
    })) as GameMarketApiResponse;

    expect(response.player.credits).toBe(999_970);
    expect(response.materials.find((material) => material.id === "aluminium")?.quantity).toBe(6);

    const player = await prisma.player.findUniqueOrThrow({ where: { id: "devPlayer" } });
    const stock = await prisma.materialStock.findUniqueOrThrow({
      where: {
        playerId_materialId: { playerId: "devPlayer", materialId: "aluminium" },
      },
    });
    expect(player.credits).toBe(999_970);
    expect(stock.quantity).toBe(6);
    expect(stock.contentVersion).toBe("production-items-v2");
    expect(response.transactions[0]).toMatchObject({
      requestId: "buy-aluminium-3",
      action: "buy",
      resourceId: "aluminium",
      quantity: 3,
      unitPrice: 10,
      creditsDelta: -30,
      contentVersion: "production-items-v2",
    });
    expect(await prisma.marketTransaction.count()).toBe(1);
  });

  it("rejects market purchases without enough credits and preserves stock", async () => {
    await prisma.player.update({
      where: { id: "devPlayer" },
      data: { credits: 0 },
    });

    await expect(
      marketGamePostHandler({
        body: {
          action: "buyMaterial",
          materialId: "aluminium",
          quantity: 1,
          requestId: "buy-without-credits",
        },
      }),
    ).rejects.toMatchObject({
      statusCode: 400,
      statusMessage: "Not enough credits.",
    });

    const stock = await prisma.materialStock.findUniqueOrThrow({
      where: {
        playerId_materialId: { playerId: "devPlayer", materialId: "aluminium" },
      },
    });
    expect(stock.quantity).toBe(3);
    expect(await prisma.marketTransaction.count()).toBe(0);
  });

  it("rejects market purchases for unknown materials or invalid quantities", async () => {
    await expect(
      marketGamePostHandler({
        body: {
          action: "buyMaterial",
          materialId: "missingMaterial",
          quantity: 1,
          requestId: "buy-missing",
        },
      }),
    ).rejects.toMatchObject({
      statusCode: 400,
      statusMessage: 'Unknown material "missingMaterial".',
    });

    await expect(
      marketGamePostHandler({
        body: {
          action: "buyMaterial",
          materialId: "aluminium",
          quantity: 0,
          requestId: "buy-zero",
        },
      }),
    ).rejects.toMatchObject({
      statusCode: 400,
      statusMessage: "quantity must be an integer between 1 and 999.",
    });
  });

  it("sells material stock and persists earned credits plus history atomically", async () => {
    const response = (await marketGamePostHandler({
      body: {
        action: "sellMaterial",
        materialId: "aluminium",
        quantity: 2,
        requestId: "sell-aluminium-2",
      },
    })) as GameMarketApiResponse;

    expect(response.player.credits).toBe(1_000_004);
    expect(response.materials.find((material) => material.id === "aluminium")?.quantity).toBe(1);
    expect(response.transactions[0]).toMatchObject({
      requestId: "sell-aluminium-2",
      action: "sell",
      resourceId: "aluminium",
      quantity: 2,
      unitPrice: 2,
      creditsDelta: 4,
    });

    const player = await prisma.player.findUniqueOrThrow({ where: { id: "devPlayer" } });
    const stock = await prisma.materialStock.findUniqueOrThrow({
      where: {
        playerId_materialId: { playerId: "devPlayer", materialId: "aluminium" },
      },
    });
    expect(player.credits).toBe(1_000_004);
    expect(stock.quantity).toBe(1);
    expect(await prisma.marketTransaction.count()).toBe(1);
  });

  it("rejects selling more material than the player owns without granting credits", async () => {
    await expect(
      marketGamePostHandler({
        body: {
          action: "sellMaterial",
          materialId: "aluminium",
          quantity: 4,
          requestId: "sell-too-many",
        },
      }),
    ).rejects.toMatchObject({
      statusCode: 400,
      statusMessage: "Not enough material stock.",
    });

    const player = await prisma.player.findUniqueOrThrow({ where: { id: "devPlayer" } });
    const stock = await prisma.materialStock.findUniqueOrThrow({
      where: {
        playerId_materialId: { playerId: "devPlayer", materialId: "aluminium" },
      },
    });
    expect(player.credits).toBe(1_000_000);
    expect(stock.quantity).toBe(3);
    expect(await prisma.marketTransaction.count()).toBe(0);
  });

  it("does not apply the same market request twice", async () => {
    const body = {
      action: "buyMaterial",
      materialId: "aluminium",
      quantity: 1,
      requestId: "idempotent-buy",
    };

    await marketGamePostHandler({ body });
    const response = (await marketGamePostHandler({ body })) as GameMarketApiResponse;

    expect(response.player.credits).toBe(999_990);
    expect(response.materials.find((material) => material.id === "aluminium")?.quantity).toBe(4);
    expect(response.transactions).toHaveLength(1);
    expect(await prisma.marketTransaction.count()).toBe(1);
  });

  it("rejects reusing a market request id for a different transaction", async () => {
    await marketGamePostHandler({
      body: {
        action: "buyMaterial",
        materialId: "aluminium",
        quantity: 1,
        requestId: "conflicting-request",
      },
    });

    await expect(
      marketGamePostHandler({
        body: {
          action: "sellMaterial",
          materialId: "aluminium",
          quantity: 1,
          requestId: "conflicting-request",
        },
      }),
    ).rejects.toMatchObject({
      statusCode: 400,
      statusMessage: "requestId was already used for a different market transaction.",
    });

    const response = (await marketGameGetHandler({})) as GameMarketApiResponse;
    expect(response.player.credits).toBe(999_990);
    expect(response.materials.find((material) => material.id === "aluminium")?.quantity).toBe(4);
    expect(response.transactions).toHaveLength(1);
  });

  it("values a crafted ring from its recipe and sells it atomically and idempotently", async () => {
    const crafted = (await craftHandler({
      body: { recipeId: "craftRingAshenLoop" },
    })) as CraftApiResponse;
    const beforeSale = (await marketGameGetHandler({})) as GameMarketApiResponse;
    const saleOption = beforeSale.items.find((item) => item.id === crafted.crafted.id);

    expect(saleOption).toMatchObject({
      type: "ring",
      definitionId: "ashenLoop",
      recipeId: "craftRingAshenLoop",
      recipeValue: 30,
      sellPrice: 7,
      canSell: true,
      blockedReason: null,
      ingredients: [{ materialId: "aluminium", quantity: 3, unitPrice: 10 }],
    });

    const body = {
      action: "sellItem",
      itemId: crafted.crafted.id,
      requestId: "sell-crafted-ember-loop",
    };
    await marketGamePostHandler({ body });
    const response = (await marketGamePostHandler({ body })) as GameMarketApiResponse;

    expect(response.player.credits).toBe(1_000_007);
    expect(response.items.some((item) => item.id === crafted.crafted.id)).toBe(false);
    expect(response.transactions).toHaveLength(1);
    expect(response.transactions[0]).toMatchObject({
      requestId: "sell-crafted-ember-loop",
      action: "sell",
      resourceType: "ring",
      resourceId: crafted.crafted.id,
      resourceDefinitionId: "ashenLoop",
      resourceLabel: "Ashen Loop",
      quantity: 1,
      unitPrice: 7,
      creditsDelta: 7,
    });
    expect(await prisma.inventoryItem.findUnique({ where: { id: crafted.crafted.id } })).toBeNull();
    expect(await prisma.marketTransaction.count()).toBe(1);
  });

  it("allows only one concurrent game-market sale for the same item", async () => {
    const crafted = (await craftHandler({
      body: { recipeId: "craftRingAshenLoop" },
    })) as CraftApiResponse;

    const results = await Promise.allSettled([
      marketGamePostHandler({
        body: {
          action: "sellItem",
          itemId: crafted.crafted.id,
          requestId: "concurrent-item-sale-a",
        },
      }),
      marketGamePostHandler({
        body: {
          action: "sellItem",
          itemId: crafted.crafted.id,
          requestId: "concurrent-item-sale-b",
        },
      }),
    ]);

    expect(results.filter((result) => result.status === "fulfilled")).toHaveLength(1);
    expect(results.filter((result) => result.status === "rejected")).toHaveLength(1);
    expect((await prisma.player.findUniqueOrThrow({ where: { id: "devPlayer" } })).credits).toBe(
      1_000_007,
    );
    expect(await prisma.inventoryItem.findUnique({ where: { id: crafted.crafted.id } })).toBeNull();
    expect(await prisma.marketTransaction.count()).toBe(1);
  });

  it("values every production item from its generated crafting recipe", async () => {
    await prisma.inventoryItem.create({
      data: {
        id: "devPlayer.ring.furnaceLink.manual",
        playerId: "devPlayer",
        type: "ring",
        definitionId: "furnaceLink",
        contentVersion: "production-items-v2",
        experience: 0,
        quality: 0,
        socketCount: 1,
      },
    });

    const state = (await marketGameGetHandler({})) as GameMarketApiResponse;
    expect(state.items[0]).toMatchObject({
      definitionId: "furnaceLink",
      recipeId: "craftRingFurnaceLink",
      recipeValue: 30,
      sellPrice: 7,
      canSell: true,
      blockedReason: null,
    });
    expect(await prisma.marketTransaction.count()).toBe(0);
  });

  it("blocks game-market item sales while an item is equipped, socketed, or enchanted", async () => {
    const ring = (await craftHandler({
      body: { recipeId: "craftRingAshenLoop" },
    })) as CraftApiResponse;
    const gem = (await craftHandler({
      body: { recipeId: "craftGemEmberShard" },
    })) as CraftApiResponse;

    await equipmentPostHandler({ body: { action: "equip", ringItemId: ring.crafted.id } });
    let state = (await marketGameGetHandler({})) as GameMarketApiResponse;
    expect(state.items.find((item) => item.id === ring.crafted.id)?.blockedReason).toBe("equipped");
    await expect(
      marketGamePostHandler({
        body: { action: "sellItem", itemId: ring.crafted.id, requestId: "sell-equipped" },
      }),
    ).rejects.toMatchObject({ statusMessage: "Equipped items cannot be sold." });

    await equipmentPostHandler({ body: { action: "unequip", ringItemId: ring.crafted.id } });
    await socketPostHandler({
      body: { action: "socket", ringItemId: ring.crafted.id, gemItemId: gem.crafted.id },
    });
    state = (await marketGameGetHandler({})) as GameMarketApiResponse;
    expect(state.items.find((item) => item.id === ring.crafted.id)?.blockedReason).toBe(
      "socketedGems",
    );
    expect(state.items.find((item) => item.id === gem.crafted.id)?.blockedReason).toBe("socketed");

    await expect(
      marketGamePostHandler({
        body: { action: "sellItem", itemId: ring.crafted.id, requestId: "sell-socketed-ring" },
      }),
    ).rejects.toMatchObject({
      statusMessage: "Rings containing socketed gems cannot be sold.",
    });

    await socketPostHandler({ body: { action: "unsocket", gemItemId: gem.crafted.id } });
    const spell = (await craftHandler({
      body: { recipeId: "craftSpellCarbonize" },
    })) as CraftApiResponse;
    await socketPostHandler({
      body: {
        action: "enchant",
        gemItemId: gem.crafted.id,
        targetItemId: spell.crafted.id,
        targetType: "spell",
      },
    });
    state = (await marketGameGetHandler({})) as GameMarketApiResponse;
    expect(state.items.find((item) => item.id === gem.crafted.id)?.blockedReason).toBe(
      "enchantment",
    );
    expect(state.items.find((item) => item.id === spell.crafted.id)?.blockedReason).toBe(
      "enchantment",
    );
    await expect(
      marketGamePostHandler({
        body: { action: "sellItem", itemId: spell.crafted.id, requestId: "sell-enchantment" },
      }),
    ).rejects.toMatchObject({
      statusMessage: "Items used by an enchantment cannot be sold.",
    });

    expect((await prisma.player.findUniqueOrThrow({ where: { id: "devPlayer" } })).credits).toBe(
      1_000_000,
    );
    expect(await prisma.marketTransaction.count()).toBe(0);
  });

  it("blocks rings referenced by loadouts or active player-market listings", async () => {
    const loadoutRing = (await craftHandler({
      body: { recipeId: "craftRingAshenLoop" },
    })) as CraftApiResponse;
    const listedRing = (await craftHandler({
      body: { recipeId: "craftRingCinderKnot" },
    })) as CraftApiResponse;
    const loadout = await prisma.loadout.create({
      data: {
        playerId: "devPlayer",
        name: "Protected",
        rings: { create: { ringItemId: loadoutRing.crafted.id, slotIndex: 0 } },
      },
    });
    await marketPlayersPostHandler({
      body: {
        inventoryItemId: listedRing.crafted.id,
        price: 100,
        requestId: "list-ring-before-game-sale",
      },
    });

    const state = (await marketGameGetHandler({})) as GameMarketApiResponse;
    expect(state.items.find((item) => item.id === loadoutRing.crafted.id)?.blockedReason).toBe(
      "loadout",
    );
    expect(state.items.find((item) => item.id === listedRing.crafted.id)?.blockedReason).toBe(
      "marketListing",
    );

    await expect(
      marketGamePostHandler({
        body: {
          action: "sellItem",
          itemId: loadoutRing.crafted.id,
          requestId: "sell-loadout-ring",
        },
      }),
    ).rejects.toMatchObject({ statusMessage: "Items used by a loadout cannot be sold." });
    await expect(
      marketGamePostHandler({
        body: {
          action: "sellItem",
          itemId: listedRing.crafted.id,
          requestId: "sell-listed-ring",
        },
      }),
    ).rejects.toMatchObject({
      statusMessage: "Items listed on the player market cannot be sold.",
    });
    expect(await prisma.loadout.findUnique({ where: { id: loadout.id } })).not.toBeNull();
    expect(await prisma.inventoryItem.count({ where: { playerId: "devPlayer" } })).toBe(2);
    expect(await prisma.marketTransaction.count()).toBe(0);
  });

  it("requires an active loadout before starting a live training battle", async () => {
    await expect(
      battleStartHandler({ body: { requestId: "live-battle-without-loadout" } }),
    ).rejects.toMatchObject({
      statusCode: 400,
      statusMessage: "An active loadout with at least one ring is required.",
    });

    expect(await prisma.battleRecord.count()).toBe(0);
  });

  it("starts and reloads a persistent live battle from the active database loadout", async () => {
    const { ringItemId } = await createAndActivateRingLoadout();
    const requestId = "live-training-battle";
    const started = (await battleStartHandler({
      body: { requestId },
    })) as LiveBattleApiResponse;

    expect(started).toMatchObject({
      id: requestId,
      mode: "training",
      status: "active",
      activePlayerId: "devPlayer",
      actionCount: 1,
      viewer: {
        id: "devPlayer",
      },
      opponent: {
        id: "playerTwo",
      },
    });
    expect(started.viewer.rings?.[0]).toMatchObject({
      id: ringItemId,
      definitionId: "ashenLoop",
      damage: 5,
    });
    expect(started.opponent.rings).toBeUndefined();
    expect(started.opponent).not.toHaveProperty("ringCount");
    expect(JSON.stringify(started)).not.toContain("rimeLoop");
    expect(JSON.stringify(started)).not.toContain("ionSignet");

    const persisted = await prisma.battleRecord.findUniqueOrThrow({ where: { id: requestId } });
    const persistedSetup = JSON.parse(persisted.setupJson) as {
      players: { id: string; rings: { id: string }[] }[];
    };
    expect(persisted).toMatchObject({
      status: "active",
      result: "pending",
      playerOneId: "devPlayer",
      playerTwoId: null,
    });
    expect(persistedSetup.players[0]?.rings.map((ring) => ring.id)).toEqual([ringItemId]);

    const reloaded = (await battleLiveGetHandler({
      context: { params: { battleId: requestId } },
    })) as LiveBattleApiResponse;
    expect(reloaded).toEqual(started);

    const history = (await battleHistoryGetHandler({})) as BattleHistoryApiResponse;
    expect(history.records).toHaveLength(0);
  });

  it("keeps history available when an old finished battle can no longer be replayed", async () => {
    const { ringItemId } = await createAndActivateRingLoadout();
    const started = (await battleStartHandler({
      body: { requestId: "stale-history-replay" },
    })) as LiveBattleApiResponse;
    const persisted = await prisma.battleRecord.findUniqueOrThrow({ where: { id: started.id } });
    const actions = JSON.parse(persisted.actionLogJson) as unknown[];

    await prisma.battleRecord.update({
      where: { id: started.id },
      data: {
        status: "finished",
        result: "win",
        finalStateChecksum: "fnv1a32:stale",
        actionLogJson: JSON.stringify([
          ...actions,
          {
            type: "useRing",
            playerId: "devPlayer",
            ringInstanceId: ringItemId,
            targetId: "devPlayer.monster.missing.1",
          },
        ]),
      },
    });

    const history = (await battleHistoryGetHandler({})) as BattleHistoryApiResponse;
    expect(history.records[0]).toMatchObject({
      id: started.id,
      outcome: "win",
      replayAvailable: false,
      summary: null,
    });
  });

  it("submits live actions authoritatively and advances the passive training opponent", async () => {
    await createAndActivateRingLoadout();
    const started = (await battleStartHandler({
      body: { requestId: "live-action-battle" },
    })) as LiveBattleApiResponse;

    expect(started).toMatchObject({
      activePlayerId: "devPlayer",
      actionCount: 1,
      viewer: { energy: { current: 1, turnCount: 1 } },
    });

    const response = (await battleActionHandler({
      context: { params: { battleId: started.id } },
      body: {
        expectedActionCount: started.actionCount,
        action: { type: "endTurn", playerId: "playerTwo" },
      },
    })) as LiveBattleActionApiResponse;

    expect(response.battle).toMatchObject({
      status: "active",
      activePlayerId: "devPlayer",
      actionCount: 3,
      viewer: { energy: { current: 2, maxForTurn: 2, turnCount: 2 } },
    });
    expect(response.events.map((event) => event.type)).toEqual([
      "turnEnded",
      "turnStarted",
      "turnEnded",
      "turnStarted",
    ]);

    const ringAction = (await battleActionHandler({
      context: { params: { battleId: started.id } },
      body: {
        expectedActionCount: response.battle.actionCount,
        action: {
          type: "useRing",
          ringInstanceId: response.battle.viewer.rings?.[0]?.id,
          targetId: response.battle.opponent.id + ".hero",
        },
      },
    })) as LiveBattleActionApiResponse;
    expect(ringAction.battle).toMatchObject({
      activePlayerId: "devPlayer",
      actionCount: 4,
      viewer: { energy: { current: 0, maxForTurn: 2, turnCount: 2 } },
    });
    expect(ringAction.events.map((event) => event.type)).toEqual([
      "ringUsed",
      "energySpent",
      "damageDealt",
    ]);

    const persisted = await prisma.battleRecord.findUniqueOrThrow({ where: { id: started.id } });
    const actions = JSON.parse(persisted.actionLogJson) as {
      type: string;
      playerId: string;
      ringInstanceId?: string;
    }[];
    expect(actions.slice(0, 3)).toEqual([
      { type: "endTurn", playerId: "playerTwo" },
      { type: "endTurn", playerId: "devPlayer" },
      { type: "endTurn", playerId: "playerTwo" },
    ]);
    expect(actions[3]).toMatchObject({
      type: "useRing",
      playerId: "devPlayer",
      ringInstanceId: response.battle.viewer.rings?.[0]?.id,
    });
  });

  it("rejects stale, invalid, and duplicate concurrent live battle actions", async () => {
    const { ringItemId } = await createAndActivateRingLoadout();
    const started = (await battleStartHandler({
      body: { requestId: "rejected-live-actions" },
    })) as LiveBattleApiResponse;

    await expect(
      battleActionHandler({
        context: { params: { battleId: started.id } },
        body: {
          expectedActionCount: started.actionCount - 1,
          action: { type: "endTurn" },
        },
      }),
    ).rejects.toMatchObject({
      statusCode: 400,
      statusMessage: "Battle state is stale. Reload the latest state before acting.",
    });

    await expect(
      battleActionHandler({
        context: { params: { battleId: started.id } },
        body: {
          expectedActionCount: started.actionCount,
          action: {
            type: "useRing",
            ringInstanceId: `${ringItemId}-forged`,
            targetId: started.opponent.id + ".hero",
          },
        },
      }),
    ).rejects.toMatchObject({
      statusCode: 400,
      statusMessage: expect.stringContaining("was not found for player devPlayer"),
    });

    const duplicateResults = await Promise.allSettled([
      battleActionHandler({
        context: { params: { battleId: started.id } },
        body: { expectedActionCount: started.actionCount, action: { type: "endTurn" } },
      }),
      battleActionHandler({
        context: { params: { battleId: started.id } },
        body: { expectedActionCount: started.actionCount, action: { type: "endTurn" } },
      }),
    ]);
    expect(duplicateResults.filter((result) => result.status === "fulfilled")).toHaveLength(1);
    const acceptedAction = duplicateResults.find(
      (result): result is PromiseFulfilledResult<unknown> => result.status === "fulfilled",
    )!.value as LiveBattleActionApiResponse;

    const persisted = await prisma.battleRecord.findUniqueOrThrow({ where: { id: started.id } });
    expect(JSON.parse(persisted.actionLogJson)).toHaveLength(acceptedAction.battle.actionCount);
  });

  it("persists a finished and replayable live battle after the viewer concedes", async () => {
    const { ringItemId } = await createAndActivateRingLoadout();
    const started = (await battleStartHandler({
      body: { requestId: "conceded-live-battle" },
    })) as LiveBattleApiResponse;
    const response = (await battleActionHandler({
      context: { params: { battleId: started.id } },
      body: {
        expectedActionCount: started.actionCount,
        action: { type: "concede" },
      },
    })) as LiveBattleActionApiResponse;

    expect(response.battle).toMatchObject({
      status: "finished",
      actionCount: started.actionCount + 1,
      result: { type: "winner", winnerId: "playerTwo", loserId: "devPlayer" },
      reward: {
        status: "claimed",
        credits: 30,
        heroExperience: 25,
        materials: [],
        items: [{ inventoryItemId: ringItemId, experience: 8 }],
      },
      summary: {
        actionCount: started.actionCount + 1,
        players: expect.arrayContaining([
          expect.objectContaining({ playerId: "devPlayer", damage: 0 }),
          expect.objectContaining({ playerId: "playerTwo", damage: 0 }),
        ]),
        ringsUsed: [],
        spellsCast: [],
        monstersSummoned: [],
        monstersUsed: [],
        loadouts: expect.arrayContaining([
          expect.objectContaining({
            playerId: "devPlayer",
            rings: [
              expect.objectContaining({
                id: ringItemId,
                definitionId: "ashenLoop",
                damage: 5,
              }),
            ],
          }),
          expect.objectContaining({
            playerId: "playerTwo",
            rings: expect.arrayContaining([expect.objectContaining({ definitionId: "ionSignet" })]),
          }),
        ]),
      },
    });
    const persisted = await prisma.battleRecord.findUniqueOrThrow({ where: { id: started.id } });
    expect(persisted).toMatchObject({
      status: "finished",
      result: "loss",
      winnerPlayerId: null,
    });
    expect(persisted.finalStateChecksum).toMatch(/^fnv1a32:/);
    expect(await prisma.rewardGrant.count()).toBe(1);

    const history = (await battleHistoryGetHandler({})) as BattleHistoryApiResponse;
    expect(history.records[0]).toMatchObject({
      id: started.id,
      outcome: "loss",
      replayAvailable: true,
      reward: {
        status: "claimed",
        credits: 30,
        heroExperience: 25,
        items: [{ inventoryItemId: ringItemId, experience: 8 }],
      },
      summary: {
        loadouts: expect.arrayContaining([
          expect.objectContaining({
            playerId: "devPlayer",
            rings: [expect.objectContaining({ id: ringItemId, definitionId: "ashenLoop" })],
          }),
          expect.objectContaining({
            playerId: "playerTwo",
            rings: expect.arrayContaining([expect.objectContaining({ definitionId: "ionSignet" })]),
          }),
        ]),
      },
    });
  });

  it("automatically settles live participation and ring-use XP exactly once", async () => {
    const { ringItemId, gemItemId, spellItemId } = await createAndActivateEnchantedRingLoadout();
    let battle = (await battleStartHandler({
      body: { requestId: "live-item-experience" },
    })) as LiveBattleApiResponse;

    for (let turnIndex = 0; turnIndex < 2; turnIndex += 1) {
      const turn = (await battleActionHandler({
        context: { params: { battleId: battle.id } },
        body: { expectedActionCount: battle.actionCount, action: { type: "endTurn" } },
      })) as LiveBattleActionApiResponse;
      battle = turn.battle;
    }
    expect(battle.viewer.energy.current).toBe(3);

    const ringUse = (await battleActionHandler({
      context: { params: { battleId: battle.id } },
      body: {
        expectedActionCount: battle.actionCount,
        action: {
          type: "useRing",
          ringInstanceId: ringItemId,
          targetId: battle.opponent.id + ".hero",
        },
      },
    })) as LiveBattleActionApiResponse;
    battle = ringUse.battle;

    const finished = (await battleActionHandler({
      context: { params: { battleId: battle.id } },
      body: { expectedActionCount: battle.actionCount, action: { type: "concede" } },
    })) as LiveBattleActionApiResponse;
    const reward = finished.battle.reward;

    expect(reward).toMatchObject({
      status: "claimed",
      credits: 30,
      heroExperience: 25,
      items: expect.arrayContaining([
        expect.objectContaining({ inventoryItemId: ringItemId, experience: 28 }),
        expect.objectContaining({ inventoryItemId: gemItemId, experience: 28 }),
        expect.objectContaining({ inventoryItemId: spellItemId, experience: 28 }),
      ]),
    });
    expect(finished.battle.summary).toMatchObject({
      actionCount: finished.battle.actionCount,
      players: expect.arrayContaining([
        expect.objectContaining({ playerId: "devPlayer", damage: 7 }),
        expect.objectContaining({ playerId: "playerTwo", damage: 0 }),
      ]),
      ringsUsed: [expect.objectContaining({ id: ringItemId, label: "Ashen Loop", count: 1 })],
      spellsCast: [expect.objectContaining({ id: "carbonize", label: "Carbonize", count: 1 })],
      monstersSummoned: [],
      monstersUsed: [],
    });
    if (!reward) {
      throw new Error("Expected a live battle reward.");
    }

    const [player, rewardedItems, claimedReward] = await Promise.all([
      prisma.player.findUniqueOrThrow({ where: { id: "devPlayer" } }),
      prisma.inventoryItem.findMany({
        where: { id: { in: [ringItemId, gemItemId, spellItemId] } },
      }),
      prisma.rewardGrant.findUniqueOrThrow({ where: { id: reward.id } }),
    ]);
    expect(player).toMatchObject({ credits: 1_000_030, experience: 25 });
    expect(rewardedItems).toHaveLength(3);
    expect(rewardedItems.every((item) => item.experience === 28)).toBe(true);
    expect(claimedReward.status).toBe("claimed");

    const reloaded = (await battleLiveGetHandler({
      context: { params: { battleId: battle.id } },
    })) as LiveBattleApiResponse;
    expect(reloaded.reward).toMatchObject({ status: "claimed", items: reward.items });
  });

  it("makes live battle creation idempotent and protects player ownership", async () => {
    await createAndActivateRingLoadout();
    const body = { requestId: "idempotent-live-battle" };

    const first = (await battleStartHandler({ body })) as LiveBattleApiResponse;
    const repeated = (await battleStartHandler({ body })) as LiveBattleApiResponse;

    expect(repeated).toEqual(first);
    expect(await prisma.battleRecord.count()).toBe(1);
    await expect(
      battleLiveGetHandler({ context: { params: { battleId: "missing-battle" } } }),
    ).rejects.toMatchObject({
      statusCode: 404,
      statusMessage: 'Battle "missing-battle" is not available for this player.',
    });
  });

  it("requires an active loadout before creating a development battle result", async () => {
    await expect(
      developmentBattleResultHandler({
        body: { outcome: "win", requestId: "battle-without-loadout" },
      }),
    ).rejects.toMatchObject({
      statusCode: 400,
      statusMessage: "An active loadout with at least one ring is required.",
    });

    expect(await prisma.battleRecord.count()).toBe(0);
    expect(await prisma.rewardGrant.count()).toBe(0);
  });

  it("persists a verified battle record and automatically granted deterministic reward", async () => {
    const { ringItemId } = await createAndActivateRingLoadout();

    const response = (await developmentBattleResultHandler({
      body: { outcome: "win", requestId: "verified-development-win" },
    })) as DevelopmentBattleResultApiResponse;
    const historyRecord = response.state.records[0];

    expect(response.recordId).toBe("verified-development-win");
    expect(historyRecord).toMatchObject({
      id: "verified-development-win",
      mode: "development",
      outcome: "win",
      actionCount: 1,
      replayAvailable: true,
      reward: {
        status: "claimed",
        credits: 150,
        heroExperience: 100,
        claimedAt: expect.any(String),
        materials: expect.arrayContaining([
          expect.objectContaining({ materialId: "aluminium", quantity: 1 }),
          expect.objectContaining({ materialId: "hydrogen", quantity: 1 }),
          expect.objectContaining({ materialId: "pearl", quantity: 1 }),
          expect.objectContaining({ materialId: "sand", quantity: 1 }),
        ]),
        items: [{ inventoryItemId: ringItemId, experience: 8 }],
      },
    });
    expect(historyRecord?.finalStateChecksum).toMatch(/^fnv1a32:/);

    const record = await prisma.battleRecord.findUniqueOrThrow({
      where: { id: "verified-development-win" },
    });
    expect(JSON.parse(record.actionLogJson)).toEqual([
      expect.objectContaining({ type: "concede", playerId: "playerTwo" }),
    ]);
    expect(JSON.parse(record.resultJson ?? "null")).toMatchObject({ winnerId: "playerOne" });
    expect(await prisma.rewardGrant.count()).toBe(1);
  });

  it("automatically grants a battle reward exactly once and persists every progression currency", async () => {
    const { ringItemId } = await createAndActivateRingLoadout();
    const playerBefore = await prisma.player.findUniqueOrThrow({ where: { id: "devPlayer" } });
    const ringBefore = await prisma.inventoryItem.findUniqueOrThrow({ where: { id: ringItemId } });
    const aluminiumBefore = await materialStockQuantity("aluminium");
    const hydrogenBefore = await materialStockQuantity("hydrogen");

    const created = (await developmentBattleResultHandler({
      body: { outcome: "win", requestId: "claimable-development-win" },
    })) as DevelopmentBattleResultApiResponse;
    const rewardId = created.state.records[0]?.reward?.id;
    expect(rewardId).toBeTruthy();

    expect(created.state.player).toMatchObject({
      credits: playerBefore.credits + 150,
      experience: playerBefore.experience + 100,
      level: 1,
    });
    expect(created.state.records[0]?.reward).toMatchObject({ status: "claimed" });
    expect(created.state.records[0]?.reward?.claimedAt).not.toBeNull();

    const ringAfterFirstClaim = await prisma.inventoryItem.findUniqueOrThrow({
      where: { id: ringItemId },
    });
    expect(ringAfterFirstClaim.experience).toBe(ringBefore.experience + 8);
    expect(await materialStockQuantity("aluminium")).toBe(aluminiumBefore + 1);
    expect(await materialStockQuantity("hydrogen")).toBe(hydrogenBefore + 1);

    await developmentBattleResultHandler({
      body: { outcome: "win", requestId: "claimable-development-win" },
    });

    const playerAfterSecondClaim = await prisma.player.findUniqueOrThrow({
      where: { id: "devPlayer" },
    });
    const ringAfterSecondClaim = await prisma.inventoryItem.findUniqueOrThrow({
      where: { id: ringItemId },
    });
    expect(playerAfterSecondClaim.credits).toBe(playerBefore.credits + 150);
    expect(playerAfterSecondClaim.experience).toBe(playerBefore.experience + 100);
    expect(ringAfterSecondClaim.experience).toBe(ringBefore.experience + 8);
    expect(await materialStockQuantity("aluminium")).toBe(aluminiumBefore + 1);
  });

  it("creates the reduced loss reward without material drops", async () => {
    await createAndActivateRingLoadout();

    const response = (await developmentBattleResultHandler({
      body: { outcome: "loss", requestId: "development-loss" },
    })) as DevelopmentBattleResultApiResponse;

    expect(response.state.records[0]).toMatchObject({
      outcome: "loss",
      reward: {
        status: "claimed",
        credits: 30,
        heroExperience: 25,
        materials: [],
      },
    });
  });

  it("makes development battle result requests idempotent", async () => {
    await createAndActivateRingLoadout();
    const body = { outcome: "win", requestId: "idempotent-development-result" };

    await developmentBattleResultHandler({ body });
    const repeated = (await developmentBattleResultHandler({
      body,
    })) as DevelopmentBattleResultApiResponse;

    expect(repeated.state.records).toHaveLength(1);
    expect(await prisma.battleRecord.count()).toBe(1);
    expect(await prisma.rewardGrant.count()).toBe(1);

    await expect(
      developmentBattleResultHandler({
        body: { outcome: "loss", requestId: body.requestId },
      }),
    ).rejects.toMatchObject({
      statusCode: 400,
      statusMessage: "requestId was already used for a different battle result.",
    });
  });

  it("automatically reconciles legacy unclaimed battle rewards", async () => {
    const { ringItemId } = await createAndActivateRingLoadout();
    const playerBefore = await prisma.player.findUniqueOrThrow({ where: { id: "devPlayer" } });
    const ringBefore = await prisma.inventoryItem.findUniqueOrThrow({ where: { id: ringItemId } });
    const aluminiumBefore = await materialStockQuantity("aluminium");
    const reward = await prisma.rewardGrant.create({
      data: {
        playerId: "devPlayer",
        sourceType: "battle",
        sourceId: "legacy-unclaimed-battle",
        status: "unclaimed",
        credits: 17,
        heroExperience: 11,
        contentVersion: "production-items-v2",
        materials: { create: [{ materialId: "aluminium", quantity: 2 }] },
        items: { create: [{ inventoryItemId: ringItemId, experience: 5 }] },
      },
    });

    await battleHistoryGetHandler({});
    await battleHistoryGetHandler({});

    const [playerAfter, ringAfter, rewardAfter] = await Promise.all([
      prisma.player.findUniqueOrThrow({ where: { id: "devPlayer" } }),
      prisma.inventoryItem.findUniqueOrThrow({ where: { id: ringItemId } }),
      prisma.rewardGrant.findUniqueOrThrow({ where: { id: reward.id } }),
    ]);
    expect(playerAfter.credits).toBe(playerBefore.credits + 17);
    expect(playerAfter.experience).toBe(playerBefore.experience + 11);
    expect(ringAfter.experience).toBe(ringBefore.experience + 5);
    expect(await materialStockQuantity("aluminium")).toBe(aluminiumBefore + 2);
    expect(rewardAfter).toMatchObject({ status: "claimed", claimedAt: expect.any(Date) });
  });

  it("rejects claiming a missing battle reward", async () => {
    await expect(
      battleRewardClaimHandler({ body: { rewardGrantId: "missing-reward" } }),
    ).rejects.toMatchObject({
      statusCode: 400,
      statusMessage: 'Reward grant "missing-reward" is not available for this player.',
    });

    const history = (await battleHistoryGetHandler({})) as BattleHistoryApiResponse;
    expect(history.records).toHaveLength(0);
  });
});

function installNuxtHandlerGlobals(): void {
  const testGlobal = globalThis as TestGlobal;

  testGlobal.defineEventHandler = <T extends ApiHandler>(handler: T) => handler;
  testGlobal.getRouterParam = (event, name) => event.context?.params?.[name];
  testGlobal.readBody = async <T>(event: TestEvent) => event.body as T;
  testGlobal.createError = (input) =>
    Object.assign(new Error(input.statusMessage), {
      statusCode: input.statusCode,
      statusMessage: input.statusMessage,
    });
}

function createH3TestEvent(
  body?: unknown,
  requestBody?: unknown,
  requestUrl = "/",
): {
  event: H3Event;
  response: ServerResponse;
} {
  const request = new IncomingMessage(new Socket());
  request.url = requestUrl;
  if (typeof body === "string") {
    request.headers.cookie = body;
  }
  const response = new ServerResponse(request);
  const event = createEvent(request, response);
  Object.assign(event, { body: requestBody });
  return { event, response };
}

function responseCookie(response: ServerResponse, name: string): string {
  const header = response.getHeader("set-cookie");
  const values = Array.isArray(header) ? header : header ? [String(header)] : [];
  const cookie = values.find((value) => value.startsWith(`${name}=`));
  if (!cookie) {
    throw new Error(`Expected response cookie "${name}".`);
  }
  return cookie.split(";", 1)[0] ?? "";
}

function pushPrismaSchemaToTestDatabase(): void {
  const options = {
    cwd: projectRoot,
    env: { ...process.env, BATTLENESS_DATABASE_URL: testDatabaseUrl, RUST_LOG: "info" },
    stdio: "pipe" as const,
  };

  if (process.platform === "win32") {
    execFileSync(
      "cmd.exe",
      [
        "/d",
        "/s",
        "/c",
        "pnpm.cmd --filter @battleness/web exec prisma db push --schema prisma/schema.prisma --skip-generate",
      ],
      options,
    );
    return;
  }

  execFileSync(
    "pnpm",
    [
      "--filter",
      "@battleness/web",
      "exec",
      "prisma",
      "db",
      "push",
      "--schema",
      "prisma/schema.prisma",
      "--skip-generate",
    ],
    options,
  );
}

function materialQuantity(response: PlayerApiResponse, materialId: string): number | undefined {
  return response.materials.find((material) => material.id === materialId)?.quantity;
}

async function materialStockQuantity(materialId: string): Promise<number> {
  const stock = await prisma.materialStock.findUniqueOrThrow({
    where: { playerId_materialId: { playerId: "devPlayer", materialId } },
  });
  return stock.quantity;
}

async function createAndActivateRingLoadout(): Promise<{ ringItemId: string; loadoutId: string }> {
  const crafted = (await craftHandler({
    body: { recipeId: "craftRingAshenLoop" },
  })) as CraftApiResponse;
  await equipmentPostHandler({
    body: { action: "equip", ringItemId: crafted.crafted.id },
  });
  const saved = (await loadoutsPostHandler({
    body: { action: "saveFromEquipped", name: "Battle Reward Test" },
  })) as LoadoutsApiResponse;
  const loadoutId = saved.loadouts[0]?.id;
  if (!loadoutId) {
    throw new Error("Expected the test loadout to be created.");
  }
  await loadoutsPostHandler({ body: { action: "activate", loadoutId } });

  return { ringItemId: crafted.crafted.id, loadoutId };
}

async function createAndActivateCampaignTestLoadout(): Promise<string> {
  const ringItemId = "devPlayer.ring.crownOfThyr.campaign";
  await prisma.inventoryItem.create({
    data: {
      id: ringItemId,
      playerId: "devPlayer",
      type: "ring",
      definitionId: "crownOfThyr",
      contentVersion: "production-items-v2",
      experience: 250_000,
      quality: 100,
      socketCount: 1,
      socketedGemInstanceIds: "[]",
    },
  });
  const loadout = await prisma.loadout.create({
    data: {
      playerId: "devPlayer",
      name: "Campaign Test",
      rings: { create: { ringItemId, slotIndex: 0 } },
    },
  });
  await prisma.player.update({
    where: { id: "devPlayer" },
    data: { activeLoadoutId: loadout.id },
  });
  return ringItemId;
}

async function finishCampaignBattle(
  initialBattle: LiveBattleApiResponse,
  ringItemId: string,
): Promise<LiveBattleApiResponse> {
  let battle = initialBattle;

  for (let step = 0; step < 20 && battle.status !== "finished"; step += 1) {
    const ring = battle.viewer.rings?.find((candidate) => candidate.id === ringItemId);
    if (!ring) {
      throw new Error("Expected the campaign test ring in the viewer loadout.");
    }
    const canUseRing =
      ring.currentCooldown === 0 && ring.energyCost <= battle.viewer.energy.current;
    const response = (await battleActionHandler({
      context: { params: { battleId: battle.id } },
      body: {
        expectedActionCount: battle.actionCount,
        action: canUseRing
          ? {
              type: "useRing",
              ringInstanceId: ringItemId,
              targetId: battle.opponent.id + ".hero",
            }
          : { type: "endTurn" },
      },
    })) as LiveBattleActionApiResponse;
    battle = response.battle;
  }

  if (battle.status !== "finished") {
    throw new Error("Campaign test battle did not finish within 20 viewer actions.");
  }
  return battle;
}

async function createAndActivateEnchantedRingLoadout(): Promise<{
  ringItemId: string;
  gemItemId: string;
  spellItemId: string;
  loadoutId: string;
}> {
  const ringItemId = "devPlayer.ring.ashenLoop.liveXp";
  const gemItemId = "devPlayer.gem.emberShard.liveXp";
  const spellItemId = "devPlayer.spell.carbonize.liveXp";

  await prisma.inventoryItem.createMany({
    data: [
      {
        id: ringItemId,
        playerId: "devPlayer",
        type: "ring",
        definitionId: "ashenLoop",
        contentVersion: "prototype-5",
        experience: 0,
        quality: 0,
        socketCount: 1,
        socketedGemInstanceIds: "[]",
      },
      {
        id: gemItemId,
        playerId: "devPlayer",
        type: "gem",
        definitionId: "emberShard",
        contentVersion: "prototype-5",
        experience: 0,
        quality: 0,
        socketedGemInstanceIds: "[]",
      },
      {
        id: spellItemId,
        playerId: "devPlayer",
        type: "spell",
        definitionId: "carbonize",
        contentVersion: "prototype-5",
        experience: 0,
        quality: 0,
        socketedGemInstanceIds: "[]",
      },
    ],
  });
  await prisma.ringSocket.create({
    data: {
      playerId: "devPlayer",
      ringItemId,
      socketIndex: 0,
      gemItemId,
    },
  });
  await prisma.gemEnchantment.create({
    data: {
      playerId: "devPlayer",
      gemItemId,
      targetItemId: spellItemId,
      targetType: "spell",
    },
  });
  await equipmentPostHandler({ body: { action: "equip", ringItemId } });
  const saved = (await loadoutsPostHandler({
    body: { action: "saveFromEquipped", name: "Live XP Test" },
  })) as LoadoutsApiResponse;
  const loadoutId = saved.loadouts[0]?.id;
  if (!loadoutId) {
    throw new Error("Expected the live XP test loadout to be created.");
  }
  await loadoutsPostHandler({ body: { action: "activate", loadoutId } });

  return { ringItemId, gemItemId, spellItemId, loadoutId };
}

async function expectLegacySocketedGemIds(
  ringItemId: string,
  expectedGemIds: string[],
): Promise<void> {
  const ring = await prisma.inventoryItem.findUniqueOrThrow({
    where: { id: ringItemId },
  });

  expect(JSON.parse(ring.socketedGemInstanceIds)).toEqual(expectedGemIds);
}
