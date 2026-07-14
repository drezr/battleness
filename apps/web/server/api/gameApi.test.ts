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
    progression: { nextLevelExperience: number | null; progressPercent: number };
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
  baseSpeed: number;
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
    enchantment: null | {
      id: string;
      type: "spell" | "monster";
      definitionId: string;
      damage: number;
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
  transactions: {
    id: string;
    requestId: string;
    action: "buy" | "sell";
    resourceId: string;
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
  viewer: {
    id: string;
    username: string;
    ringCount: number;
    energy: { current: number; maxForTurn: number; turnCount: number };
    rings?: {
      id: string;
      definitionId: string;
      damage: number;
      energyCost: number;
      cooldown: number;
      currentCooldown: number;
    }[];
  };
  opponent: {
    id: string;
    username: string;
    ringCount: number;
    rings?: unknown[];
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
    participants: { playerId: string; slot: string; ready: boolean; loadoutId: string | null }[];
  };
  loadouts: { id: string; name: string; ringCount: number }[];
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
let battleHistoryGetHandler: ApiHandler;
let campaignGetHandler: ApiHandler;
let campaignStartHandler: ApiHandler;
let privateMatchGetHandler: H3ApiHandler;
let privateMatchPostHandler: H3ApiHandler;
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
      battleHistoryGetModule,
      campaignGetModule,
      campaignStartModule,
      privateMatchGetModule,
      privateMatchPostModule,
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
      import("./battle/history.get"),
      import("./campaign.get"),
      import("./battle/campaign/start.post"),
      import("./pvp/private.get"),
      import("./pvp/private.post"),
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
    battleHistoryGetHandler = battleHistoryGetModule.default;
    campaignGetHandler = campaignGetModule.default;
    campaignStartHandler = campaignStartModule.default;
    privateMatchGetHandler = privateMatchGetModule.default;
    privateMatchPostHandler = privateMatchPostModule.default;
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
  }, 30_000);

  beforeEach(async () => {
    await resetHandler({});
  });

  afterAll(async () => {
    await prisma?.$disconnect();
    await disconnectGameStateClientForTests?.();
    rmSync(tempDir, { force: true, recursive: true });
  });

  it("returns seeded player state", async () => {
    const response = (await playerHandler({})) as PlayerApiResponse;

    expect(response.content.version).toBe("prototype-6");
    expect(response.content.checksum).toMatch(/^[a-f0-9]{64}$/);
    expect(response.player).toMatchObject({ id: "devPlayer", credits: 1_000_000 });
    expect(response.materials).toHaveLength(70);
    expect(response.inventory).toHaveLength(0);
    expect(response.recipes).toHaveLength(48);
    expect(response.recipes.every((recipe) => recipe.canCraft)).toBe(true);
    expect(response.materials.every((material) => material.contentVersion === "prototype-6")).toBe(
      true,
    );

    const release = await prisma.contentRelease.findUniqueOrThrow({
      where: { version: "prototype-6" },
    });
    expect(release.checksum).toBe(response.content.checksum);
    expect(JSON.parse(release.manifestJson)).toMatchObject({
      materials: 70,
      recipes: 48,
    });
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
          definitionId: "trainingFlameBand",
          contentVersion: "prototype-6",
          experience: 0,
          quality: 0,
          socketCount: 1,
          socketedGemInstanceIds: "[]",
        },
        {
          id: guestRingId,
          playerId: guestId,
          type: "ring",
          definitionId: "trainingFlameBand",
          contentVersion: "prototype-6",
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
    const reloaded = (await privateMatchGetHandler(
      createH3TestEvent(hostCookie).event,
    )) as PrivateMatchApiResponse;
    expect(reloaded.match?.id).toBe(created.match?.id);

    const joinedEvent = createH3TestEvent(guestCookie, {
      action: "join",
      code: created.match?.code.toLowerCase(),
    });
    const joined = (await privateMatchPostHandler(joinedEvent.event)) as PrivateMatchApiResponse;
    expect(joined.match?.participants.map((participant) => participant.playerId)).toEqual([
      "devPlayer",
      guestId,
    ]);

    const guestReadyEvent = createH3TestEvent(guestCookie, {
      action: "ready",
      loadoutId: guestLoadout.id,
      ready: true,
    });
    const guestReady = (await privateMatchPostHandler(
      guestReadyEvent.event,
    )) as PrivateMatchApiResponse;
    expect(guestReady.match?.status).toBe("waiting");

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

    expect(hostBattle).toMatchObject({ mode: "private_pvp", viewer: { id: "devPlayer" } });
    expect(guestBattle).toMatchObject({ mode: "private_pvp", viewer: { id: guestId } });
    expect(hostBattle.opponent.rings).toBeUndefined();
    expect(guestBattle.opponent.rings).toBeUndefined();

    let activeBattle = hostBattle;
    if (activeBattle.status === "choosingFirstPlayer") {
      const hostChoiceEvent = createH3TestEvent(hostCookie, {
        expectedActionCount: activeBattle.actionCount,
        action: { type: "chooseElement", element: "fire" },
      });
      hostChoiceEvent.event.context.params = { battleId: activeBattle.id };
      const hostChoice = (await battleActionHandler(
        hostChoiceEvent.event as unknown as TestEvent,
      )) as LiveBattleActionApiResponse;
      const guestChoiceEvent = createH3TestEvent(guestCookie, {
        expectedActionCount: hostChoice.battle.actionCount,
        action: { type: "chooseElement", element: "ice" },
      });
      guestChoiceEvent.event.context.params = { battleId: activeBattle.id };
      activeBattle = (
        (await battleActionHandler(
          guestChoiceEvent.event as unknown as TestEvent,
        )) as LiveBattleActionApiResponse
      ).battle;
    }

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

    const timeoutObserverCookie = timedOutPlayerId === "devPlayer" ? guestCookie : hostCookie;
    const timedOutBattleEvent = createH3TestEvent(timeoutObserverCookie);
    timedOutBattleEvent.event.context.params = { battleId: activeBattle.id };
    const timedOutBattle = (await battleLiveGetHandler(
      timedOutBattleEvent.event as unknown as TestEvent,
    )) as LiveBattleApiResponse;
    expect(timedOutBattle.status).toBe("finished");
    expect(timedOutBattle.result).toMatchObject({
      type: "winner",
      loserId: timedOutPlayerId,
    });
    await expect(
      prisma.privateMatch.findUniqueOrThrow({ where: { id: started.match!.id } }),
    ).resolves.toMatchObject({
      status: "finished",
      turnPlayerId: null,
      turnDeadlineAt: null,
    });

    await prisma.privateMatch.delete({ where: { id: started.match!.id } });
    await prisma.battleRecord.delete({ where: { id: started.match!.battleId! } });
    await prisma.player.delete({ where: { id: guestId } });
  });

  it("completes Google OAuth with browser-bound state, PKCE, and stable account identity", async () => {
    const originalFetch = globalThis.fetch;
    process.env.GOOGLE_OAUTH_CLIENT_ID = "google-client-id";
    process.env.GOOGLE_OAUTH_CLIENT_SECRET = "google-client-secret";
    process.env.GOOGLE_OAUTH_REDIRECT_URI = "http://127.0.0.1:3000/api/auth/google/callback";

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
        include: { player: { include: { materialStock: true } } },
      });
      expect(identity.email).toBe("player@example.com");
      expect(identity.player.displayName).toBe("Google Player");
      expect(identity.player.materialStock.length).toBeGreaterThan(0);
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
    }
  });

  it("rejects reusing a content version for different definitions", async () => {
    const state = (await playerHandler({})) as PlayerApiResponse;
    await prisma.contentRelease.update({
      where: { version: state.content.version },
      data: { checksum: "different-definitions" },
    });

    try {
      await expect(playerHandler({})).rejects.toThrow(
        'Content version "prototype-6" is already registered with different definitions.',
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
        definitionId: "emberLoop",
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
          definitionId: "emberLoop",
          gems: [
            {
              definitionId: "rubyShard",
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
      viewer: { rings: [{ id: ringItemId, definitionId: "trainingFlameBand" }] },
      opponent: {
        id: "campaign.emberTrial",
        username: "Ember Trial",
        ringCount: 1,
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
              id: "campaign.emberTrial.ring.emberLoop.1",
              gems: [
                {
                  id: "campaign.emberTrial.gem.rubyShard.1.1",
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
        status: "unclaimed",
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
    ).toMatchObject({ victoryCount: 1, contentVersion: "prototype-6" });

    const campaign = (await campaignGetHandler({})) as CampaignApiResponse;
    expect(campaign.progress).toEqual({ completedCount: 1, unlockedCount: 2, totalCount: 3 });
    expect(campaign.opponents[0]).toMatchObject({ status: "completed", victoryCount: 1 });
    expect(campaign.opponents[1]).toMatchObject({ status: "available", victoryCount: 0 });

    const repeatedStart = (await campaignStartHandler({
      body: { opponentId: "emberTrial", requestId: "ember-repeat-clear" },
    })) as LiveBattleApiResponse;
    const repeatedVictory = await finishCampaignBattle(repeatedStart, ringItemId);
    expect(repeatedVictory.reward).toMatchObject({
      status: "unclaimed",
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

  it("crafts a recipe and persists the crafted item plus consumed materials", async () => {
    const response = (await craftHandler({
      body: { recipeId: "craftRingEmberLoop" },
    })) as CraftApiResponse;

    expect(response.crafted).toMatchObject({
      type: "ring",
      definitionId: "emberLoop",
    });
    expect(response.state.inventory).toHaveLength(1);
    expect(response.state.inventory[0]).toMatchObject({
      type: "ring",
      definitionId: "emberLoop",
      contentVersion: "prototype-6",
    });
    expect(materialQuantity(response.state, "aluminium")).toBe(1);
    expect(materialQuantity(response.state, "iron")).toBe(1);
    expect(materialQuantity(response.state, "sodium")).toBe(1);

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
      contentVersion: "prototype-6",
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
      body: { recipeId: "craftRingEmberLoop" },
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
      totalDamage: 4,
      totalSpeed: 1,
    });

    const reloaded = (await equipmentGetHandler({})) as EquipmentApiResponse;
    expect(reloaded.availableRings[0]).toMatchObject({
      id: crafted.crafted.id,
      equipped: true,
      baseDamage: 4,
      baseSpeed: 1,
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
          id: "devPlayer.ring.emberLoop.metrics",
          playerId: "devPlayer",
          type: "ring",
          definitionId: "emberLoop",
          contentVersion: "prototype-5",
          experience: 10_000,
          quality: 40,
          socketCount: 1,
          socketedGemInstanceIds: "[]",
          equipped: false,
        },
        {
          id: "devPlayer.gem.rubyShard.metrics",
          playerId: "devPlayer",
          type: "gem",
          definitionId: "rubyShard",
          contentVersion: "prototype-5",
          experience: 10_000,
          quality: 40,
          socketedGemInstanceIds: "[]",
          equipped: false,
        },
        {
          id: "devPlayer.spell.firebolt.metrics",
          playerId: "devPlayer",
          type: "spell",
          definitionId: "firebolt",
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
        ringItemId: "devPlayer.ring.emberLoop.metrics",
        socketIndex: 0,
        gemItemId: "devPlayer.gem.rubyShard.metrics",
      },
    });
    await prisma.gemEnchantment.create({
      data: {
        playerId: "devPlayer",
        gemItemId: "devPlayer.gem.rubyShard.metrics",
        targetItemId: "devPlayer.spell.firebolt.metrics",
        targetType: "spell",
      },
    });

    const equipment = (await equipmentPostHandler({
      body: { action: "equip", ringItemId: "devPlayer.ring.emberLoop.metrics" },
    })) as EquipmentApiResponse;
    const ring = equipment.equippedRings[0];

    expect(ring).toMatchObject({
      id: "devPlayer.ring.emberLoop.metrics",
      damage: 12,
      ringDamage: 5,
      gemDamage: 2,
      spellDamage: 5,
      monsterDamage: 0,
      energyCost: 3,
      cooldown: 3,
      energyPenalty: 1,
      cooldownPenalty: 1,
    });
    expect(ring.gems[0]).toMatchObject({
      id: "devPlayer.gem.rubyShard.metrics",
      damage: 2,
      energyPenalty: 1,
      cooldownPenalty: 1,
      enchantment: {
        id: "devPlayer.spell.firebolt.metrics",
        type: "spell",
        damage: 5,
      },
    });
    expect(equipment.summary).toMatchObject({
      totalDamage: 12,
      totalRingDamage: 5,
      totalGemDamage: 2,
      totalSpellDamage: 5,
      totalMonsterDamage: 0,
      totalEnergyPenalty: 1,
      totalCooldownPenalty: 1,
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
      (_, index) => `devPlayer.ring.emberLoop.limit.${index}`,
    );

    await prisma.inventoryItem.createMany({
      data: craftedRingIds.map((id) => ({
        id,
        playerId: "devPlayer",
        type: "ring",
        definitionId: "emberLoop",
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
      body: { recipeId: "craftRingEmberLoop" },
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
      damage: 4,
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
      body: { recipeId: "craftRingEmberLoop" },
    })) as CraftApiResponse;
    const gem = (await craftHandler({
      body: { recipeId: "craftGemRubyShard" },
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
      body: { recipeId: "craftRingEmberLoop" },
    })) as CraftApiResponse;
    const secondRing = (await craftHandler({
      body: { recipeId: "craftRingEmberLoop" },
    })) as CraftApiResponse;
    const gem = (await craftHandler({
      body: { recipeId: "craftGemRubyShard" },
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
      body: { recipeId: "craftRingEmberLoop" },
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
      body: { recipeId: "craftRingEmberLoop" },
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
      body: { recipeId: "craftRingEmberLoop" },
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
      body: { recipeId: "craftGemRubyShard" },
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
      body: { recipeId: "craftGemRubyShard" },
    })) as CraftApiResponse;
    const spell = (await craftHandler({
      body: { recipeId: "craftSpellFirebolt" },
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
      damage: 4,
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

  it("rejects reusing an enchantment target on multiple gems", async () => {
    const firstGem = (await craftHandler({
      body: { recipeId: "craftGemRubyShard" },
    })) as CraftApiResponse;
    const secondGem = (await craftHandler({
      body: { recipeId: "craftGemSparkPrism" },
    })) as CraftApiResponse;
    const spell = (await craftHandler({
      body: { recipeId: "craftSpellFirebolt" },
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
      body: { recipeId: "craftRingEmberLoop" },
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
      body: { recipeId: "craftRingEmberLoop" },
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
      body: { recipeId: "craftRingEmberLoop" },
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
    expect(response.content.version).toBe("prototype-6");
    expect(response.materials).toHaveLength(70);
    expect(response.materials.find((material) => material.id === "aluminium")).toMatchObject({
      rarity: "common",
      quantity: 2,
      buyPrice: 10,
      sellPrice: 5,
    });
    expect(response.materials.find((material) => material.rarity === "epic")?.buyPrice).toBe(150);
    expect(response.materials.find((material) => material.rarity === "epic")?.sellPrice).toBe(75);
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
    expect(response.materials.find((material) => material.id === "aluminium")?.quantity).toBe(5);

    const player = await prisma.player.findUniqueOrThrow({ where: { id: "devPlayer" } });
    const stock = await prisma.materialStock.findUniqueOrThrow({
      where: {
        playerId_materialId: { playerId: "devPlayer", materialId: "aluminium" },
      },
    });
    expect(player.credits).toBe(999_970);
    expect(stock.quantity).toBe(5);
    expect(stock.contentVersion).toBe("prototype-6");
    expect(response.transactions[0]).toMatchObject({
      requestId: "buy-aluminium-3",
      action: "buy",
      resourceId: "aluminium",
      quantity: 3,
      unitPrice: 10,
      creditsDelta: -30,
      contentVersion: "prototype-6",
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
    expect(stock.quantity).toBe(2);
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

    expect(response.player.credits).toBe(1_000_010);
    expect(response.materials.find((material) => material.id === "aluminium")?.quantity).toBe(0);
    expect(response.transactions[0]).toMatchObject({
      requestId: "sell-aluminium-2",
      action: "sell",
      resourceId: "aluminium",
      quantity: 2,
      unitPrice: 5,
      creditsDelta: 10,
    });

    const player = await prisma.player.findUniqueOrThrow({ where: { id: "devPlayer" } });
    const stock = await prisma.materialStock.findUniqueOrThrow({
      where: {
        playerId_materialId: { playerId: "devPlayer", materialId: "aluminium" },
      },
    });
    expect(player.credits).toBe(1_000_010);
    expect(stock.quantity).toBe(0);
    expect(await prisma.marketTransaction.count()).toBe(1);
  });

  it("rejects selling more material than the player owns without granting credits", async () => {
    await expect(
      marketGamePostHandler({
        body: {
          action: "sellMaterial",
          materialId: "aluminium",
          quantity: 3,
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
    expect(stock.quantity).toBe(2);
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
    expect(response.materials.find((material) => material.id === "aluminium")?.quantity).toBe(3);
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
    expect(response.materials.find((material) => material.id === "aluminium")?.quantity).toBe(3);
    expect(response.transactions).toHaveLength(1);
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
        ringCount: 1,
      },
      opponent: {
        id: "playerTwo",
        ringCount: 2,
      },
    });
    expect(started.viewer.rings?.[0]).toMatchObject({
      id: ringItemId,
      definitionId: "emberLoop",
      damage: 4,
    });
    expect(started.opponent.rings).toBeUndefined();
    expect(JSON.stringify(started)).not.toContain("frostSeal");
    expect(JSON.stringify(started)).not.toContain("ironCircle");

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

  it("rejects stale and invalid live battle actions without mutating the journal", async () => {
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

    const persisted = await prisma.battleRecord.findUniqueOrThrow({ where: { id: started.id } });
    expect(JSON.parse(persisted.actionLogJson)).toHaveLength(started.actionCount);
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
        status: "unclaimed",
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
        status: "unclaimed",
        credits: 30,
        heroExperience: 25,
        items: [{ inventoryItemId: ringItemId, experience: 8 }],
      },
    });
  });

  it("settles live participation and ring-use XP exactly once when claimed", async () => {
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
      status: "unclaimed",
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
        expect.objectContaining({ playerId: "devPlayer", damage: 10 }),
        expect.objectContaining({ playerId: "playerTwo", damage: 0 }),
      ]),
      ringsUsed: [expect.objectContaining({ id: ringItemId, label: "Ember Loop", count: 1 })],
      spellsCast: [expect.objectContaining({ id: "firebolt", label: "Firebolt", count: 1 })],
      monstersSummoned: [],
      monstersUsed: [],
    });
    if (!reward) {
      throw new Error("Expected a live battle reward.");
    }

    await battleRewardClaimHandler({ body: { rewardGrantId: reward.id } });
    await battleRewardClaimHandler({ body: { rewardGrantId: reward.id } });

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

  it("persists a verified battle record and an unclaimed deterministic reward", async () => {
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
        status: "unclaimed",
        credits: 150,
        heroExperience: 100,
        claimedAt: null,
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

  it("claims a battle reward exactly once and persists every progression currency", async () => {
    const { ringItemId } = await createAndActivateRingLoadout();
    const created = (await developmentBattleResultHandler({
      body: { outcome: "win", requestId: "claimable-development-win" },
    })) as DevelopmentBattleResultApiResponse;
    const rewardId = created.state.records[0]?.reward?.id;
    expect(rewardId).toBeTruthy();

    const playerBefore = await prisma.player.findUniqueOrThrow({ where: { id: "devPlayer" } });
    const ringBefore = await prisma.inventoryItem.findUniqueOrThrow({ where: { id: ringItemId } });
    const aluminiumBefore = await materialStockQuantity("aluminium");
    const hydrogenBefore = await materialStockQuantity("hydrogen");

    const claimed = (await battleRewardClaimHandler({
      body: { rewardGrantId: rewardId },
    })) as BattleHistoryApiResponse;

    expect(claimed.player).toMatchObject({
      credits: playerBefore.credits + 150,
      experience: playerBefore.experience + 100,
      level: 1,
    });
    expect(claimed.records[0]?.reward).toMatchObject({ status: "claimed" });
    expect(claimed.records[0]?.reward?.claimedAt).not.toBeNull();

    const ringAfterFirstClaim = await prisma.inventoryItem.findUniqueOrThrow({
      where: { id: ringItemId },
    });
    expect(ringAfterFirstClaim.experience).toBe(ringBefore.experience + 8);
    expect(await materialStockQuantity("aluminium")).toBe(aluminiumBefore + 1);
    expect(await materialStockQuantity("hydrogen")).toBe(hydrogenBefore + 1);

    await battleRewardClaimHandler({ body: { rewardGrantId: rewardId } });

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
        status: "unclaimed",
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
    body: { recipeId: "craftRingEmberLoop" },
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
  const ringItemId = "devPlayer.ring.trainingFlameBand.campaign";
  await prisma.inventoryItem.create({
    data: {
      id: ringItemId,
      playerId: "devPlayer",
      type: "ring",
      definitionId: "trainingFlameBand",
      contentVersion: "prototype-6",
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
  const ringItemId = "devPlayer.ring.emberLoop.liveXp";
  const gemItemId = "devPlayer.gem.rubyShard.liveXp";
  const spellItemId = "devPlayer.spell.firebolt.liveXp";

  await prisma.inventoryItem.createMany({
    data: [
      {
        id: ringItemId,
        playerId: "devPlayer",
        type: "ring",
        definitionId: "emberLoop",
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
        definitionId: "rubyShard",
        contentVersion: "prototype-5",
        experience: 0,
        quality: 0,
        socketedGemInstanceIds: "[]",
      },
      {
        id: spellItemId,
        playerId: "devPlayer",
        type: "spell",
        definitionId: "firebolt",
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
