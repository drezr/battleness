import { createHash, randomBytes } from "node:crypto";
import { fileURLToPath } from "node:url";
import { Prisma, PrismaClient, type InventoryItem } from "@prisma/client";
import {
  canCraftRecipe,
  contentVersion,
  craftRecipe,
  createCampaignOpponentBattlePlayer,
  createBattlePlayerFromInventory,
  createBattleSetupFromFixture,
  createMaterialStock,
  definitions,
  experienceForLevel,
  itemBonusPercent,
  levelFromExperience,
  locales,
  MAX_LEVEL,
  QUALITY_IMPROVEMENT_STEP,
  qualityImprovementCost,
  resolveItemStat,
  resolveHeroMaxHealth,
  socketImprovementCost,
  type CraftableItemType,
  type CampaignOpponent,
  type CampaignReward,
  type CraftedItemInstance,
  type GemDefinition,
  type ImprovementRarity,
  type MaterialDefinition,
  type MaterialStock,
  type MonsterDefinition,
  type InventoryFixture,
  type PlayerFixture,
  type RecipeDefinition,
  type RingDefinition,
  type SpellDefinition,
} from "@battleness/content";
import {
  applyBattleAction,
  createBattleRecord,
  createBattleState,
  replayBattleRecord,
  rulesVersion,
  type BattleRecord,
  type BattleAction,
  type BattleSetup,
  type BattleState,
  type ElementType,
  type TargetId,
} from "@battleness/engine";
import { assertValidPlayerGameState } from "./gameStateValidation";
import { publishGameRealtimeEvent } from "./gameRealtime";
import { currentPlayerId, developmentPlayerId } from "./playerContext";

type CraftableDefinition = {
  id: string;
  nameKey: string;
  rarity: string;
  element: string;
};

type MaterialStockRow = {
  materialId: string;
  quantity: number;
  contentVersion: string;
};

type PrismaContext = PrismaClient | Prisma.TransactionClient;
const privateTurnDurationMs = 5 * 60 * 1_000;

export type LiveBattleActionCommand =
  | { type: "chooseElement"; element: ElementType }
  | {
      type: "useRing";
      ringInstanceId: string;
      targetId: string;
      enchantmentTargets?: Record<string, string>;
    }
  | { type: "useMonster"; monsterInstanceId: string; targetId: string }
  | { type: "endTurn" }
  | { type: "concede" };

type EquipmentSpellEnchantmentItem = {
  id: string;
  type: "spell";
  definitionId: string;
  label: string;
  rarity: string;
  element: string;
  level: number;
  quality: number;
  damage: number;
  energyPenalty: number;
  cooldownPenalty: number;
};

type EquipmentMonsterEnchantmentItem = {
  id: string;
  type: "monster";
  definitionId: string;
  label: string;
  rarity: string;
  element: string;
  level: number;
  quality: number;
  damage: number;
  health: number;
  cooldown: number;
  skill: string | null;
};

type EquipmentEnchantmentItem = EquipmentSpellEnchantmentItem | EquipmentMonsterEnchantmentItem;

type EquipmentGemItem = {
  id: string;
  definitionId: string;
  label: string;
  rarity: string;
  element: string;
  experience: number;
  level: number;
  quality: number;
  socketIndex: number;
  damage: number;
  energyPenalty: number;
  cooldownPenalty: number;
  enchantment: EquipmentEnchantmentItem | null;
};

type EquipmentRingItem = ReturnType<typeof toEquipmentRingView>;
type RingSocketRow = {
  ringItemId: string;
  socketIndex: number;
  gemItemId: string;
};
type GemEnchantmentRow = {
  gemItemId: string;
  targetItemId: string;
  targetType: string;
};
type LoadoutRingRow = {
  loadoutId: string;
  ringItemId: string;
  slotIndex: number;
};
type LoadoutRow = {
  id: string;
  name: string;
  rings: readonly LoadoutRingRow[];
};

type ProfileSettingsPlayer = Prisma.PlayerGetPayload<{
  include: { preferences: true };
}>;

type LiveBattlePlayerSource = {
  id: string;
  username: string;
  experience: number;
  activeLoadout: null | {
    rings: readonly { ringItemId: string }[];
  };
  inventoryItems: readonly InventoryItem[];
  ringSockets: readonly RingSocketRow[];
  gemEnchantments: readonly GemEnchantmentRow[];
};

type RewardGrantViewSource = {
  id: string;
  status: string;
  credits: number;
  heroExperience: number;
  contentVersion: string | null;
  claimedAt: Date | null;
  materials: readonly { materialId: string; quantity: number }[];
  items: readonly {
    inventoryItemId: string;
    experience: number;
    inventoryItem: { definitionId: string; type: string };
  }[];
};

type BattleOutcome = "win" | "draw" | "loss";

const developmentStartingCredits = 1_000_000;
const maxEquippedRings = 10;
const maxLoadoutRings = 10;
const maxRingSockets = 3;
const participationItemExperience = 8;
const usedItemExperience = 20;
const legacyContentVersion = "legacy-unversioned";
const contentManifest = {
  campaignOpponents: definitions.campaignOpponents.length,
  gems: definitions.gems.length,
  materials: definitions.materials.length,
  monsters: definitions.monsters.length,
  recipes: definitions.recipes.length,
  rings: definitions.rings.length,
  spells: definitions.spells.length,
} as const;
const contentManifestJson = JSON.stringify(contentManifest);
const contentChecksum = createHash("sha256").update(JSON.stringify(definitions)).digest("hex");
const defaultDatabaseUrl = `file:${fileURLToPath(
  new URL("../../data/battleness.prisma.sqlite", import.meta.url),
).replace(/\\/g, "/")}`;
const globalForPrisma = globalThis as typeof globalThis & {
  battlenessPrisma?: PrismaClient;
  battlenessPrismaUrl?: string;
};

export type WebPlayerState = Awaited<ReturnType<typeof getPlayerState>>;

export type ProfileSettingsInput = {
  displayName: string;
  profileVisibility: string;
  locale: string;
  theme: string;
  reducedMotion: boolean;
  interfaceDensity: string;
  muted: boolean;
  masterVolume: number;
  musicVolume: number;
  effectsVolume: number;
};

const materialBuyPrices: Record<string, number> = {
  common: 10,
  refined: 25,
  rare: 60,
  epic: 150,
};

export async function getPlayerState() {
  const prisma = usePrisma();

  await seedDevelopmentPlayer(prisma);
  await assertValidPlayerGameState(prisma, currentPlayerId());

  const player = await prisma.player.findUniqueOrThrow({
    where: { id: currentPlayerId() },
    include: {
      inventoryItems: { orderBy: { createdAt: "desc" } },
      materialStock: true,
    },
  });
  const stock = materialStockFromRows(player.materialStock);

  return {
    content: {
      version: contentVersion,
      checksum: contentChecksum,
    },
    player: {
      id: player.id,
      username: player.username,
      displayName: player.displayName ?? player.username,
      experience: player.experience,
      level: levelFromExperience(player.experience),
      maxHealth: resolveHeroMaxHealth(levelFromExperience(player.experience)),
      progression: toExperienceProgression(player.experience),
      credits: player.credits,
    },
    materials: definitions.materials.map((material) => ({
      id: material.id,
      label: label(material.nameKey),
      description: label(material.descriptionKey),
      rarity: material.rarity,
      craftingFamily: material.craftingFamily,
      realWorldType: material.realWorldType,
      chemicalSymbol: material.chemicalSymbol ?? null,
      atomicNumber: material.atomicNumber ?? null,
      quantity: stock[material.id] ?? 0,
      contentVersion:
        player.materialStock.find((row) => row.materialId === material.id)?.contentVersion ??
        legacyContentVersion,
    })),
    inventory: player.inventoryItems.map(toInventoryView),
    recipes: definitions.recipes.map((recipe) => toRecipeView(recipe, stock)),
  };
}

export async function getProfileSettings() {
  const prisma = usePrisma();

  await seedDevelopmentPlayer(prisma);
  const player = await prisma.player.findUniqueOrThrow({
    where: { id: currentPlayerId() },
    include: { preferences: true },
  });

  return toProfileSettingsView(player);
}

export async function updateProfileSettings(input: ProfileSettingsInput) {
  const settings = normalizeProfileSettingsInput(input);
  const prisma = usePrisma();

  await seedDevelopmentPlayer(prisma);
  await prisma.$transaction(async (transaction) => {
    await transaction.player.update({
      where: { id: currentPlayerId() },
      data: {
        displayName: settings.displayName,
        profileVisibility: settings.profileVisibility,
        lastActiveAt: new Date(),
      },
    });
    await transaction.playerPreferences.upsert({
      where: { playerId: currentPlayerId() },
      create: {
        playerId: currentPlayerId(),
        locale: settings.locale,
        theme: settings.theme,
        reducedMotion: settings.reducedMotion,
        interfaceDensity: settings.interfaceDensity,
        muted: settings.muted,
        masterVolume: settings.masterVolume,
        musicVolume: settings.musicVolume,
        effectsVolume: settings.effectsVolume,
      },
      update: {
        locale: settings.locale,
        theme: settings.theme,
        reducedMotion: settings.reducedMotion,
        interfaceDensity: settings.interfaceDensity,
        muted: settings.muted,
        masterVolume: settings.masterVolume,
        musicVolume: settings.musicVolume,
        effectsVolume: settings.effectsVolume,
      },
    });
  });

  return getProfileSettings();
}

export async function getGameMarketState() {
  const prisma = usePrisma();

  await seedDevelopmentPlayer(prisma);
  await assertValidPlayerGameState(prisma, currentPlayerId());

  const player = await prisma.player.findUniqueOrThrow({
    where: { id: currentPlayerId() },
    include: {
      materialStock: true,
      marketTransactions: {
        orderBy: [{ createdAt: "desc" }, { id: "desc" }],
        take: 20,
      },
    },
  });
  const stock = materialStockFromRows(player.materialStock);

  return {
    content: {
      version: contentVersion,
      checksum: contentChecksum,
    },
    player: {
      id: player.id,
      username: player.username,
      credits: player.credits,
    },
    materials: definitions.materials.map((material) => ({
      id: material.id,
      label: label(material.nameKey),
      description: label(material.descriptionKey),
      rarity: material.rarity,
      craftingFamily: material.craftingFamily,
      realWorldType: material.realWorldType,
      chemicalSymbol: material.chemicalSymbol ?? null,
      atomicNumber: material.atomicNumber ?? null,
      quantity: stock[material.id] ?? 0,
      contentVersion:
        player.materialStock.find((row) => row.materialId === material.id)?.contentVersion ??
        legacyContentVersion,
      buyPrice: materialBuyPrice(material),
      sellPrice: materialSellPrice(material),
    })),
    transactions: player.marketTransactions.map((transaction) => {
      const material = getMaterialDefinition(transaction.resourceId);

      return {
        id: transaction.id,
        requestId: transaction.requestId,
        action: transaction.action,
        resourceType: transaction.resourceType,
        resourceId: transaction.resourceId,
        resourceLabel: label(material.nameKey),
        quantity: transaction.quantity,
        unitPrice: transaction.unitPrice,
        creditsDelta: transaction.creditsDelta,
        contentVersion: transaction.contentVersion,
        createdAt: transaction.createdAt.toISOString(),
      };
    }),
  };
}

export async function buyGameMarketMaterial(
  materialId: string,
  quantity: number,
  requestId: string,
) {
  assertMarketQuantity(quantity);
  assertMarketRequestId(requestId);
  const material = getMaterialDefinition(materialId);
  const unitPrice = materialBuyPrice(material);
  const totalCost = unitPrice * quantity;
  const prisma = usePrisma();

  await seedDevelopmentPlayer(prisma);

  await prisma.$transaction(async (transaction) => {
    const existing = await transaction.marketTransaction.findUnique({ where: { requestId } });

    if (existing) {
      assertMatchingMarketTransaction(existing, {
        action: "buy",
        materialId,
        quantity,
        unitPrice,
      });
      return;
    }

    const payment = await transaction.player.updateMany({
      where: {
        id: currentPlayerId(),
        credits: { gte: totalCost },
      },
      data: { credits: { decrement: totalCost } },
    });

    if (payment.count !== 1) {
      throw new Error("Not enough credits.");
    }

    await transaction.materialStock.upsert({
      where: {
        playerId_materialId: {
          playerId: currentPlayerId(),
          materialId,
        },
      },
      create: {
        playerId: currentPlayerId(),
        materialId,
        quantity,
        contentVersion,
      },
      update: { quantity: { increment: quantity }, contentVersion },
    });

    await transaction.marketTransaction.create({
      data: {
        requestId,
        playerId: currentPlayerId(),
        action: "buy",
        resourceType: "material",
        resourceId: materialId,
        quantity,
        unitPrice,
        creditsDelta: -totalCost,
        contentVersion,
      },
    });
  });

  await assertValidPlayerGameState(prisma, currentPlayerId());
  return getGameMarketState();
}

export async function sellGameMarketMaterial(
  materialId: string,
  quantity: number,
  requestId: string,
) {
  assertMarketQuantity(quantity);
  assertMarketRequestId(requestId);
  const material = getMaterialDefinition(materialId);
  const unitPrice = materialSellPrice(material);
  const totalCredits = unitPrice * quantity;
  const prisma = usePrisma();

  await seedDevelopmentPlayer(prisma);

  await prisma.$transaction(async (transaction) => {
    const existing = await transaction.marketTransaction.findUnique({ where: { requestId } });

    if (existing) {
      assertMatchingMarketTransaction(existing, {
        action: "sell",
        materialId,
        quantity,
        unitPrice,
      });
      return;
    }

    const stockUpdate = await transaction.materialStock.updateMany({
      where: {
        playerId: currentPlayerId(),
        materialId,
        quantity: { gte: quantity },
      },
      data: { quantity: { decrement: quantity }, contentVersion },
    });

    if (stockUpdate.count !== 1) {
      throw new Error("Not enough material stock.");
    }

    await transaction.player.update({
      where: { id: currentPlayerId() },
      data: { credits: { increment: totalCredits } },
    });
    await transaction.marketTransaction.create({
      data: {
        requestId,
        playerId: currentPlayerId(),
        action: "sell",
        resourceType: "material",
        resourceId: materialId,
        quantity,
        unitPrice,
        creditsDelta: totalCredits,
        contentVersion,
      },
    });
  });

  await assertValidPlayerGameState(prisma, currentPlayerId());
  return getGameMarketState();
}

export async function getBattleHistoryState() {
  const prisma = usePrisma();

  await seedDevelopmentPlayer(prisma);
  await assertValidPlayerGameState(prisma, currentPlayerId());

  const [player, records] = await Promise.all([
    prisma.player.findUniqueOrThrow({ where: { id: currentPlayerId() } }),
    prisma.battleRecord.findMany({
      where: {
        status: "finished",
        OR: [{ playerOneId: currentPlayerId() }, { playerTwoId: currentPlayerId() }],
      },
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      take: 50,
      include: {
        rewardGrants: {
          where: { playerId: currentPlayerId() },
          include: {
            materials: true,
            items: {
              include: { inventoryItem: true },
            },
          },
        },
      },
    }),
  ]);

  return {
    player: {
      id: player.id,
      username: player.username,
      credits: player.credits,
      experience: player.experience,
      level: levelFromExperience(player.experience),
    },
    records: records.map((record) => {
      const reward = record.rewardGrants[0] ?? null;
      const state = rebuildBattleState(record.setupJson, record.actionLogJson);

      return {
        id: record.id,
        mode: record.mode,
        status: record.status,
        outcome:
          record.mode === "private_pvp"
            ? privateBattleOutcome(record, currentPlayerId())
            : (record.result as BattleOutcome),
        seed: record.seed,
        rulesVersion: record.rulesVersion,
        contentVersion: record.contentVersion,
        actionCount: jsonArrayLength(record.actionLogJson),
        turnCount: record.turnCount ?? 0,
        finalStateChecksum: record.finalStateChecksum,
        replayAvailable: Boolean(record.finalStateChecksum),
        createdAt: record.createdAt.toISOString(),
        reward: toBattleRewardView(reward),
        summary: battleResultSummary(state),
      };
    }),
  };
}

export async function getPrivateMatchState() {
  const prisma = usePrisma();
  await seedDevelopmentPlayer(prisma);
  await expirePrivateMatches(prisma);
  const activeMatch = await prisma.privateMatch.findFirst({
    where: {
      status: "active",
      battleRecordId: { not: null },
      participants: { some: { playerId: currentPlayerId() } },
    },
    select: { battleRecordId: true },
  });
  if (activeMatch?.battleRecordId) {
    await settleExpiredPrivateBattle(prisma, activeMatch.battleRecordId);
  }

  const [match, loadouts] = await Promise.all([
    prisma.privateMatch.findFirst({
      where: { participants: { some: { playerId: currentPlayerId() } } },
      orderBy: { updatedAt: "desc" },
      include: {
        participants: {
          orderBy: { slot: "asc" },
          include: { player: true, loadout: { include: { rings: true } } },
        },
      },
    }),
    prisma.loadout.findMany({
      where: { playerId: currentPlayerId() },
      orderBy: [{ updatedAt: "desc" }, { id: "asc" }],
      include: { rings: true },
    }),
  ]);

  return {
    playerId: currentPlayerId(),
    match: match
      ? {
          id: match.id,
          code: match.code,
          status: match.status,
          battleId: match.battleRecordId,
          turnPlayerId: match.turnPlayerId,
          turnDeadlineAt: match.turnDeadlineAt?.toISOString() ?? null,
          expiresAt: match.expiresAt.toISOString(),
          participants: [...match.participants]
            .sort((left, right) => (left.slot === "host" ? -1 : right.slot === "host" ? 1 : 0))
            .map((participant) => ({
              playerId: participant.playerId,
              username: participant.player.username,
              slot: participant.slot as "host" | "guest",
              ready: participant.ready,
              loadoutId: participant.loadoutId,
              loadoutName: participant.loadout?.name ?? null,
              ringCount: participant.loadout?.rings.length ?? 0,
            })),
        }
      : null,
    loadouts: loadouts.map((loadout) => ({
      id: loadout.id,
      name: loadout.name,
      ringCount: loadout.rings.length,
    })),
  };
}

export async function createPrivateMatch() {
  const prisma = usePrisma();
  await seedDevelopmentPlayer(prisma);
  await expirePrivateMatches(prisma);

  const existing = await prisma.privateMatch.findFirst({
    where: {
      status: { in: ["waiting", "starting", "active"] },
      participants: { some: { playerId: currentPlayerId() } },
    },
  });
  if (existing) {
    throw new Error("Leave the current private match before creating another one.");
  }

  for (let attempt = 0; attempt < 8; attempt += 1) {
    const code = privateMatchCode();
    try {
      const match = await prisma.privateMatch.create({
        data: {
          code,
          expiresAt: new Date(Date.now() + 2 * 60 * 60 * 1_000),
          participants: {
            create: { playerId: currentPlayerId(), slot: "host" },
          },
        },
      });
      const state = await getPrivateMatchState();
      publishGameRealtimeEvent([currentPlayerId()], {
        type: "privateMatchChanged",
        matchId: match.id,
        reason: "created",
      });
      return state;
    } catch (error) {
      if (!(error instanceof Prisma.PrismaClientKnownRequestError) || error.code !== "P2002") {
        throw error;
      }
    }
  }
  throw new Error("Could not allocate a unique private match code.");
}

export async function joinPrivateMatch(rawCode: string) {
  assertNonEmptyId(rawCode, "code");
  const code = rawCode.trim().toUpperCase();
  const prisma = usePrisma();
  await seedDevelopmentPlayer(prisma);
  await expirePrivateMatches(prisma);

  const matchId = await prisma.$transaction(async (transaction) => {
    const existing = await transaction.privateMatch.findFirst({
      where: {
        status: { in: ["waiting", "starting", "active"] },
        participants: { some: { playerId: currentPlayerId() } },
      },
    });
    if (existing) {
      throw new Error("Leave the current private match before joining another one.");
    }

    const match = await transaction.privateMatch.findUnique({
      where: { code },
      include: { participants: true },
    });
    if (!match || match.status !== "waiting" || match.expiresAt.getTime() <= Date.now()) {
      throw new Error("This private match code is invalid or expired.");
    }
    if (match.participants.length >= 2) {
      throw new Error("This private match is already full.");
    }
    await transaction.privateMatchParticipant.create({
      data: { matchId: match.id, playerId: currentPlayerId(), slot: "guest" },
    });
    return match.id;
  });

  const state = await getPrivateMatchState();
  publishGameRealtimeEvent(
    state.match?.participants.map((participant) => participant.playerId) ?? [currentPlayerId()],
    { type: "privateMatchChanged", matchId, reason: "joined" },
  );
  return state;
}

export async function setPrivateMatchReady(loadoutId: string, ready: boolean) {
  assertNonEmptyId(loadoutId, "loadoutId");
  const prisma = usePrisma();
  await seedDevelopmentPlayer(prisma);

  const matchId = await prisma.$transaction(async (transaction) => {
    const loadout = await transaction.loadout.findFirst({
      where: { id: loadoutId, playerId: currentPlayerId() },
      include: { rings: true },
    });
    if (!loadout || loadout.rings.length === 0) {
      throw new Error("Select a loadout containing at least one ring.");
    }

    const participant = await transaction.privateMatchParticipant.findFirst({
      where: {
        playerId: currentPlayerId(),
        match: { status: "waiting", expiresAt: { gt: new Date() } },
      },
    });
    if (!participant) {
      throw new Error("No waiting private match is available for this player.");
    }
    await transaction.privateMatchParticipant.update({
      where: {
        matchId_playerId: { matchId: participant.matchId, playerId: currentPlayerId() },
      },
      data: { loadoutId, ready },
    });

    const match = await transaction.privateMatch.findUniqueOrThrow({
      where: { id: participant.matchId },
      include: {
        participants: {
          orderBy: { slot: "asc" },
          include: {
            loadout: { include: { rings: { orderBy: { slotIndex: "asc" } } } },
            player: {
              include: {
                inventoryItems: true,
                ringSockets: { orderBy: [{ ringItemId: "asc" }, { socketIndex: "asc" }] },
                gemEnchantments: true,
              },
            },
          },
        },
      },
    });

    if (match.participants.length !== 2 || !match.participants.every((entry) => entry.ready)) {
      return match.id;
    }
    if (match.participants.some((entry) => !entry.loadout)) {
      throw new Error("Both players must select a valid loadout.");
    }

    const claimed = await transaction.privateMatch.updateMany({
      where: { id: match.id, status: "waiting", battleRecordId: null },
      data: { status: "starting" },
    });
    if (claimed.count !== 1) {
      return match.id;
    }

    const host = match.participants.find((entry) => entry.slot === "host");
    const guest = match.participants.find((entry) => entry.slot === "guest");
    if (!host || !guest) {
      throw new Error("Private match participants are incomplete.");
    }
    const setup = livePrivateBattleSetup(match.id, host, guest);
    const initialState = createBattleState(setup);
    const battle = await transaction.battleRecord.create({
      data: {
        mode: "private_pvp",
        modeReferenceId: match.id,
        status: initialState.status,
        result: "pending",
        playerOneId: host.playerId,
        playerTwoId: guest.playerId,
        seed: setup.seed,
        rulesVersion,
        contentVersion,
        setupJson: JSON.stringify(setup),
        actionLogJson: JSON.stringify(initialState.actionHistory),
        turnCount: Math.max(...initialState.players.map((player) => player.energy.turnCount)),
      },
    });
    await transaction.privateMatch.update({
      where: { id: match.id },
      data: {
        status: "active",
        battleRecordId: battle.id,
        turnPlayerId: initialState.activePlayerId,
        turnDeadlineAt: privateTurnDeadline(initialState.activePlayerId),
      },
    });
    return match.id;
  });

  const state = await getPrivateMatchState();
  publishGameRealtimeEvent(
    state.match?.participants.map((participant) => participant.playerId) ?? [currentPlayerId()],
    {
      type: "privateMatchChanged",
      matchId,
      reason: state.match?.status === "active" ? "started" : "ready",
    },
  );
  return state;
}

export async function leavePrivateMatch() {
  const prisma = usePrisma();
  const participant = await prisma.privateMatchParticipant.findFirst({
    where: {
      playerId: currentPlayerId(),
      match: { status: "waiting" },
    },
    include: { match: { include: { participants: true } } },
  });
  if (!participant) {
    throw new Error("No waiting private match is available to leave.");
  }

  if (participant.slot === "host") {
    await prisma.privateMatch.update({
      where: { id: participant.matchId },
      data: { status: "cancelled" },
    });
  } else {
    await prisma.$transaction([
      prisma.privateMatchParticipant.delete({
        where: {
          matchId_playerId: { matchId: participant.matchId, playerId: currentPlayerId() },
        },
      }),
      prisma.privateMatchParticipant.updateMany({
        where: { matchId: participant.matchId, slot: "host" },
        data: { ready: false },
      }),
    ]);
  }
  const state = await getPrivateMatchState();
  publishGameRealtimeEvent(
    participant.match.participants.map((entry) => entry.playerId),
    { type: "privateMatchChanged", matchId: participant.matchId, reason: "left" },
  );
  return state;
}

export async function createLiveTrainingBattle(requestId: string) {
  assertMarketRequestId(requestId);
  const prisma = usePrisma();

  await seedDevelopmentPlayer(prisma);

  await prisma.$transaction(async (transaction) => {
    const existing = await transaction.battleRecord.findUnique({ where: { id: requestId } });

    if (existing) {
      if (existing.mode !== "training" || existing.playerOneId !== currentPlayerId()) {
        throw new Error("requestId was already used for a different battle.");
      }
      return;
    }

    const player = await transaction.player.findUniqueOrThrow({
      where: { id: currentPlayerId() },
      include: {
        activeLoadout: {
          include: { rings: { orderBy: { slotIndex: "asc" } } },
        },
        inventoryItems: true,
        ringSockets: { orderBy: [{ ringItemId: "asc" }, { socketIndex: "asc" }] },
        gemEnchantments: true,
      },
    });

    if (!player.activeLoadout || player.activeLoadout.rings.length === 0) {
      throw new Error("An active loadout with at least one ring is required.");
    }

    const setup = liveTrainingBattleSetup({
      requestId,
      player,
    });
    const initialState = createBattleState(setup);
    const advanced = advanceTrainingOpponent(initialState);
    const state = advanced.state;

    await transaction.battleRecord.create({
      data: {
        id: requestId,
        mode: "training",
        status: state.status,
        result: "pending",
        playerOneId: currentPlayerId(),
        seed: setup.seed,
        rulesVersion,
        contentVersion,
        setupJson: JSON.stringify(setup),
        actionLogJson: JSON.stringify(state.actionHistory),
        turnCount: Math.max(...state.players.map((battlePlayer) => battlePlayer.energy.turnCount)),
      },
    });
  });

  return getLiveBattleState(requestId);
}

export async function createLiveCampaignBattle(opponentId: string, requestId: string) {
  assertNonEmptyId(opponentId, "opponentId");
  assertMarketRequestId(requestId);
  const opponent = getCampaignOpponent(opponentId);
  const prisma = usePrisma();

  await seedDevelopmentPlayer(prisma);

  await prisma.$transaction(async (transaction) => {
    const existing = await transaction.battleRecord.findUnique({ where: { id: requestId } });

    if (existing) {
      if (
        existing.mode !== "campaign" ||
        existing.modeReferenceId !== opponent.id ||
        existing.playerOneId !== currentPlayerId()
      ) {
        throw new Error("requestId was already used for a different battle.");
      }
      return;
    }

    const player = await transaction.player.findUniqueOrThrow({
      where: { id: currentPlayerId() },
      include: {
        activeLoadout: {
          include: { rings: { orderBy: { slotIndex: "asc" } } },
        },
        inventoryItems: true,
        ringSockets: { orderBy: [{ ringItemId: "asc" }, { socketIndex: "asc" }] },
        gemEnchantments: true,
        campaignProgress: true,
      },
    });

    if (!player.activeLoadout || player.activeLoadout.rings.length === 0) {
      throw new Error("An active loadout with at least one ring is required.");
    }

    assertCampaignOpponentAvailable(opponent, player.campaignProgress);
    const setup = liveCampaignBattleSetup({ requestId, player, opponent });
    const initialState = createBattleState(setup);
    const advanced = advanceCampaignOpponent(initialState, opponent);
    const state = advanced.state;

    await transaction.battleRecord.create({
      data: {
        id: requestId,
        mode: "campaign",
        modeReferenceId: opponent.id,
        status: state.status,
        result: "pending",
        playerOneId: currentPlayerId(),
        seed: setup.seed,
        rulesVersion,
        contentVersion,
        setupJson: JSON.stringify(setup),
        actionLogJson: JSON.stringify(state.actionHistory),
        turnCount: Math.max(...state.players.map((battlePlayer) => battlePlayer.energy.turnCount)),
      },
    });
  });

  return getLiveBattleState(requestId);
}

export async function getLiveBattleState(battleId: string) {
  const prisma = usePrisma();

  await seedDevelopmentPlayer(prisma);
  await settleExpiredPrivateBattle(prisma, battleId);

  const record = await prisma.battleRecord.findFirst({
    where: {
      id: battleId,
      OR: [{ playerOneId: currentPlayerId() }, { playerTwoId: currentPlayerId() }],
    },
    include: {
      rewardGrants: {
        where: { playerId: currentPlayerId() },
        include: {
          materials: true,
          items: { include: { inventoryItem: true } },
        },
      },
      privateMatch: true,
    },
  });

  if (!record) {
    throw new Error(`Battle "${battleId}" is not available for this player.`);
  }

  const state = rebuildBattleState(record.setupJson, record.actionLogJson);
  const viewer = state.players.find((player) => player.id === currentPlayerId());
  const opponent = state.players.find((player) => player.id !== currentPlayerId());

  if (!viewer || !opponent) {
    throw new Error(`Battle "${battleId}" has invalid participants.`);
  }

  return {
    id: record.id,
    mode: record.mode,
    status: state.status,
    activePlayerId: state.activePlayerId,
    startingPlayerId: state.startingPlayerId,
    rulesVersion: record.rulesVersion,
    contentVersion: record.contentVersion,
    actionCount: state.actionHistory.length,
    turnCount: Math.max(...state.players.map((player) => player.energy.turnCount)),
    turnPlayerId: record.privateMatch?.turnPlayerId ?? null,
    turnDeadlineAt: record.privateMatch?.turnDeadlineAt?.toISOString() ?? null,
    viewer: toLiveBattlePlayerView(viewer, true),
    opponent: toLiveBattlePlayerView(opponent, false),
    result: state.result,
    reward: toBattleRewardView(record.rewardGrants[0] ?? null),
    summary: battleResultSummary(state),
  };
}

export async function submitLiveBattleAction(
  battleId: string,
  expectedActionCount: number,
  command: LiveBattleActionCommand,
) {
  assertNonEmptyId(battleId, "battleId");
  if (!Number.isInteger(expectedActionCount) || expectedActionCount < 0) {
    throw new Error("expectedActionCount must be a non-negative integer.");
  }
  assertLiveBattleActionCommand(command);

  const prisma = usePrisma();
  await seedDevelopmentPlayer(prisma);
  await settleExpiredPrivateBattle(prisma, battleId);

  const submitted = await prisma.$transaction(async (transaction) => {
    const record = await transaction.battleRecord.findFirst({
      where: {
        id: battleId,
        OR: [{ playerOneId: currentPlayerId() }, { playerTwoId: currentPlayerId() }],
      },
      include: { privateMatch: true },
    });

    if (!record) {
      throw new Error(`Battle "${battleId}" is not available for this player.`);
    }
    if (record.mode !== "training" && record.mode !== "campaign" && record.mode !== "private_pvp") {
      throw new Error("This battle mode does not accept live actions.");
    }
    if (
      record.mode === "private_pvp" &&
      record.privateMatch?.turnDeadlineAt &&
      record.privateMatch.turnDeadlineAt.getTime() <= Date.now()
    ) {
      throw new Error("The turn deadline has expired. Reload the battle state.");
    }

    const state = rebuildBattleState(record.setupJson, record.actionLogJson);
    if (state.actionHistory.length !== expectedActionCount) {
      throw new Error("Battle state is stale. Reload the latest state before acting.");
    }

    const viewerAction = toViewerBattleAction(command);
    const applied = applyBattleAction(state, viewerAction);
    const advanced =
      record.mode === "campaign"
        ? advanceCampaignOpponent(applied.state, getCampaignOpponent(record.modeReferenceId ?? ""))
        : record.mode === "training"
          ? advanceTrainingOpponent(applied.state)
          : { state: applied.state, events: [] };
    const nextState = advanced.state;
    const nextActionsJson = JSON.stringify(nextState.actionHistory);
    const finishedRecord =
      nextState.status === "finished"
        ? createBattleRecord(nextState, { rulesVersion, contentVersion })
        : null;
    const outcome = liveBattleOutcome(nextState);

    const update = await transaction.battleRecord.updateMany({
      where: {
        id: record.id,
        actionLogJson: record.actionLogJson,
      },
      data: {
        status: nextState.status,
        result:
          record.mode === "private_pvp" && nextState.status === "finished"
            ? nextState.result?.type === "draw"
              ? "draw"
              : "finished"
            : outcome,
        actionLogJson: nextActionsJson,
        resultJson: finishedRecord ? JSON.stringify(finishedRecord.result) : null,
        finalStateChecksum: finishedRecord?.finalStateChecksum ?? null,
        winnerPlayerId:
          nextState.result?.type !== "winner"
            ? null
            : record.mode === "private_pvp"
              ? nextState.result.winnerId
              : nextState.result.winnerId === currentPlayerId()
                ? currentPlayerId()
                : null,
        turnCount: Math.max(...nextState.players.map((player) => player.energy.turnCount)),
      },
    });

    if (update.count !== 1) {
      throw new Error(
        "Battle state changed while the action was being submitted. Reload and retry.",
      );
    }

    if (nextState.status === "finished" && record.mode === "private_pvp") {
      await transaction.privateMatch.updateMany({
        where: { battleRecordId: record.id },
        data: { status: "finished", turnPlayerId: null, turnDeadlineAt: null },
      });
    } else if (record.mode === "private_pvp") {
      await transaction.privateMatch.updateMany({
        where: { battleRecordId: record.id, status: "active" },
        data: {
          turnPlayerId: nextState.activePlayerId,
          turnDeadlineAt: privateTurnDeadline(nextState.activePlayerId),
        },
      });
    }

    if (nextState.status === "finished" && record.mode !== "private_pvp") {
      if (outcome === "pending") {
        throw new Error("Finished battle does not have a settlement outcome.");
      }
      const reward =
        record.mode === "campaign"
          ? await settleCampaignOutcome(
              transaction,
              getCampaignOpponent(record.modeReferenceId ?? ""),
              outcome,
            )
          : battleRewardDefinition(outcome);
      const itemExperience = liveBattleItemExperience(nextState);

      await transaction.rewardGrant.create({
        data: {
          playerId: currentPlayerId(),
          sourceType: record.mode === "campaign" ? "campaignBattle" : "battle",
          sourceId: record.mode === "campaign" ? record.modeReferenceId : record.id,
          battleRecordId: record.id,
          status: "unclaimed",
          credits: reward.credits,
          heroExperience: reward.heroExperience,
          contentVersion,
          materials: { create: reward.materials },
          items: { create: itemExperience },
        },
      });
    }

    return {
      events: [...applied.events, ...advanced.events],
      matchId: record.privateMatch?.id ?? null,
      mode: record.mode,
      playerIds: [record.playerOneId, record.playerTwoId].filter((playerId): playerId is string =>
        Boolean(playerId),
      ),
      finished: nextState.status === "finished",
    };
  });

  if (submitted.events.some((event) => event.type === "battleEnded")) {
    await assertValidPlayerGameState(prisma, currentPlayerId());
  }

  if (submitted.mode === "private_pvp") {
    publishGameRealtimeEvent(submitted.playerIds, {
      type: "battleChanged",
      battleId,
      reason: "action",
    });
    if (submitted.finished && submitted.matchId) {
      publishGameRealtimeEvent(submitted.playerIds, {
        type: "privateMatchChanged",
        matchId: submitted.matchId,
        reason: "finished",
      });
    }
  }

  return {
    battle: await getLiveBattleState(battleId),
    events: submitted.events,
  };
}

export async function createDevelopmentBattleResult(
  outcome: Exclude<BattleOutcome, "draw">,
  requestId: string,
) {
  assertMarketRequestId(requestId);
  const prisma = usePrisma();
  const record = developmentBattleRecord(outcome);
  const replayedState = replayBattleRecord(record);
  const reward = battleRewardDefinition(outcome);

  await seedDevelopmentPlayer(prisma);

  await prisma.$transaction(async (transaction) => {
    const existing = await transaction.battleRecord.findUnique({ where: { id: requestId } });

    if (existing) {
      if (existing.mode !== "development" || existing.result !== outcome) {
        throw new Error("requestId was already used for a different battle result.");
      }
      return;
    }

    const player = await transaction.player.findUniqueOrThrow({
      where: { id: currentPlayerId() },
      include: {
        activeLoadout: {
          include: { rings: { orderBy: { slotIndex: "asc" } } },
        },
        inventoryItems: true,
        ringSockets: true,
        gemEnchantments: true,
      },
    });

    if (!player.activeLoadout || player.activeLoadout.rings.length === 0) {
      throw new Error("An active loadout with at least one ring is required.");
    }

    const rewardedItemIds = developmentRewardItemIds({
      loadoutRingIds: player.activeLoadout.rings.map((ring) => ring.ringItemId),
      ringSockets: player.ringSockets,
      gemEnchantments: player.gemEnchantments,
      inventoryItems: player.inventoryItems,
    });
    const turnCount = Math.max(
      ...replayedState.players.map((battlePlayer) => battlePlayer.energy.turnCount),
    );

    await transaction.battleRecord.create({
      data: {
        id: requestId,
        mode: "development",
        status: "finished",
        result: outcome,
        playerOneId: currentPlayerId(),
        winnerPlayerId: outcome === "win" ? currentPlayerId() : null,
        seed: record.setup.seed,
        rulesVersion: record.rulesVersion,
        contentVersion: record.contentVersion,
        setupJson: JSON.stringify(record.setup),
        actionLogJson: JSON.stringify(record.actions),
        resultJson: JSON.stringify(record.result),
        finalStateChecksum: record.finalStateChecksum,
        turnCount,
      },
    });
    await transaction.rewardGrant.create({
      data: {
        playerId: currentPlayerId(),
        sourceType: "battle",
        sourceId: requestId,
        battleRecordId: requestId,
        status: "unclaimed",
        credits: reward.credits,
        heroExperience: reward.heroExperience,
        contentVersion,
        materials: {
          create: reward.materials,
        },
        items: {
          create: rewardedItemIds.map((inventoryItemId) => ({
            inventoryItemId,
            experience: 8,
          })),
        },
      },
    });
  });

  await assertValidPlayerGameState(prisma, currentPlayerId());
  return {
    recordId: requestId,
    state: await getBattleHistoryState(),
  };
}

export async function claimBattleReward(rewardGrantId: string) {
  const prisma = usePrisma();

  await seedDevelopmentPlayer(prisma);

  await prisma.$transaction(async (transaction) => {
    const reward = await transaction.rewardGrant.findUnique({
      where: { id: rewardGrantId },
      include: { materials: true, items: true },
    });

    if (!reward || reward.playerId !== currentPlayerId()) {
      throw new Error(`Reward grant "${rewardGrantId}" is not available for this player.`);
    }

    if (reward.status === "claimed") {
      return;
    }

    const claimed = await transaction.rewardGrant.updateMany({
      where: { id: rewardGrantId, playerId: currentPlayerId(), status: "unclaimed" },
      data: { status: "claimed", claimedAt: new Date() },
    });

    if (claimed.count !== 1) {
      return;
    }

    await transaction.player.update({
      where: { id: currentPlayerId() },
      data: {
        credits: { increment: reward.credits },
        experience: { increment: reward.heroExperience },
      },
    });

    for (const material of reward.materials) {
      await transaction.materialStock.upsert({
        where: {
          playerId_materialId: {
            playerId: currentPlayerId(),
            materialId: material.materialId,
          },
        },
        create: {
          playerId: currentPlayerId(),
          materialId: material.materialId,
          quantity: material.quantity,
          contentVersion,
        },
        update: { quantity: { increment: material.quantity }, contentVersion },
      });
    }

    for (const itemReward of reward.items) {
      const updated = await transaction.inventoryItem.updateMany({
        where: { id: itemReward.inventoryItemId, playerId: currentPlayerId() },
        data: { experience: { increment: itemReward.experience } },
      });

      if (updated.count !== 1) {
        throw new Error(`Reward item "${itemReward.inventoryItemId}" is not available.`);
      }
    }
  });

  await assertValidPlayerGameState(prisma, currentPlayerId());
  return getBattleHistoryState();
}

export async function craftPlayerRecipe(recipeId: string) {
  const prisma = usePrisma();
  const recipe = definitions.recipes.find((candidate) => candidate.id === recipeId);

  if (!recipe) {
    throw new Error(`Unknown recipe "${recipeId}".`);
  }

  await seedDevelopmentPlayer(prisma);

  const crafted = await prisma.$transaction(async (transaction) => {
    const player = await transaction.player.findUniqueOrThrow({
      where: { id: currentPlayerId() },
      include: { materialStock: true },
    });
    const stock = materialStockFromRows(player.materialStock);
    const result = craftRecipe({
      recipe,
      ownerId: player.id,
      stock,
      instanceSequence: player.nextItemSequence,
    });

    await saveMaterialStock(transaction, player.id, result.stock);
    await insertCraftedItem(transaction, player.id, result.crafted);
    await transaction.player.update({
      where: { id: player.id },
      data: { nextItemSequence: player.nextItemSequence + 1 },
    });

    return result.crafted;
  });

  return {
    crafted: toCraftedItemView(crafted),
    state: await getPlayerState(),
  };
}

export async function getPlayerEquipmentState() {
  const prisma = usePrisma();

  await seedDevelopmentPlayer(prisma);
  await assertValidPlayerGameState(prisma, currentPlayerId());

  const player = await prisma.player.findUniqueOrThrow({
    where: { id: currentPlayerId() },
    include: {
      equippedRings: {
        orderBy: { slotIndex: "asc" },
      },
      inventoryItems: {
        orderBy: { createdAt: "desc" },
      },
      ringSockets: {
        orderBy: { socketIndex: "asc" },
      },
      gemEnchantments: true,
    },
  });
  const inventoryById = new Map(player.inventoryItems.map((item) => [item.id, item]));
  const equippedRingIds = new Set(player.equippedRings.map((entry) => entry.ringItemId));
  const slotByRingId = new Map(
    player.equippedRings.map((entry) => [entry.ringItemId, entry.slotIndex]),
  );
  const socketsByRingId = groupSocketsByRingId(player.ringSockets);
  const enchantmentByGemId = new Map(
    player.gemEnchantments.map((enchantment) => [enchantment.gemItemId, enchantment]),
  );
  const equippedRings = player.equippedRings
    .map((entry) => inventoryById.get(entry.ringItemId))
    .filter((ring): ring is InventoryItem => ring !== undefined)
    .map((ring) =>
      toEquipmentRingView({
        ring,
        slotIndex: slotByRingId.get(ring.id) ?? null,
        equipped: true,
        inventoryById,
        sockets: socketsByRingId.get(ring.id) ?? [],
        enchantmentByGemId,
      }),
    );
  const availableRings = player.inventoryItems
    .filter((ring) => ring.type === "ring")
    .map((ring) =>
      toEquipmentRingView({
        ring,
        slotIndex: slotByRingId.get(ring.id) ?? null,
        equipped: equippedRingIds.has(ring.id),
        inventoryById,
        sockets: socketsByRingId.get(ring.id) ?? [],
        enchantmentByGemId,
      }),
    );

  return {
    player: {
      id: player.id,
      username: player.username,
    },
    maxEquippedRings,
    equippedRings,
    availableRings,
    summary: toEquipmentSummary(equippedRings),
  };
}

export async function getPlayerLoadoutState() {
  const prisma = usePrisma();

  await seedDevelopmentPlayer(prisma);
  await assertValidPlayerGameState(prisma, currentPlayerId());

  const player = await prisma.player.findUniqueOrThrow({
    where: { id: currentPlayerId() },
    include: {
      equippedRings: {
        orderBy: { slotIndex: "asc" },
      },
      inventoryItems: {
        orderBy: { createdAt: "desc" },
      },
      ringSockets: {
        orderBy: { socketIndex: "asc" },
      },
      gemEnchantments: true,
      loadouts: {
        orderBy: { updatedAt: "desc" },
        include: {
          rings: {
            orderBy: { slotIndex: "asc" },
          },
        },
      },
    },
  });
  const inventoryById = new Map(player.inventoryItems.map((item) => [item.id, item]));
  const socketsByRingId = groupSocketsByRingId(player.ringSockets);
  const enchantmentByGemId = new Map(
    player.gemEnchantments.map((enchantment) => [enchantment.gemItemId, enchantment]),
  );
  const currentRings = player.equippedRings
    .map((entry) => inventoryById.get(entry.ringItemId))
    .filter((ring): ring is InventoryItem => ring !== undefined)
    .map((ring) =>
      toEquipmentRingView({
        ring,
        slotIndex:
          player.equippedRings.find((entry) => entry.ringItemId === ring.id)?.slotIndex ?? null,
        equipped: true,
        inventoryById,
        sockets: socketsByRingId.get(ring.id) ?? [],
        enchantmentByGemId,
      }),
    );

  return {
    player: {
      id: player.id,
      username: player.username,
      activeLoadoutId: player.activeLoadoutId,
    },
    maxLoadoutRings,
    currentEquipment: {
      rings: currentRings,
      summary: toEquipmentSummary(currentRings),
    },
    loadouts: player.loadouts.map((loadout) =>
      toLoadoutView({
        loadout,
        activeLoadoutId: player.activeLoadoutId,
        inventoryById,
        socketsByRingId,
        enchantmentByGemId,
      }),
    ),
  };
}

export async function getCampaignState() {
  const loadoutState = await getPlayerLoadoutState();
  const prisma = usePrisma();
  const [player, persistedProgress] = await Promise.all([
    prisma.player.findUniqueOrThrow({ where: { id: currentPlayerId() } }),
    prisma.campaignProgress.findMany({ where: { playerId: currentPlayerId() } }),
  ]);
  const progressByOpponentId = new Map(
    persistedProgress.map((progress) => [progress.opponentId, progress]),
  );
  const campaignLabels = new Map(
    definitions.campaignOpponents.map((opponent) => [opponent.id, label(opponent.nameKey)]),
  );
  const ringDefinitions = new Map(
    definitions.rings.map((definition) => [definition.id, definition]),
  );
  const gemDefinitions = new Map(definitions.gems.map((definition) => [definition.id, definition]));
  const monsterDefinitions = new Map(
    definitions.monsters.map((definition) => [definition.id, definition]),
  );
  const spellDefinitions = new Map(
    definitions.spells.map((definition) => [definition.id, definition]),
  );
  const materialDefinitions = new Map(
    definitions.materials.map((definition) => [definition.id, definition]),
  );

  return {
    player: {
      id: loadoutState.player.id,
      username: loadoutState.player.username,
      level: levelFromExperience(player.experience),
      activeLoadoutId: loadoutState.player.activeLoadoutId,
    },
    progress: {
      completedCount: persistedProgress.filter((progress) => progress.victoryCount > 0).length,
      unlockedCount: definitions.campaignOpponents.filter(
        (opponent) =>
          !opponent.prerequisiteOpponentId ||
          (progressByOpponentId.get(opponent.prerequisiteOpponentId)?.victoryCount ?? 0) > 0,
      ).length,
      totalCount: definitions.campaignOpponents.length,
    },
    opponents: definitions.campaignOpponents.map((opponent) => ({
      id: opponent.id,
      order: opponent.order,
      label: label(opponent.nameKey),
      description: label(opponent.descriptionKey),
      element: opponent.element,
      recommendedLevel: opponent.recommendedLevel,
      opponentLevel: levelFromExperience(opponent.experience),
      victoryCount: progressByOpponentId.get(opponent.id)?.victoryCount ?? 0,
      status:
        (progressByOpponentId.get(opponent.id)?.victoryCount ?? 0) > 0
          ? ("completed" as const)
          : !opponent.prerequisiteOpponentId ||
              (progressByOpponentId.get(opponent.prerequisiteOpponentId)?.victoryCount ?? 0) > 0
            ? ("available" as const)
            : ("locked" as const),
      repeatable: opponent.repeatable,
      prerequisite: opponent.prerequisiteOpponentId
        ? {
            id: opponent.prerequisiteOpponentId,
            label:
              campaignLabels.get(opponent.prerequisiteOpponentId) ??
              opponent.prerequisiteOpponentId,
          }
        : null,
      loadoutVisibility: opponent.loadoutVisibility,
      rings: opponent.rings.map((ring) => {
        const definition = requiredContentDefinition(ringDefinitions, ring.definitionId, "ring");
        return {
          definitionId: definition.id,
          label: label(definition.nameKey),
          element: definition.element,
          rarity: definition.rarity,
          level: levelFromExperience(ring.experience),
          quality: ring.quality,
          gems: ring.gems.map((gem) => {
            const gemDefinition = requiredContentDefinition(
              gemDefinitions,
              gem.definitionId,
              "gem",
            );
            const enchantmentDefinition = gem.enchantment
              ? gem.enchantment.type === "monster"
                ? requiredContentDefinition(
                    monsterDefinitions,
                    gem.enchantment.definitionId,
                    "monster",
                  )
                : requiredContentDefinition(spellDefinitions, gem.enchantment.definitionId, "spell")
              : null;
            return {
              definitionId: gemDefinition.id,
              label: label(gemDefinition.nameKey),
              element: gemDefinition.element,
              rarity: gemDefinition.rarity,
              enchantment: gem.enchantment
                ? {
                    type: gem.enchantment.type,
                    definitionId: gem.enchantment.definitionId,
                    label: label(enchantmentDefinition?.nameKey ?? gem.enchantment.definitionId),
                  }
                : null,
            };
          }),
        };
      }),
      firstClearReward: campaignRewardPreview(opponent.firstClearReward),
      repeatVictoryReward: campaignRewardPreview(opponent.repeatVictoryReward),
    })),
  };

  function campaignRewardPreview(reward: {
    credits: number;
    heroExperience: number;
    materials: readonly { materialId: string; quantity: number }[];
  }) {
    return {
      credits: reward.credits,
      heroExperience: reward.heroExperience,
      materials: reward.materials.map((material) => {
        const definition = requiredContentDefinition(
          materialDefinitions,
          material.materialId,
          "material",
        );
        return {
          materialId: material.materialId,
          label: label(definition.nameKey),
          quantity: material.quantity,
        };
      }),
    };
  }
}

export async function savePlayerLoadoutFromEquipped(name: string) {
  const prisma = usePrisma();
  const normalizedName = normalizeLoadoutName(name);

  await seedDevelopmentPlayer(prisma);

  await prisma.$transaction(async (transaction) => {
    const equippedRings = await transaction.equippedRing.findMany({
      where: { playerId: currentPlayerId() },
      orderBy: { slotIndex: "asc" },
    });

    if (equippedRings.length === 0) {
      throw new Error("At least one ring must be equipped before saving a loadout.");
    }

    const loadout = await transaction.loadout.upsert({
      where: {
        playerId_name: {
          playerId: currentPlayerId(),
          name: normalizedName,
        },
      },
      create: {
        playerId: currentPlayerId(),
        name: normalizedName,
      },
      update: {
        name: normalizedName,
      },
    });

    await transaction.loadoutRing.deleteMany({
      where: { loadoutId: loadout.id },
    });
    await transaction.loadoutRing.createMany({
      data: equippedRings.map((ring) => ({
        loadoutId: loadout.id,
        ringItemId: ring.ringItemId,
        slotIndex: ring.slotIndex,
      })),
    });
  });

  await assertValidPlayerGameState(prisma, currentPlayerId());
  return getPlayerLoadoutState();
}

export async function activatePlayerLoadout(loadoutId: string) {
  const prisma = usePrisma();

  await seedDevelopmentPlayer(prisma);

  const loadout = await prisma.loadout.findFirst({
    where: { id: loadoutId, playerId: currentPlayerId() },
  });

  if (!loadout) {
    throw new Error(`Loadout "${loadoutId}" is not available for this player.`);
  }

  await prisma.player.update({
    where: { id: currentPlayerId() },
    data: { activeLoadoutId: loadout.id },
  });

  await assertValidPlayerGameState(prisma, currentPlayerId());
  return getPlayerLoadoutState();
}

export async function deletePlayerLoadout(loadoutId: string) {
  const prisma = usePrisma();

  await seedDevelopmentPlayer(prisma);

  await prisma.$transaction(async (transaction) => {
    const loadout = await transaction.loadout.findFirst({
      where: { id: loadoutId, playerId: currentPlayerId() },
    });

    if (!loadout) {
      throw new Error(`Loadout "${loadoutId}" is not available for this player.`);
    }

    await transaction.player.updateMany({
      where: { id: currentPlayerId(), activeLoadoutId: loadout.id },
      data: { activeLoadoutId: null },
    });
    await transaction.loadout.delete({
      where: { id: loadout.id },
    });
  });

  await assertValidPlayerGameState(prisma, currentPlayerId());
  return getPlayerLoadoutState();
}

export async function getPlayerSocketState() {
  const prisma = usePrisma();

  await seedDevelopmentPlayer(prisma);
  await assertValidPlayerGameState(prisma, currentPlayerId());

  const player = await prisma.player.findUniqueOrThrow({
    where: { id: currentPlayerId() },
    include: {
      inventoryItems: {
        orderBy: { createdAt: "desc" },
      },
      ringSockets: {
        orderBy: { socketIndex: "asc" },
      },
      gemEnchantments: true,
    },
  });
  const inventoryById = new Map(player.inventoryItems.map((item) => [item.id, item]));
  const socketsByRingId = groupSocketsByRingId(player.ringSockets);
  const socketByGemId = new Map(player.ringSockets.map((socket) => [socket.gemItemId, socket]));
  const enchantmentByGemId = new Map(
    player.gemEnchantments.map((enchantment) => [enchantment.gemItemId, enchantment]),
  );
  const enchantmentByTargetId = new Map(
    player.gemEnchantments.map((enchantment) => [enchantment.targetItemId, enchantment]),
  );

  return {
    player: {
      id: player.id,
      username: player.username,
      credits: player.credits,
    },
    maxRingSockets,
    rings: player.inventoryItems
      .filter((item) => item.type === "ring")
      .map((ring) =>
        toSocketRingView({
          ring,
          playerCredits: player.credits,
          slotIndex: null,
          equipped: ring.equipped,
          inventoryById,
          sockets: socketsByRingId.get(ring.id) ?? [],
          enchantmentByGemId,
        }),
      ),
    gems: player.inventoryItems
      .filter((item) => item.type === "gem")
      .map((gem) =>
        toSocketGemView({
          gem,
          socket: socketByGemId.get(gem.id) ?? null,
          enchantmentByGemId,
          inventoryById,
        }),
      ),
    enchantmentTargets: player.inventoryItems
      .filter((item) => item.type === "spell" || item.type === "monster")
      .map((target) =>
        toSocketEnchantmentTargetView({
          target,
          enchantment: enchantmentByTargetId.get(target.id) ?? null,
        }),
      ),
  };
}

export async function socketPlayerGem(ringItemId: string, gemItemId: string) {
  const prisma = usePrisma();

  await seedDevelopmentPlayer(prisma);

  await prisma.$transaction(async (transaction) => {
    const [ring, gem] = await Promise.all([
      transaction.inventoryItem.findUnique({ where: { id: ringItemId } }),
      transaction.inventoryItem.findUnique({ where: { id: gemItemId } }),
    ]);

    if (!ring || ring.playerId !== currentPlayerId() || ring.type !== "ring") {
      throw new Error(`Ring item "${ringItemId}" is not available for this player.`);
    }
    if (!gem || gem.playerId !== currentPlayerId() || gem.type !== "gem") {
      throw new Error(`Gem item "${gemItemId}" is not available for this player.`);
    }
    if (ring.socketCount === null) {
      throw new Error(`Ring item "${ringItemId}" cannot contain gems.`);
    }

    const existingGemSocket = await transaction.ringSocket.findFirst({
      where: { playerId: currentPlayerId(), gemItemId },
    });

    if (existingGemSocket) {
      throw new Error(`Gem item "${gemItemId}" is already socketed.`);
    }

    const existingSockets = await transaction.ringSocket.findMany({
      where: { playerId: currentPlayerId(), ringItemId },
      orderBy: { socketIndex: "asc" },
    });

    if (existingSockets.length >= ring.socketCount) {
      throw new Error(`Ring item "${ringItemId}" has no available sockets.`);
    }

    const usedSocketIndexes = new Set(existingSockets.map((socket) => socket.socketIndex));
    const socketIndex = Array.from({ length: ring.socketCount }, (_, index) => index).find(
      (candidate) => !usedSocketIndexes.has(candidate),
    );

    if (socketIndex === undefined) {
      throw new Error(`Ring item "${ringItemId}" has no available sockets.`);
    }

    await transaction.ringSocket.create({
      data: {
        playerId: currentPlayerId(),
        ringItemId,
        gemItemId,
        socketIndex,
      },
    });
    await syncLegacySocketedGemIds(transaction, ringItemId);
  });

  await assertValidPlayerGameState(prisma, currentPlayerId());
  return getPlayerSocketState();
}

export async function unsocketPlayerGem(gemItemId: string) {
  const prisma = usePrisma();

  await seedDevelopmentPlayer(prisma);

  await prisma.$transaction(async (transaction) => {
    const socket = await transaction.ringSocket.findFirst({
      where: { playerId: currentPlayerId(), gemItemId },
    });

    if (!socket) {
      throw new Error(`Gem item "${gemItemId}" is not socketed.`);
    }

    await transaction.ringSocket.deleteMany({
      where: { playerId: currentPlayerId(), gemItemId },
    });
    await syncLegacySocketedGemIds(transaction, socket.ringItemId);
  });

  await assertValidPlayerGameState(prisma, currentPlayerId());
  return getPlayerSocketState();
}

export async function improvePlayerRingSocketCount(ringItemId: string) {
  const prisma = usePrisma();

  await seedDevelopmentPlayer(prisma);

  await prisma.$transaction(async (transaction) => {
    const [player, ring] = await Promise.all([
      transaction.player.findUniqueOrThrow({
        where: { id: currentPlayerId() },
      }),
      transaction.inventoryItem.findUnique({
        where: { id: ringItemId },
      }),
    ]);

    if (!ring || ring.playerId !== currentPlayerId() || ring.type !== "ring") {
      throw new Error(`Ring item "${ringItemId}" is not available for this player.`);
    }
    if (ring.socketCount === null) {
      throw new Error(`Ring item "${ringItemId}" cannot contain sockets.`);
    }

    const definition = getRingDefinition(ring.definitionId);
    const cost = socketImprovementCost(definition.rarity as ImprovementRarity, ring.socketCount);

    if (player.credits < cost) {
      throw new Error("Not enough credits.");
    }

    await transaction.player.update({
      where: { id: currentPlayerId() },
      data: { credits: player.credits - cost },
    });
    await transaction.inventoryItem.update({
      where: { id: ring.id },
      data: { socketCount: ring.socketCount + 1 },
    });
  });

  await assertValidPlayerGameState(prisma, currentPlayerId());
  return getPlayerSocketState();
}

export async function enchantPlayerGem(
  gemItemId: string,
  targetItemId: string,
  targetType: string,
) {
  const prisma = usePrisma();

  await seedDevelopmentPlayer(prisma);

  if (targetType !== "monster" && targetType !== "spell") {
    throw new Error("targetType must be monster or spell.");
  }

  await prisma.$transaction(async (transaction) => {
    const [gem, target] = await Promise.all([
      transaction.inventoryItem.findUnique({ where: { id: gemItemId } }),
      transaction.inventoryItem.findUnique({ where: { id: targetItemId } }),
    ]);

    if (!gem || gem.playerId !== currentPlayerId() || gem.type !== "gem") {
      throw new Error(`Gem item "${gemItemId}" is not available for this player.`);
    }
    if (!target || target.playerId !== currentPlayerId() || target.type !== targetType) {
      throw new Error(
        `${capitalize(targetType)} item "${targetItemId}" is not available for this player.`,
      );
    }

    const existingGemEnchantment = await transaction.gemEnchantment.findUnique({
      where: { gemItemId },
    });

    if (existingGemEnchantment) {
      throw new Error(`Gem item "${gemItemId}" is already enchanted.`);
    }

    const existingTargetEnchantment = await transaction.gemEnchantment.findUnique({
      where: { targetItemId },
    });

    if (existingTargetEnchantment) {
      throw new Error(
        `${capitalize(targetType)} item "${targetItemId}" is already used as an enchantment.`,
      );
    }

    await transaction.gemEnchantment.create({
      data: {
        playerId: currentPlayerId(),
        gemItemId,
        targetItemId,
        targetType,
      },
    });
  });

  await assertValidPlayerGameState(prisma, currentPlayerId());
  return getPlayerSocketState();
}

export async function unenchantPlayerGem(gemItemId: string) {
  const prisma = usePrisma();

  await seedDevelopmentPlayer(prisma);

  await prisma.$transaction(async (transaction) => {
    const enchantment = await transaction.gemEnchantment.findUnique({
      where: { gemItemId },
    });

    if (!enchantment) {
      throw new Error(`Gem item "${gemItemId}" is not enchanted.`);
    }

    await transaction.gemEnchantment.delete({
      where: { gemItemId },
    });
  });

  await assertValidPlayerGameState(prisma, currentPlayerId());
  return getPlayerSocketState();
}

export async function getPlayerQualityState() {
  const prisma = usePrisma();

  await seedDevelopmentPlayer(prisma);
  await assertValidPlayerGameState(prisma, currentPlayerId());

  const player = await prisma.player.findUniqueOrThrow({
    where: { id: currentPlayerId() },
    include: {
      inventoryItems: {
        orderBy: { createdAt: "desc" },
      },
    },
  });

  return {
    player: {
      id: player.id,
      username: player.username,
      credits: player.credits,
    },
    qualityStep: QUALITY_IMPROVEMENT_STEP,
    items: player.inventoryItems.map((item) => toQualityItemView(item, player.credits)),
  };
}

export async function improvePlayerItemQuality(itemId: string) {
  const prisma = usePrisma();

  await seedDevelopmentPlayer(prisma);

  await prisma.$transaction(async (transaction) => {
    const [player, item] = await Promise.all([
      transaction.player.findUniqueOrThrow({
        where: { id: currentPlayerId() },
      }),
      transaction.inventoryItem.findUnique({
        where: { id: itemId },
      }),
    ]);

    if (!item || item.playerId !== currentPlayerId()) {
      throw new Error(`Inventory item "${itemId}" is not available for this player.`);
    }

    const definition = getCraftableDefinition(item.type as CraftableItemType, item.definitionId);
    const cost = qualityImprovementCost(definition.rarity as ImprovementRarity, item.quality);

    if (player.credits < cost) {
      throw new Error("Not enough credits.");
    }

    await transaction.player.update({
      where: { id: currentPlayerId() },
      data: { credits: player.credits - cost },
    });
    await transaction.inventoryItem.update({
      where: { id: item.id },
      data: {
        quality: Math.min(100, item.quality + QUALITY_IMPROVEMENT_STEP),
      },
    });
  });

  await assertValidPlayerGameState(prisma, currentPlayerId());
  return getPlayerQualityState();
}

export async function equipPlayerRing(ringItemId: string) {
  const prisma = usePrisma();

  await seedDevelopmentPlayer(prisma);

  await prisma.$transaction(async (transaction) => {
    const ring = await transaction.inventoryItem.findUnique({
      where: { id: ringItemId },
    });

    if (!ring || ring.playerId !== currentPlayerId() || ring.type !== "ring") {
      throw new Error(`Ring item "${ringItemId}" is not available for this player.`);
    }

    const existing = await transaction.equippedRing.findUnique({
      where: { ringItemId },
    });

    if (existing) {
      return;
    }

    const equippedRings = await transaction.equippedRing.findMany({
      where: { playerId: currentPlayerId() },
      select: { slotIndex: true },
      orderBy: { slotIndex: "asc" },
    });

    if (equippedRings.length >= maxEquippedRings) {
      throw new Error(`A player can equip at most ${maxEquippedRings} rings.`);
    }

    const usedSlots = new Set(equippedRings.map((entry) => entry.slotIndex));
    const slotIndex = Array.from({ length: maxEquippedRings }, (_, index) => index).find(
      (candidate) => !usedSlots.has(candidate),
    );

    if (slotIndex === undefined) {
      throw new Error("No equipment slot is available.");
    }

    await transaction.equippedRing.create({
      data: {
        playerId: currentPlayerId(),
        ringItemId,
        slotIndex,
      },
    });
    await transaction.inventoryItem.update({
      where: { id: ringItemId },
      data: { equipped: true },
    });
  });

  await assertValidPlayerGameState(prisma, currentPlayerId());
  return getPlayerEquipmentState();
}

export async function unequipPlayerRing(ringItemId: string) {
  const prisma = usePrisma();

  await seedDevelopmentPlayer(prisma);

  await prisma.$transaction(async (transaction) => {
    const ring = await transaction.inventoryItem.findUnique({
      where: { id: ringItemId },
    });

    if (!ring || ring.playerId !== currentPlayerId() || ring.type !== "ring") {
      throw new Error(`Ring item "${ringItemId}" is not available for this player.`);
    }

    await transaction.equippedRing.deleteMany({
      where: { playerId: currentPlayerId(), ringItemId },
    });
    await transaction.inventoryItem.update({
      where: { id: ringItemId },
      data: { equipped: false },
    });
  });

  await assertValidPlayerGameState(prisma, currentPlayerId());
  return getPlayerEquipmentState();
}

export async function resetDevelopmentPlayerState() {
  const prisma = usePrisma();

  await prisma.$transaction(async (transaction) => {
    await transaction.privateMatch.deleteMany({
      where: { participants: { some: { playerId: currentPlayerId() } } },
    });
    await transaction.battleRecord.deleteMany({
      where: {
        OR: [
          { playerOneId: currentPlayerId() },
          { playerTwoId: currentPlayerId() },
          { winnerPlayerId: currentPlayerId() },
        ],
      },
    });
    await transaction.player.deleteMany({ where: { id: currentPlayerId() } });
  });
  await seedDevelopmentPlayer(prisma);
  return getPlayerState();
}

export async function disconnectGameStateClientForTests(): Promise<void> {
  if (!globalForPrisma.battlenessPrisma) {
    return;
  }

  await globalForPrisma.battlenessPrisma.$disconnect();
  globalForPrisma.battlenessPrisma = undefined;
  globalForPrisma.battlenessPrismaUrl = undefined;
}

export function usePrisma(): PrismaClient {
  const databaseUrl = process.env.BATTLENESS_DATABASE_URL ?? defaultDatabaseUrl;

  if (globalForPrisma.battlenessPrisma && globalForPrisma.battlenessPrismaUrl === databaseUrl) {
    return globalForPrisma.battlenessPrisma;
  }

  const client = new PrismaClient({
    datasources: {
      db: { url: databaseUrl },
    },
  });

  if (process.env.NODE_ENV !== "production") {
    globalForPrisma.battlenessPrisma = client;
    globalForPrisma.battlenessPrismaUrl = databaseUrl;
  }

  return client;
}

async function registerCurrentContentRelease(client: PrismaContext): Promise<void> {
  await client.contentRelease.upsert({
    where: { version: legacyContentVersion },
    create: {
      version: legacyContentVersion,
      checksum: "unknown",
      manifestJson: JSON.stringify({ legacy: true }),
    },
    update: {},
  });

  const release = await client.contentRelease.upsert({
    where: { version: contentVersion },
    create: {
      version: contentVersion,
      checksum: contentChecksum,
      manifestJson: contentManifestJson,
    },
    update: {},
  });

  if (release.checksum !== contentChecksum || release.manifestJson !== contentManifestJson) {
    throw new Error(
      `Content version "${contentVersion}" is already registered with different definitions.`,
    );
  }

  await Promise.all([
    client.inventoryItem.updateMany({
      where: { contentVersion: null },
      data: { contentVersion: legacyContentVersion },
    }),
    client.rewardGrant.updateMany({
      where: { contentVersion: null },
      data: { contentVersion: legacyContentVersion },
    }),
  ]);
}

export async function seedDevelopmentPlayer(client: PrismaContext): Promise<void> {
  await registerCurrentContentRelease(client);

  const playerId = currentPlayerId();
  const isDefaultDevelopmentPlayer = playerId === developmentPlayerId;

  await client.player.upsert({
    where: { id: playerId },
    create: {
      id: playerId,
      username: isDefaultDevelopmentPlayer ? "Dev Player" : "Dev Player 2",
      displayName: isDefaultDevelopmentPlayer ? "Dev Player" : "Dev Player 2",
      experience: 0,
      credits: developmentStartingCredits,
      nextItemSequence: 1,
    },
    update: { lastActiveAt: new Date() },
  });
  await client.playerPreferences.upsert({
    where: { playerId },
    create: { playerId },
    update: {},
  });

  const existingStockCount = await client.materialStock.count({
    where: { playerId },
  });

  if (existingStockCount > 0) {
    return;
  }

  await saveMaterialStock(client, playerId, createMaterialStock(definitions.materials, 2));
}

async function saveMaterialStock(
  client: PrismaContext,
  playerId: string,
  stock: MaterialStock,
): Promise<void> {
  await Promise.all(
    definitions.materials.map((material) =>
      client.materialStock.upsert({
        where: { playerId_materialId: { playerId, materialId: material.id } },
        create: {
          playerId,
          materialId: material.id,
          quantity: stock[material.id] ?? 0,
          contentVersion,
        },
        update: { quantity: stock[material.id] ?? 0, contentVersion },
      }),
    ),
  );
}

function toProfileSettingsView(player: ProfileSettingsPlayer) {
  const preferences = player.preferences;

  return {
    profile: {
      id: player.id,
      username: player.username,
      displayName: player.displayName ?? player.username,
      visibility: player.profileVisibility as "public" | "private",
      createdAt: player.createdAt.toISOString(),
      lastActiveAt: player.lastActiveAt.toISOString(),
    },
    preferences: {
      locale: (preferences?.locale ?? "en") as "en" | "fr",
      theme: (preferences?.theme ?? "system") as "system" | "dark" | "light",
      reducedMotion: preferences?.reducedMotion ?? false,
      interfaceDensity: (preferences?.interfaceDensity ?? "comfortable") as
        | "comfortable"
        | "compact",
      muted: preferences?.muted ?? false,
      masterVolume: preferences?.masterVolume ?? 100,
      musicVolume: preferences?.musicVolume ?? 70,
      effectsVolume: preferences?.effectsVolume ?? 80,
      updatedAt: preferences?.updatedAt.toISOString() ?? null,
    },
  };
}

function normalizeProfileSettingsInput(input: ProfileSettingsInput): ProfileSettingsInput {
  if (!input || typeof input !== "object") {
    throw new Error("Profile settings are required.");
  }

  const displayName = typeof input.displayName === "string" ? input.displayName.trim() : "";
  if (
    displayName.length < 2 ||
    displayName.length > 32 ||
    [...displayName].some((character) => {
      const code = character.charCodeAt(0);
      return code < 32 || code === 127;
    })
  ) {
    throw new Error("displayName must contain between 2 and 32 printable characters.");
  }

  assertProfileSettingOption(input.profileVisibility, ["public", "private"], "visibility");
  assertProfileSettingOption(input.locale, ["en", "fr"], "locale");
  assertProfileSettingOption(input.theme, ["system", "dark", "light"], "theme");
  assertProfileSettingOption(
    input.interfaceDensity,
    ["comfortable", "compact"],
    "interfaceDensity",
  );
  if (typeof input.reducedMotion !== "boolean" || typeof input.muted !== "boolean") {
    throw new Error("reducedMotion and muted must be boolean values.");
  }

  for (const [name, value] of [
    ["masterVolume", input.masterVolume],
    ["musicVolume", input.musicVolume],
    ["effectsVolume", input.effectsVolume],
  ] as const) {
    if (!Number.isInteger(value) || value < 0 || value > 100) {
      throw new Error(`${name} must be an integer between 0 and 100.`);
    }
  }

  return { ...input, displayName };
}

function assertProfileSettingOption(value: string, allowed: readonly string[], name: string): void {
  if (!allowed.includes(value)) {
    throw new Error(`${name} must be one of: ${allowed.join(", ")}.`);
  }
}

async function insertCraftedItem(
  client: PrismaContext,
  playerId: string,
  crafted: CraftedItemInstance,
): Promise<void> {
  const commonData = {
    id: crafted.item.id,
    playerId,
    type: crafted.type,
    definitionId: crafted.item.definitionId,
    contentVersion,
    experience: crafted.item.experience,
    quality: crafted.item.quality,
  };

  await client.inventoryItem.create({
    data: {
      ...commonData,
      socketCount: crafted.type === "ring" ? crafted.item.socketCount : null,
      socketedGemInstanceIds:
        crafted.type === "ring" ? JSON.stringify(crafted.item.socketedGemInstanceIds) : "[]",
      enchantment:
        crafted.type === "gem" && crafted.item.enchantment
          ? JSON.stringify(crafted.item.enchantment)
          : null,
      equipped: crafted.type === "ring" ? crafted.item.equipped : false,
    },
  });
}

function materialStockFromRows(rows: readonly MaterialStockRow[]): MaterialStock {
  return Object.fromEntries(rows.map((row) => [row.materialId, row.quantity]));
}

function toInventoryView(row: InventoryItem) {
  const type = row.type as CraftableItemType;
  const definition = getCraftableDefinition(type, row.definitionId);
  const level = levelFromExperience(row.experience);

  return {
    id: row.id,
    type,
    definitionId: row.definitionId,
    contentVersion: row.contentVersion ?? legacyContentVersion,
    label: label(definition.nameKey),
    rarity: definition.rarity,
    element: definition.element,
    experience: row.experience,
    level,
    progression: toExperienceProgression(row.experience),
    quality: row.quality,
    bonusPercent: itemBonusPercent(level, row.quality),
    socketCount: row.socketCount,
    equipped: row.equipped,
  };
}

function toExperienceProgression(experience: number) {
  const level = levelFromExperience(experience);
  const currentLevelExperience = experienceForLevel(level);
  const nextLevelExperience = level < MAX_LEVEL ? experienceForLevel(level + 1) : null;
  const experienceIntoLevel = experience - currentLevelExperience;
  const experienceForNextLevel =
    nextLevelExperience === null ? null : nextLevelExperience - currentLevelExperience;

  return {
    level,
    maxLevel: MAX_LEVEL,
    currentLevelExperience,
    nextLevelExperience,
    experienceIntoLevel,
    experienceForNextLevel,
    experienceRemaining:
      nextLevelExperience === null ? 0 : Math.max(0, nextLevelExperience - experience),
    progressPercent:
      experienceForNextLevel === null
        ? 100
        : Math.floor((experienceIntoLevel * 100) / experienceForNextLevel),
  };
}

function toEquipmentRingView(input: {
  ring: InventoryItem;
  slotIndex: number | null;
  equipped: boolean;
  inventoryById: ReadonlyMap<string, InventoryItem>;
  sockets: readonly RingSocketRow[];
  enchantmentByGemId: ReadonlyMap<string, GemEnchantmentRow>;
}) {
  const definition = getRingDefinition(input.ring.definitionId);
  const ringLevel = levelFromExperience(input.ring.experience);
  const gems = resolveEquipmentGems(input);
  const gemDamage = gems.reduce((total, gem) => total + gem.damage, 0);
  const spellDamage = gems.reduce(
    (total, gem) => total + (gem.enchantment?.type === "spell" ? gem.enchantment.damage : 0),
    0,
  );
  const monsterDamage = gems.reduce(
    (total, gem) => total + (gem.enchantment?.type === "monster" ? gem.enchantment.damage : 0),
    0,
  );
  const energyPenalty = gems.reduce((total, gem) => total + gem.energyPenalty, 0);
  const cooldownPenalty = gems.reduce((total, gem) => total + gem.cooldownPenalty, 0);
  const ringDamage = resolveItemStat(definition.baseDamage, ringLevel, input.ring.quality);
  const resolvedEnergyCost = Math.max(1, definition.baseEnergyCost + energyPenalty);
  const resolvedCooldown = definition.baseCooldown + cooldownPenalty;

  return {
    id: input.ring.id,
    definitionId: input.ring.definitionId,
    label: label(definition.nameKey),
    rarity: definition.rarity,
    element: definition.element,
    experience: input.ring.experience,
    level: ringLevel,
    quality: input.ring.quality,
    socketCount: input.ring.socketCount,
    equipped: input.equipped,
    slotIndex: input.slotIndex,
    baseDamage: definition.baseDamage,
    baseEnergyCost: definition.baseEnergyCost,
    baseCooldown: definition.baseCooldown,
    baseSpeed: definition.baseSpeed,
    damage: ringDamage + gemDamage + spellDamage + monsterDamage,
    ringDamage,
    gemDamage,
    spellDamage,
    monsterDamage,
    energyCost: resolvedEnergyCost,
    cooldown: resolvedCooldown,
    energyPenalty,
    cooldownPenalty,
    gems,
  };
}

function toSocketRingView(input: {
  ring: InventoryItem;
  playerCredits: number;
  slotIndex: number | null;
  equipped: boolean;
  inventoryById: ReadonlyMap<string, InventoryItem>;
  sockets: readonly RingSocketRow[];
  enchantmentByGemId: ReadonlyMap<string, GemEnchantmentRow>;
}) {
  const definition = getRingDefinition(input.ring.definitionId);
  const cost =
    input.ring.socketCount === null || input.ring.socketCount >= maxRingSockets
      ? null
      : socketImprovementCost(definition.rarity as ImprovementRarity, input.ring.socketCount);

  return {
    ...toEquipmentRingView(input),
    nextSocketCount:
      input.ring.socketCount === null ? null : Math.min(maxRingSockets, input.ring.socketCount + 1),
    socketImprovementCost: cost,
    canImproveSockets: cost !== null && input.playerCredits >= cost,
  };
}

function toEquipmentSummary(equippedRings: readonly EquipmentRingItem[]) {
  const totalSpeed = equippedRings.reduce((total, ring) => total + ring.baseSpeed, 0);
  const totalDamage = equippedRings.reduce((total, ring) => total + ring.damage, 0);
  const totalRingDamage = equippedRings.reduce((total, ring) => total + ring.ringDamage, 0);
  const totalGemDamage = equippedRings.reduce((total, ring) => total + ring.gemDamage, 0);
  const totalSpellDamage = equippedRings.reduce((total, ring) => total + ring.spellDamage, 0);
  const totalMonsterDamage = equippedRings.reduce((total, ring) => total + ring.monsterDamage, 0);
  const totalEnergyCost = equippedRings.reduce((total, ring) => total + ring.energyCost, 0);
  const totalCooldown = equippedRings.reduce((total, ring) => total + ring.cooldown, 0);
  const totalEnergyPenalty = equippedRings.reduce((total, ring) => total + ring.energyPenalty, 0);
  const totalCooldownPenalty = equippedRings.reduce(
    (total, ring) => total + ring.cooldownPenalty,
    0,
  );
  const ringCount = equippedRings.length;

  return {
    ringCount,
    totalSpeed,
    totalDamage,
    totalRingDamage,
    totalGemDamage,
    totalSpellDamage,
    totalMonsterDamage,
    totalEnergyPenalty,
    totalCooldownPenalty,
    averageEnergyCost: ringCount === 0 ? 0 : Number((totalEnergyCost / ringCount).toFixed(1)),
    averageCooldown: ringCount === 0 ? 0 : Number((totalCooldown / ringCount).toFixed(1)),
  };
}

function toLoadoutView(input: {
  loadout: LoadoutRow;
  activeLoadoutId: string | null;
  inventoryById: ReadonlyMap<string, InventoryItem>;
  socketsByRingId: ReadonlyMap<string, readonly RingSocketRow[]>;
  enchantmentByGemId: ReadonlyMap<string, GemEnchantmentRow>;
}) {
  const rings = input.loadout.rings
    .map((entry) => ({
      loadoutRing: entry,
      ring: input.inventoryById.get(entry.ringItemId),
    }))
    .filter((entry): entry is { loadoutRing: LoadoutRingRow; ring: InventoryItem } =>
      Boolean(entry.ring),
    )
    .map((entry) =>
      toEquipmentRingView({
        ring: entry.ring,
        slotIndex: entry.loadoutRing.slotIndex,
        equipped: false,
        inventoryById: input.inventoryById,
        sockets: input.socketsByRingId.get(entry.ring.id) ?? [],
        enchantmentByGemId: input.enchantmentByGemId,
      }),
    );

  return {
    id: input.loadout.id,
    name: input.loadout.name,
    active: input.activeLoadoutId === input.loadout.id,
    ringCount: rings.length,
    rings,
    summary: toEquipmentSummary(rings),
  };
}

function toSocketGemView(input: {
  gem: InventoryItem;
  socket: RingSocketRow | null;
  enchantmentByGemId: ReadonlyMap<string, GemEnchantmentRow>;
  inventoryById: ReadonlyMap<string, InventoryItem>;
}) {
  const definition = getGemDefinition(input.gem.definitionId);
  const gemLevel = levelFromExperience(input.gem.experience);
  const resolvedEnchantment = toEquipmentEnchantmentView(
    input.enchantmentByGemId.get(input.gem.id),
    input.inventoryById,
  );
  const spellEnergyPenalty =
    resolvedEnchantment?.type === "spell" ? resolvedEnchantment.energyPenalty : 0;
  const spellCooldownPenalty =
    resolvedEnchantment?.type === "spell" ? resolvedEnchantment.cooldownPenalty : 0;

  return {
    id: input.gem.id,
    definitionId: input.gem.definitionId,
    label: label(definition.nameKey),
    rarity: definition.rarity,
    element: definition.element,
    experience: input.gem.experience,
    level: gemLevel,
    quality: input.gem.quality,
    damage: resolveItemStat(definition.baseDamage, gemLevel, input.gem.quality),
    energyPenalty: definition.baseEnergyPenalty + spellEnergyPenalty,
    cooldownPenalty: definition.baseCooldownPenalty + spellCooldownPenalty,
    socketedRingId: input.socket?.ringItemId ?? null,
    socketIndex: input.socket?.socketIndex ?? null,
    enchantment: resolvedEnchantment,
  };
}

function toSocketEnchantmentTargetView(input: {
  target: InventoryItem;
  enchantment: GemEnchantmentRow | null;
}) {
  if (input.target.type === "spell") {
    const definition = getSpellDefinition(input.target.definitionId);
    const spellLevel = levelFromExperience(input.target.experience);
    const damage = definition.effects.reduce(
      (total, effect) =>
        total +
        (effect.type === "dealDamage"
          ? resolveItemStat(effect.amount, spellLevel, input.target.quality)
          : 0),
      0,
    );

    return {
      id: input.target.id,
      type: "spell" as const,
      definitionId: input.target.definitionId,
      label: label(definition.nameKey),
      rarity: definition.rarity,
      element: definition.element,
      experience: input.target.experience,
      level: spellLevel,
      quality: input.target.quality,
      damage,
      energyPenalty: definition.baseEnergyPenalty,
      cooldownPenalty: definition.baseCooldownPenalty,
      enchantedGemId: input.enchantment?.gemItemId ?? null,
    };
  }

  const definition = getMonsterDefinition(input.target.definitionId);
  const monsterLevel = levelFromExperience(input.target.experience);

  return {
    id: input.target.id,
    type: "monster" as const,
    definitionId: input.target.definitionId,
    label: label(definition.nameKey),
    rarity: definition.rarity,
    element: definition.element,
    experience: input.target.experience,
    level: monsterLevel,
    quality: input.target.quality,
    damage: resolveItemStat(definition.baseDamage, monsterLevel, input.target.quality),
    health: resolveItemStat(definition.baseHealth, monsterLevel, input.target.quality),
    cooldown: definition.baseCooldown,
    skill: definition.skill ?? null,
    enchantedGemId: input.enchantment?.gemItemId ?? null,
  };
}

function toQualityItemView(item: InventoryItem, playerCredits: number) {
  const type = item.type as CraftableItemType;
  const definition = getCraftableDefinition(type, item.definitionId);
  const cost =
    item.quality >= 100
      ? null
      : qualityImprovementCost(definition.rarity as ImprovementRarity, item.quality);
  const nextQuality = Math.min(100, item.quality + QUALITY_IMPROVEMENT_STEP);

  return {
    id: item.id,
    type,
    definitionId: item.definitionId,
    label: label(definition.nameKey),
    rarity: definition.rarity,
    element: definition.element,
    experience: item.experience,
    level: levelFromExperience(item.experience),
    quality: item.quality,
    nextQuality,
    cost,
    canImprove: cost !== null && playerCredits >= cost,
    stats: qualityPreviewStats(item, nextQuality),
  };
}

function qualityPreviewStats(item: InventoryItem, nextQuality: number) {
  const level = levelFromExperience(item.experience);

  if (item.type === "ring") {
    const definition = getRingDefinition(item.definitionId);

    return [
      {
        label: "Damage",
        current: resolveItemStat(definition.baseDamage, level, item.quality),
        next: resolveItemStat(definition.baseDamage, level, nextQuality),
      },
      {
        label: "Energy",
        current: definition.baseEnergyCost,
        next: definition.baseEnergyCost,
      },
      {
        label: "Cooldown",
        current: definition.baseCooldown,
        next: definition.baseCooldown,
      },
    ];
  }

  if (item.type === "gem") {
    const definition = getGemDefinition(item.definitionId);

    return [
      {
        label: "Damage",
        current: resolveItemStat(definition.baseDamage, level, item.quality),
        next: resolveItemStat(definition.baseDamage, level, nextQuality),
      },
      {
        label: "Energy Penalty",
        current: definition.baseEnergyPenalty,
        next: definition.baseEnergyPenalty,
      },
      {
        label: "Cooldown Penalty",
        current: definition.baseCooldownPenalty,
        next: definition.baseCooldownPenalty,
      },
    ];
  }

  if (item.type === "monster") {
    const definition = getMonsterDefinition(item.definitionId);

    return [
      {
        label: "Damage",
        current: resolveItemStat(definition.baseDamage, level, item.quality),
        next: resolveItemStat(definition.baseDamage, level, nextQuality),
      },
      {
        label: "Health",
        current: resolveItemStat(definition.baseHealth, level, item.quality),
        next: resolveItemStat(definition.baseHealth, level, nextQuality),
      },
      {
        label: "Cooldown",
        current: definition.baseCooldown,
        next: definition.baseCooldown,
      },
    ];
  }

  const definition = getSpellDefinition(item.definitionId);
  const damage = spellDamagePreview(definition, level, item.quality);
  const nextDamage = spellDamagePreview(definition, level, nextQuality);

  return [
    {
      label: "Damage",
      current: damage,
      next: nextDamage,
    },
    {
      label: "Energy Penalty",
      current: definition.baseEnergyPenalty,
      next: definition.baseEnergyPenalty,
    },
    {
      label: "Cooldown Penalty",
      current: definition.baseCooldownPenalty,
      next: definition.baseCooldownPenalty,
    },
  ];
}

function spellDamagePreview(definition: SpellDefinition, level: number, quality: number): number {
  return definition.effects.reduce(
    (total, effect) =>
      total + (effect.type === "dealDamage" ? resolveItemStat(effect.amount, level, quality) : 0),
    0,
  );
}

function resolveEquipmentGems(input: {
  ring: InventoryItem;
  inventoryById: ReadonlyMap<string, InventoryItem>;
  sockets: readonly RingSocketRow[];
  enchantmentByGemId: ReadonlyMap<string, GemEnchantmentRow>;
}): EquipmentGemItem[] {
  const normalizedGemIds = new Set(input.sockets.map((socket) => socket.gemItemId));
  const legacyGemIds = parseJsonStringArray(input.ring.socketedGemInstanceIds).filter(
    (gemId) => !normalizedGemIds.has(gemId),
  );
  const normalizedGems = input.sockets
    .map((socket) => ({
      socketIndex: socket.socketIndex,
      gem: input.inventoryById.get(socket.gemItemId),
    }))
    .filter(
      (entry): entry is { socketIndex: number; gem: InventoryItem } => entry.gem !== undefined,
    );
  const legacyGems = legacyGemIds
    .map((gemId, index) => ({
      socketIndex: input.sockets.length + index,
      gem: input.inventoryById.get(gemId),
    }))
    .filter(
      (entry): entry is { socketIndex: number; gem: InventoryItem } => entry.gem !== undefined,
    );

  return [...normalizedGems, ...legacyGems]
    .filter((entry) => entry.gem.type === "gem")
    .sort((left, right) => left.socketIndex - right.socketIndex)
    .map((entry) =>
      toEquipmentGemView(
        entry.gem,
        entry.socketIndex,
        input.enchantmentByGemId.get(entry.gem.id),
        input.inventoryById,
      ),
    );
}

function toEquipmentGemView(
  row: InventoryItem,
  socketIndex: number,
  enchantment: GemEnchantmentRow | undefined,
  inventoryById: ReadonlyMap<string, InventoryItem>,
): EquipmentGemItem {
  const definition = getGemDefinition(row.definitionId);
  const gemLevel = levelFromExperience(row.experience);
  const resolvedEnchantment = enchantment
    ? toEquipmentEnchantmentView(enchantment, inventoryById)
    : null;
  const spellEnergyPenalty =
    resolvedEnchantment?.type === "spell" ? resolvedEnchantment.energyPenalty : 0;
  const spellCooldownPenalty =
    resolvedEnchantment?.type === "spell" ? resolvedEnchantment.cooldownPenalty : 0;

  return {
    id: row.id,
    definitionId: row.definitionId,
    label: label(definition.nameKey),
    rarity: definition.rarity,
    element: definition.element,
    experience: row.experience,
    level: gemLevel,
    quality: row.quality,
    socketIndex,
    damage: resolveItemStat(definition.baseDamage, gemLevel, row.quality),
    energyPenalty: definition.baseEnergyPenalty + spellEnergyPenalty,
    cooldownPenalty: definition.baseCooldownPenalty + spellCooldownPenalty,
    enchantment: resolvedEnchantment,
  };
}

function toEquipmentEnchantmentView(
  enchantment: GemEnchantmentRow | undefined,
  inventoryById: ReadonlyMap<string, InventoryItem>,
): EquipmentEnchantmentItem | null {
  if (!enchantment) {
    return null;
  }

  const target = inventoryById.get(enchantment.targetItemId);

  if (!target) {
    return null;
  }

  if (enchantment.targetType === "spell" && target.type === "spell") {
    const definition = getSpellDefinition(target.definitionId);
    const spellLevel = levelFromExperience(target.experience);
    const damage = definition.effects.reduce(
      (total, effect) =>
        total +
        (effect.type === "dealDamage"
          ? resolveItemStat(effect.amount, spellLevel, target.quality)
          : 0),
      0,
    );

    return {
      id: target.id,
      type: "spell",
      definitionId: target.definitionId,
      label: label(definition.nameKey),
      rarity: definition.rarity,
      element: definition.element,
      level: spellLevel,
      quality: target.quality,
      damage,
      energyPenalty: definition.baseEnergyPenalty,
      cooldownPenalty: definition.baseCooldownPenalty,
    };
  }

  if (enchantment.targetType === "monster" && target.type === "monster") {
    const definition = getMonsterDefinition(target.definitionId);
    const monsterLevel = levelFromExperience(target.experience);

    return {
      id: target.id,
      type: "monster",
      definitionId: target.definitionId,
      label: label(definition.nameKey),
      rarity: definition.rarity,
      element: definition.element,
      level: monsterLevel,
      quality: target.quality,
      damage: resolveItemStat(definition.baseDamage, monsterLevel, target.quality),
      health: resolveItemStat(definition.baseHealth, monsterLevel, target.quality),
      cooldown: definition.baseCooldown,
      skill: definition.skill ?? null,
    };
  }

  return null;
}

function groupSocketsByRingId(sockets: readonly RingSocketRow[]): Map<string, RingSocketRow[]> {
  const grouped = new Map<string, RingSocketRow[]>();

  for (const socket of sockets) {
    const group = grouped.get(socket.ringItemId) ?? [];
    group.push(socket);
    grouped.set(socket.ringItemId, group);
  }

  return grouped;
}

function normalizeLoadoutName(name: string): string {
  const normalized = name.trim().replace(/\s+/g, " ");

  if (normalized.length < 2) {
    throw new Error("Loadout name must contain at least 2 characters.");
  }
  if (normalized.length > 40) {
    throw new Error("Loadout name cannot exceed 40 characters.");
  }

  return normalized;
}

async function syncLegacySocketedGemIds(client: PrismaContext, ringItemId: string): Promise<void> {
  const sockets = await client.ringSocket.findMany({
    where: { ringItemId },
    orderBy: { socketIndex: "asc" },
  });

  await client.inventoryItem.update({
    where: { id: ringItemId },
    data: {
      socketedGemInstanceIds: JSON.stringify(sockets.map((socket) => socket.gemItemId)),
    },
  });
}

function toCraftedItemView(crafted: CraftedItemInstance) {
  const definition = getCraftableDefinition(crafted.type, crafted.item.definitionId);

  return {
    id: crafted.item.id,
    type: crafted.type,
    definitionId: crafted.item.definitionId,
    label: label(definition.nameKey),
    rarity: definition.rarity,
    element: definition.element,
  };
}

function toRecipeView(recipe: RecipeDefinition, stock: MaterialStock) {
  const output = getCraftableDefinition(recipe.outputType, recipe.outputDefinitionId);

  return {
    id: recipe.id,
    outputType: recipe.outputType,
    outputDefinitionId: recipe.outputDefinitionId,
    outputLabel: label(output.nameKey),
    outputRarity: output.rarity,
    outputElement: output.element,
    craftedLevel: recipe.craftedLevel,
    craftedQuality: recipe.craftedQuality,
    canCraft: canCraftRecipe(recipe, stock),
    ingredients: recipe.ingredients.map((ingredient) => {
      const material = getMaterialDefinition(ingredient.materialId);

      return {
        materialId: ingredient.materialId,
        label: label(material.nameKey),
        quantity: ingredient.quantity,
        available: stock[ingredient.materialId] ?? 0,
      };
    }),
  };
}

function getCraftableDefinition(
  type: CraftableItemType,
  definitionId: string,
): CraftableDefinition {
  const collections = {
    ring: definitions.rings,
    gem: definitions.gems,
    monster: definitions.monsters,
    spell: definitions.spells,
  };
  const definition = collections[type].find((candidate) => candidate.id === definitionId);

  if (!definition) {
    throw new Error(`Unknown ${type} definition "${definitionId}".`);
  }

  return definition;
}

function getRingDefinition(definitionId: string): RingDefinition {
  const definition = definitions.rings.find((candidate) => candidate.id === definitionId);

  if (!definition) {
    throw new Error(`Unknown ring definition "${definitionId}".`);
  }

  return definition;
}

function getGemDefinition(definitionId: string): GemDefinition {
  const definition = definitions.gems.find((candidate) => candidate.id === definitionId);

  if (!definition) {
    throw new Error(`Unknown gem definition "${definitionId}".`);
  }

  return definition;
}

function getSpellDefinition(definitionId: string): SpellDefinition {
  const definition = definitions.spells.find((candidate) => candidate.id === definitionId);

  if (!definition) {
    throw new Error(`Unknown spell definition "${definitionId}".`);
  }

  return definition;
}

function getMonsterDefinition(definitionId: string): MonsterDefinition {
  const definition = definitions.monsters.find((candidate) => candidate.id === definitionId);

  if (!definition) {
    throw new Error(`Unknown monster definition "${definitionId}".`);
  }

  return definition;
}

function getMaterialDefinition(materialId: string): MaterialDefinition {
  const material = definitions.materials.find((candidate) => candidate.id === materialId);

  if (!material) {
    throw new Error(`Unknown material "${materialId}".`);
  }

  return material;
}

function materialBuyPrice(material: MaterialDefinition): number {
  const price = materialBuyPrices[material.rarity];

  if (price === undefined) {
    throw new Error(`No buy price configured for material rarity "${material.rarity}".`);
  }

  return price;
}

function liveTrainingBattleSetup(input: {
  requestId: string;
  player: LiveBattlePlayerSource;
}): BattleSetup {
  if (!input.player.activeLoadout) {
    throw new Error("An active loadout is required.");
  }

  const baseSetup = createBattleSetupFromFixture("basicDuel");
  const resolvedDefinitions = structuredClone(baseSetup.definitions);
  const activeRingIds = new Set(input.player.activeLoadout.rings.map((ring) => ring.ringItemId));
  const socketsByRingId = groupSocketsByRingId(input.player.ringSockets);
  const enchantmentByGemId = new Map(
    input.player.gemEnchantments.map((enchantment) => [enchantment.gemItemId, enchantment]),
  );
  const inventoryById = new Map(input.player.inventoryItems.map((item) => [item.id, item]));
  const inventory: InventoryFixture = {
    rings: input.player.inventoryItems
      .filter((item) => item.type === "ring")
      .map((item) => {
        if (item.socketCount === null) {
          throw new Error(`Ring item "${item.id}" has no socket count.`);
        }

        return {
          id: item.id,
          definitionId: item.definitionId,
          ownerId: input.player.id,
          experience: item.experience,
          quality: item.quality,
          socketCount: item.socketCount,
          socketedGemInstanceIds: (socketsByRingId.get(item.id) ?? []).map(
            (socket) => socket.gemItemId,
          ),
          equipped: activeRingIds.has(item.id),
        };
      }),
    gems: input.player.inventoryItems
      .filter((item) => item.type === "gem")
      .map((item) => {
        const enchantment = enchantmentByGemId.get(item.id);
        const target = enchantment ? inventoryById.get(enchantment.targetItemId) : null;

        return {
          id: item.id,
          definitionId: item.definitionId,
          ownerId: input.player.id,
          experience: item.experience,
          quality: item.quality,
          ...(target?.type === "monster"
            ? { enchantment: { type: "monster" as const, monsterInstanceId: target.id } }
            : target?.type === "spell"
              ? { enchantment: { type: "spell" as const, spellInstanceId: target.id } }
              : {}),
        };
      }),
    monsters: input.player.inventoryItems
      .filter((item) => item.type === "monster")
      .map((item) => ({
        id: item.id,
        definitionId: item.definitionId,
        ownerId: input.player.id,
        experience: item.experience,
        quality: item.quality,
      })),
    spells: input.player.inventoryItems
      .filter((item) => item.type === "spell")
      .map((item) => ({
        id: item.id,
        definitionId: item.definitionId,
        ownerId: input.player.id,
        experience: item.experience,
        quality: item.quality,
      })),
  };
  const playerFixture: PlayerFixture = {
    id: input.player.id,
    username: input.player.username,
    experience: input.player.experience,
    equippedRingInstanceIds: input.player.activeLoadout.rings.map((ring) => ring.ringItemId),
  };
  const viewer = createBattlePlayerFromInventory(playerFixture, inventory, resolvedDefinitions);

  return {
    ...baseSetup,
    id: `training.${input.requestId}`,
    seed: `training.${input.requestId}`,
    definitions: resolvedDefinitions,
    players: [viewer, baseSetup.players[1]],
  };
}

function liveCampaignBattleSetup(input: {
  requestId: string;
  player: LiveBattlePlayerSource;
  opponent: CampaignOpponent;
}): BattleSetup {
  const trainingSetup = liveTrainingBattleSetup({
    requestId: input.requestId,
    player: input.player,
  });
  const campaignOpponent = createCampaignOpponentBattlePlayer({
    opponent: input.opponent,
    username: label(input.opponent.nameKey),
    resolvedDefinitions: trainingSetup.definitions,
  });

  return {
    ...trainingSetup,
    id: `campaign.${input.opponent.id}.${input.requestId}`,
    seed: `campaign.${input.opponent.id}.${input.requestId}`,
    players: [trainingSetup.players[0], campaignOpponent],
  };
}

type PrivateBattleParticipantSource = {
  playerId: string;
  loadout: { rings: readonly { ringItemId: string }[] } | null;
  player: Omit<LiveBattlePlayerSource, "activeLoadout">;
};

function livePrivateBattleSetup(
  matchId: string,
  host: PrivateBattleParticipantSource,
  guest: PrivateBattleParticipantSource,
): BattleSetup {
  if (!host.loadout || !guest.loadout) {
    throw new Error("Both private match participants require a loadout.");
  }
  const hostSetup = liveTrainingBattleSetup({
    requestId: `${matchId}.host`,
    player: { ...host.player, activeLoadout: host.loadout },
  });
  const guestSetup = liveTrainingBattleSetup({
    requestId: `${matchId}.guest`,
    player: { ...guest.player, activeLoadout: guest.loadout },
  });

  return {
    ...hostSetup,
    id: `private.${matchId}`,
    seed: `private.${matchId}`,
    players: [hostSetup.players[0]!, guestSetup.players[0]!],
  };
}

function getCampaignOpponent(opponentId: string): CampaignOpponent {
  const opponent = definitions.campaignOpponents.find((candidate) => candidate.id === opponentId);
  if (!opponent) {
    throw new Error(`Unknown campaign opponent "${opponentId}".`);
  }
  return opponent;
}

function assertCampaignOpponentAvailable(
  opponent: CampaignOpponent,
  progress: readonly { opponentId: string; victoryCount: number }[],
): void {
  const victoryCount =
    progress.find((entry) => entry.opponentId === opponent.id)?.victoryCount ?? 0;
  if (victoryCount > 0 && !opponent.repeatable) {
    throw new Error(`Campaign opponent "${opponent.id}" cannot be repeated.`);
  }
  if (!opponent.prerequisiteOpponentId) {
    return;
  }
  const prerequisiteVictories =
    progress.find((entry) => entry.opponentId === opponent.prerequisiteOpponentId)?.victoryCount ??
    0;
  if (prerequisiteVictories === 0) {
    throw new Error(
      `Campaign opponent "${opponent.id}" is locked until "${opponent.prerequisiteOpponentId}" is cleared.`,
    );
  }
}

function rebuildBattleState(setupJson: string, actionLogJson: string): BattleState {
  const setup = JSON.parse(setupJson) as BattleSetup;
  const actions = JSON.parse(actionLogJson) as BattleAction[];
  let state = createBattleState(setup);

  if (!Array.isArray(actions)) {
    throw new Error("Persisted battle action history must be an array.");
  }

  for (const action of actions) {
    state = applyBattleAction(state, action).state;
  }

  return state;
}

function toViewerBattleAction(command: LiveBattleActionCommand): BattleAction {
  switch (command.type) {
    case "chooseElement":
      return { type: command.type, playerId: currentPlayerId(), element: command.element };
    case "useRing":
      return {
        type: command.type,
        playerId: currentPlayerId(),
        ringInstanceId: command.ringInstanceId,
        targetId: command.targetId as TargetId,
        ...(command.enchantmentTargets
          ? {
              enchantmentTargets: Object.fromEntries(
                Object.entries(command.enchantmentTargets).map(([gemId, targetId]) => [
                  gemId,
                  targetId as TargetId,
                ]),
              ),
            }
          : {}),
      };
    case "useMonster":
      return {
        type: command.type,
        playerId: currentPlayerId(),
        monsterInstanceId: command.monsterInstanceId,
        targetId: command.targetId as TargetId,
      };
    case "endTurn":
    case "concede":
      return { type: command.type, playerId: currentPlayerId() };
  }
}

function advanceTrainingOpponent(initialState: BattleState): {
  state: BattleState;
  events: ReturnType<typeof applyBattleAction>["events"];
} {
  let state = initialState;
  const events: ReturnType<typeof applyBattleAction>["events"] = [];
  const opponent = state.players.find((player) => player.id !== currentPlayerId());
  if (!opponent) {
    return { state, events };
  }

  for (let step = 0; step < 3; step += 1) {
    let automaticAction: BattleAction | null = null;

    if (state.status === "choosingFirstPlayer" && !state.firstPlayerChoices?.[opponent.id]) {
      automaticAction = {
        type: "chooseElement",
        playerId: opponent.id,
        element: trainingOpponentElement(state, opponent.id),
      };
    } else if (state.status === "active" && state.activePlayerId === opponent.id) {
      automaticAction = { type: "endTurn", playerId: opponent.id };
    }

    if (!automaticAction) {
      break;
    }

    const applied = applyBattleAction(state, automaticAction);
    state = applied.state;
    events.push(...applied.events);
  }

  return { state, events };
}

function advanceCampaignOpponent(
  initialState: BattleState,
  opponentDefinition: CampaignOpponent,
): {
  state: BattleState;
  events: ReturnType<typeof applyBattleAction>["events"];
} {
  let state = initialState;
  const events: ReturnType<typeof applyBattleAction>["events"] = [];
  const opponentId = state.players.find((player) => player.id !== currentPlayerId())?.id;
  if (!opponentId) {
    return { state, events };
  }

  for (let step = 0; step < 50 && state.status !== "finished"; step += 1) {
    let automaticAction: BattleAction | null = null;
    const opponent = state.players.find((player) => player.id === opponentId);
    if (!opponent) {
      throw new Error(`Campaign opponent "${opponentId}" left the battle state.`);
    }

    if (state.status === "choosingFirstPlayer" && !state.firstPlayerChoices?.[opponent.id]) {
      automaticAction = {
        type: "chooseElement",
        playerId: opponent.id,
        element: campaignOpponentElement(state, opponent.id, opponentDefinition.element),
      };
    } else if (state.status === "active" && state.activePlayerId === opponent.id) {
      const targetId = campaignOpponentTarget(state, opponent.id);
      const monster = opponent.monsters.find((candidate) => candidate.currentCooldown === 0);
      const ring = opponent.rings.find(
        (candidate) =>
          candidate.currentCooldown === 0 && candidate.energyCost <= opponent.energy.current,
      );

      automaticAction = monster
        ? {
            type: "useMonster",
            playerId: opponent.id,
            monsterInstanceId: monster.id,
            targetId,
          }
        : ring
          ? {
              type: "useRing",
              playerId: opponent.id,
              ringInstanceId: ring.id,
              targetId,
            }
          : { type: "endTurn", playerId: opponent.id };
    }

    if (!automaticAction) {
      break;
    }

    const applied = applyBattleAction(state, automaticAction);
    state = applied.state;
    events.push(...applied.events);
  }

  return { state, events };
}

function campaignOpponentElement(
  state: BattleState,
  opponentId: string,
  preferredElement: ElementType,
): ElementType {
  const elements: ElementType[] = [
    preferredElement,
    ...(["electric", "fire", "ice"] as ElementType[]).filter(
      (element) => element !== preferredElement,
    ),
  ];
  const previousChoices = state.actionHistory.filter(
    (action) => action.type === "chooseElement" && action.playerId === opponentId,
  ).length;
  return elements[previousChoices % elements.length]!;
}

function campaignOpponentTarget(state: BattleState, opponentId: string): TargetId {
  const defender = state.players.find((player) => player.id !== opponentId);
  if (!defender) {
    throw new Error(`Campaign opponent "${opponentId}" has no defender.`);
  }
  const tauntMonster = defender.monsters.find((monster) => monster.skill === "taunt");
  return (tauntMonster?.id ?? `${defender.id}.hero`) as TargetId;
}

function trainingOpponentElement(state: BattleState, opponentId: string): ElementType {
  const choices: ElementType[] = ["electric", "fire", "ice"];
  const previousChoices = state.actionHistory.filter(
    (action) => action.type === "chooseElement" && action.playerId === opponentId,
  ).length;
  return choices[previousChoices % choices.length]!;
}

function liveBattleOutcome(state: BattleState): BattleOutcome | "pending" {
  if (!state.result) {
    return "pending";
  }
  if (state.result.type === "draw") {
    return "draw";
  }
  return state.result.winnerId === currentPlayerId() ? "win" : "loss";
}

function privateBattleOutcome(
  record: { result: string; winnerPlayerId: string | null },
  playerId: string,
): BattleOutcome {
  if (record.result === "draw") {
    return "draw";
  }
  return record.winnerPlayerId === playerId ? "win" : "loss";
}

function privateMatchCode(): string {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const bytes = randomBytes(6);
  return `BN-${Array.from(bytes, (byte) => alphabet[byte % alphabet.length]).join("")}`;
}

async function expirePrivateMatches(client: PrismaContext): Promise<void> {
  await client.privateMatch.updateMany({
    where: { status: "waiting", expiresAt: { lte: new Date() } },
    data: { status: "cancelled" },
  });
}

function privateTurnDeadline(playerId: string | null): Date | null {
  return playerId ? new Date(Date.now() + privateTurnDurationMs) : null;
}

async function settleExpiredPrivateBattle(client: PrismaClient, battleId: string): Promise<void> {
  const settled = await client.$transaction(async (transaction) => {
    const match = await transaction.privateMatch.findFirst({
      where: {
        battleRecordId: battleId,
        status: "active",
        turnPlayerId: { not: null },
        turnDeadlineAt: { lte: new Date() },
      },
      include: { battleRecord: true, participants: true },
    });
    if (!match?.battleRecord || !match.turnPlayerId) {
      return null;
    }

    const claimed = await transaction.privateMatch.updateMany({
      where: {
        id: match.id,
        status: "active",
        turnPlayerId: match.turnPlayerId,
        turnDeadlineAt: match.turnDeadlineAt,
      },
      data: { status: "timing_out" },
    });
    if (claimed.count !== 1) {
      return null;
    }

    const state = rebuildBattleState(
      match.battleRecord.setupJson,
      match.battleRecord.actionLogJson,
    );
    if (state.status !== "active" || state.activePlayerId !== match.turnPlayerId) {
      await transaction.privateMatch.update({
        where: { id: match.id },
        data: {
          status: state.status === "finished" ? "finished" : "active",
          turnPlayerId: state.status === "active" ? state.activePlayerId : null,
          turnDeadlineAt:
            state.status === "active" ? privateTurnDeadline(state.activePlayerId) : null,
        },
      });
      return null;
    }

    const timedOut = applyBattleAction(state, {
      type: "concede",
      playerId: match.turnPlayerId,
    }).state;
    const finishedRecord = createBattleRecord(timedOut, { rulesVersion, contentVersion });
    const winnerPlayerId = timedOut.result?.type === "winner" ? timedOut.result.winnerId : null;

    await transaction.battleRecord.update({
      where: { id: match.battleRecord.id },
      data: {
        status: "finished",
        result: timedOut.result?.type === "draw" ? "draw" : "finished",
        actionLogJson: JSON.stringify(timedOut.actionHistory),
        resultJson: JSON.stringify(finishedRecord.result),
        finalStateChecksum: finishedRecord.finalStateChecksum,
        winnerPlayerId,
        turnCount: Math.max(...timedOut.players.map((player) => player.energy.turnCount)),
      },
    });
    await transaction.privateMatch.update({
      where: { id: match.id },
      data: {
        status: "finished",
        turnPlayerId: null,
        turnDeadlineAt: null,
      },
    });
    return {
      matchId: match.id,
      playerIds: match.participants.map((participant) => participant.playerId),
    };
  });

  if (settled) {
    publishGameRealtimeEvent(settled.playerIds, {
      type: "battleChanged",
      battleId,
      reason: "timeout",
    });
    publishGameRealtimeEvent(settled.playerIds, {
      type: "privateMatchChanged",
      matchId: settled.matchId,
      reason: "finished",
    });
  }
}

async function settleCampaignOutcome(
  transaction: Prisma.TransactionClient,
  opponent: CampaignOpponent,
  outcome: BattleOutcome,
): Promise<CampaignReward> {
  if (outcome !== "win") {
    return { credits: 0, heroExperience: 0, materials: [] };
  }

  const progress = await transaction.campaignProgress.findUnique({
    where: {
      playerId_opponentId: {
        playerId: currentPlayerId(),
        opponentId: opponent.id,
      },
    },
  });
  const firstClear = !progress || progress.victoryCount === 0;
  const now = new Date();

  await transaction.campaignProgress.upsert({
    where: {
      playerId_opponentId: {
        playerId: currentPlayerId(),
        opponentId: opponent.id,
      },
    },
    create: {
      playerId: currentPlayerId(),
      opponentId: opponent.id,
      contentVersion,
      victoryCount: 1,
      firstClearedAt: now,
      lastVictoryAt: now,
    },
    update: {
      contentVersion,
      victoryCount: { increment: 1 },
      lastVictoryAt: now,
      ...(firstClear ? { firstClearedAt: now } : {}),
    },
  });

  return firstClear ? opponent.firstClearReward : opponent.repeatVictoryReward;
}

function assertLiveBattleActionCommand(
  command: LiveBattleActionCommand,
): asserts command is LiveBattleActionCommand {
  if (!command || typeof command !== "object") {
    throw new Error("A battle action is required.");
  }

  switch (command.type) {
    case "chooseElement":
      if (!(["electric", "fire", "ice"] as unknown[]).includes(command.element)) {
        throw new Error("A valid element choice is required.");
      }
      return;
    case "useRing":
      assertNonEmptyId(command.ringInstanceId, "ringInstanceId");
      assertNonEmptyId(command.targetId, "targetId");
      if (
        command.enchantmentTargets !== undefined &&
        (typeof command.enchantmentTargets !== "object" ||
          command.enchantmentTargets === null ||
          Array.isArray(command.enchantmentTargets) ||
          !Object.values(command.enchantmentTargets).every(
            (targetId) => typeof targetId === "string" && targetId.length > 0,
          ))
      ) {
        throw new Error("enchantmentTargets must contain valid target IDs.");
      }
      return;
    case "useMonster":
      assertNonEmptyId(command.monsterInstanceId, "monsterInstanceId");
      assertNonEmptyId(command.targetId, "targetId");
      return;
    case "endTurn":
    case "concede":
      return;
    default:
      throw new Error("Unsupported battle action.");
  }
}

function assertNonEmptyId(value: string, field: string): void {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new Error(`${field} is required.`);
  }
}

function toLiveBattlePlayerView(player: BattleState["players"][number], revealRings: boolean) {
  const common = {
    id: player.id,
    username: player.username,
    level: player.level,
    hero: player.hero,
    energy: player.energy,
    heroTargetId: `${player.id}.hero`,
    ringCount: player.rings.length,
    monsters: player.monsters.map((monster) => ({
      id: monster.id,
      definitionId: monster.definitionId,
      label: label(monster.nameKey),
      element: monster.element,
      rarity: monster.rarity,
      health: monster.health,
      maxHealth: monster.maxHealth,
      damage: monster.damage,
      cooldown: monster.cooldown,
      currentCooldown: monster.currentCooldown,
      skill: monster.skill ?? null,
      shieldActive: monster.shieldActive,
      rageActive: monster.rageActive,
    })),
  };

  if (!revealRings) {
    return common;
  }

  return {
    ...common,
    rings: player.rings.map((ring) => ({
      id: ring.id,
      definitionId: ring.definitionId,
      label: label(ring.nameKey),
      element: ring.element,
      rarity: ring.rarity,
      damage: ring.damage,
      energyCost: ring.energyCost,
      cooldown: ring.cooldown,
      currentCooldown: ring.currentCooldown,
      speed: ring.speed,
      gems: ring.gems.map((gem) => ({
        id: gem.id,
        definitionId: gem.definitionId,
        label: label(gem.nameKey),
        element: gem.element,
        rarity: gem.rarity,
        damage: gem.damage,
        enchantmentType: gem.enchantment?.type ?? null,
      })),
    })),
  };
}

function toBattleRewardView(reward: RewardGrantViewSource | null) {
  if (!reward) {
    return null;
  }

  return {
    id: reward.id,
    contentVersion: reward.contentVersion ?? legacyContentVersion,
    status: reward.status as "unclaimed" | "claimed",
    credits: reward.credits,
    heroExperience: reward.heroExperience,
    claimedAt: reward.claimedAt?.toISOString() ?? null,
    materials: reward.materials.map((material) => {
      const definition = getMaterialDefinition(material.materialId);
      return {
        materialId: material.materialId,
        label: label(definition.nameKey),
        quantity: material.quantity,
      };
    }),
    items: reward.items.map((itemReward) => {
      const definition = getCraftableDefinition(
        itemReward.inventoryItem.type as CraftableItemType,
        itemReward.inventoryItem.definitionId,
      );
      return {
        inventoryItemId: itemReward.inventoryItemId,
        definitionId: itemReward.inventoryItem.definitionId,
        type: itemReward.inventoryItem.type,
        label: label(definition.nameKey),
        experience: itemReward.experience,
      };
    }),
  };
}

function liveBattleItemExperience(state: BattleState): {
  inventoryItemId: string;
  experience: number;
}[] {
  const viewer = state.initialSetup.players.find((player) => player.id === currentPlayerId());
  if (!viewer) {
    return [];
  }

  const experienceByItemId = new Map<string, number>();
  const ringById = new Map(viewer.rings.map((ring) => [ring.id, ring]));
  const gemById = new Map(
    viewer.rings.flatMap((ring) => ring.gems.map((gem) => [gem.id, gem] as const)),
  );
  const summonedMonsterSources = new Map<string, string>();
  let pendingMonsterSources: { definitionId: string; inventoryItemId: string }[] = [];

  const addExperience = (inventoryItemId: string | undefined, amount: number) => {
    if (!inventoryItemId) {
      return;
    }
    experienceByItemId.set(
      inventoryItemId,
      (experienceByItemId.get(inventoryItemId) ?? 0) + amount,
    );
  };

  for (const ring of viewer.rings) {
    addExperience(ring.id, participationItemExperience);
    for (const gem of ring.gems) {
      addExperience(gem.id, participationItemExperience);
      addExperience(gem.enchantment?.resolvedDefinitionId, participationItemExperience);
    }
  }

  for (const event of state.log) {
    if (event.type === "ringUsed" && event.playerId === currentPlayerId()) {
      const ring = ringById.get(event.ringInstanceId);
      if (!ring) {
        continue;
      }

      addExperience(ring.id, usedItemExperience);
      pendingMonsterSources = [];
      for (const gem of ring.gems) {
        addExperience(gem.id, usedItemExperience);
        if (gem.enchantment?.type === "monster" && gem.enchantment.resolvedDefinitionId) {
          pendingMonsterSources.push({
            definitionId: gem.enchantment.monsterId,
            inventoryItemId: gem.enchantment.resolvedDefinitionId,
          });
        }
      }
      continue;
    }

    if (event.type === "spellCast") {
      const enchantment = gemById.get(event.sourceGemId)?.enchantment;
      if (enchantment?.type === "spell") {
        addExperience(enchantment.resolvedDefinitionId, usedItemExperience);
      }
      continue;
    }

    if (event.type === "monsterSummoned" && event.playerId === currentPlayerId()) {
      const sourceIndex = pendingMonsterSources.findIndex(
        (source) => source.definitionId === event.monsterId,
      );
      const source = pendingMonsterSources[sourceIndex];
      if (source) {
        pendingMonsterSources.splice(sourceIndex, 1);
        summonedMonsterSources.set(event.monsterInstanceId, source.inventoryItemId);
        addExperience(source.inventoryItemId, usedItemExperience);
      }
      continue;
    }

    if (event.type === "monsterUsed" && event.playerId === currentPlayerId()) {
      addExperience(summonedMonsterSources.get(event.monsterInstanceId), usedItemExperience);
    }
  }

  return [...experienceByItemId.entries()]
    .map(([inventoryItemId, experience]) => ({ inventoryItemId, experience }))
    .sort((left, right) => left.inventoryItemId.localeCompare(right.inventoryItemId));
}

type BattleSummaryActivity = {
  id: string;
  label: string;
  playerId: string;
  count: number;
};

function battleResultSummary(state: BattleState) {
  if (state.status !== "finished" || !state.result) {
    return null;
  }

  const damageByPlayerId = new Map(state.players.map((player) => [player.id, 0]));
  const actionCountByPlayerId = new Map(state.players.map((player) => [player.id, 0]));
  const ringById = new Map(
    state.initialSetup.players.flatMap((player) =>
      player.rings.map((ring) => [ring.id, { playerId: player.id, ring }] as const),
    ),
  );
  const monsterDefinitionByInstanceId = new Map<string, string>();
  const monsterOwnerByInstanceId = new Map<string, string>();
  const ringsUsed = new Map<string, BattleSummaryActivity>();
  const spellsCast = new Map<string, BattleSummaryActivity>();
  const monstersSummoned = new Map<string, BattleSummaryActivity>();
  const monstersUsed = new Map<string, BattleSummaryActivity>();
  let activeDamageOwnerId: string | undefined;

  for (const player of state.initialSetup.players) {
    for (const monster of player.monsters) {
      monsterDefinitionByInstanceId.set(monster.id, monster.definitionId);
      monsterOwnerByInstanceId.set(monster.id, player.id);
    }
  }

  for (const action of state.actionHistory) {
    actionCountByPlayerId.set(
      action.playerId,
      (actionCountByPlayerId.get(action.playerId) ?? 0) + 1,
    );
  }

  for (const event of state.log) {
    switch (event.type) {
      case "ringUsed": {
        activeDamageOwnerId = event.playerId;
        const source = ringById.get(event.ringInstanceId);
        incrementBattleSummaryActivity(
          ringsUsed,
          event.ringInstanceId,
          source ? label(source.ring.nameKey) : event.ringInstanceId,
          event.playerId,
        );
        break;
      }
      case "spellCast": {
        const definition = state.definitions.spells[event.spellId];
        incrementBattleSummaryActivity(
          spellsCast,
          event.spellId,
          definition ? label(definition.nameKey) : event.spellId,
          activeDamageOwnerId ?? "unknown",
        );
        break;
      }
      case "monsterSummoned": {
        monsterDefinitionByInstanceId.set(event.monsterInstanceId, event.monsterId);
        monsterOwnerByInstanceId.set(event.monsterInstanceId, event.playerId);
        const definition = state.definitions.monsters[event.monsterId];
        incrementBattleSummaryActivity(
          monstersSummoned,
          event.monsterId,
          definition ? label(definition.nameKey) : event.monsterId,
          event.playerId,
        );
        break;
      }
      case "monsterUsed": {
        activeDamageOwnerId = event.playerId;
        const definitionId = monsterDefinitionByInstanceId.get(event.monsterInstanceId);
        const definition = definitionId ? state.definitions.monsters[definitionId] : undefined;
        incrementBattleSummaryActivity(
          monstersUsed,
          definitionId ?? event.monsterInstanceId,
          definition ? label(definition.nameKey) : (definitionId ?? event.monsterInstanceId),
          event.playerId,
        );
        break;
      }
      case "damageDealt": {
        const ownerId =
          ringById.get(event.sourceId)?.playerId ??
          monsterOwnerByInstanceId.get(event.sourceId) ??
          activeDamageOwnerId;
        if (ownerId && damageByPlayerId.has(ownerId)) {
          damageByPlayerId.set(ownerId, (damageByPlayerId.get(ownerId) ?? 0) + event.amount);
        }
        break;
      }
      default:
        break;
    }
  }

  return {
    turnCount: Math.max(...state.players.map((player) => player.energy.turnCount)),
    actionCount: state.actionHistory.length,
    players: state.players.map((player) => ({
      playerId: player.id,
      username: player.username,
      damage: damageByPlayerId.get(player.id) ?? 0,
      actionCount: actionCountByPlayerId.get(player.id) ?? 0,
    })),
    ringsUsed: [...ringsUsed.values()],
    spellsCast: [...spellsCast.values()],
    monstersSummoned: [...monstersSummoned.values()],
    monstersUsed: [...monstersUsed.values()],
  };
}

function incrementBattleSummaryActivity(
  entries: Map<string, BattleSummaryActivity>,
  id: string,
  activityLabel: string,
  playerId: string,
): void {
  const key = `${playerId}:${id}`;
  const existing = entries.get(key);
  entries.set(key, {
    id,
    label: activityLabel,
    playerId,
    count: (existing?.count ?? 0) + 1,
  });
}

function developmentBattleRecord(outcome: Exclude<BattleOutcome, "draw">): BattleRecord {
  const setup = createBattleSetupFromFixture("basicDuel");
  const initialState = createBattleState(setup);
  const [playerOne, playerTwo] = initialState.players;
  const concedingPlayerId = outcome === "win" ? playerTwo.id : playerOne.id;
  const finishedState = applyBattleAction(initialState, {
    type: "concede",
    playerId: concedingPlayerId,
  }).state;

  return createBattleRecord(finishedState, { rulesVersion, contentVersion });
}

function battleRewardDefinition(outcome: BattleOutcome) {
  if (outcome === "win") {
    return {
      credits: 150,
      heroExperience: 100,
      materials: ["aluminium", "hydrogen", "pearl", "sand"].map((materialId) => ({
        materialId,
        quantity: 1,
      })),
    };
  }

  if (outcome === "draw") {
    return {
      credits: 90,
      heroExperience: 60,
      materials: ["aluminium", "pearl"].map((materialId) => ({
        materialId,
        quantity: 1,
      })),
    };
  }

  return {
    credits: 30,
    heroExperience: 25,
    materials: [],
  };
}

function developmentRewardItemIds(input: {
  loadoutRingIds: readonly string[];
  ringSockets: readonly RingSocketRow[];
  gemEnchantments: readonly GemEnchantmentRow[];
  inventoryItems: readonly InventoryItem[];
}): string[] {
  const inventoryById = new Map(input.inventoryItems.map((item) => [item.id, item]));
  const rewardedIds = new Set(
    input.loadoutRingIds.filter((ringId) => inventoryById.get(ringId)?.type === "ring"),
  );
  const gemIds = input.ringSockets
    .filter((socket) => rewardedIds.has(socket.ringItemId))
    .map((socket) => socket.gemItemId)
    .filter((gemId) => inventoryById.get(gemId)?.type === "gem");

  for (const gemId of gemIds) {
    rewardedIds.add(gemId);
  }

  for (const enchantment of input.gemEnchantments) {
    if (rewardedIds.has(enchantment.gemItemId) && inventoryById.has(enchantment.targetItemId)) {
      rewardedIds.add(enchantment.targetItemId);
    }
  }

  return [...rewardedIds].sort((left, right) => left.localeCompare(right));
}

function jsonArrayLength(value: string): number {
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed.length : 0;
  } catch {
    return 0;
  }
}

function materialSellPrice(material: MaterialDefinition): number {
  return Math.floor(materialBuyPrice(material) * 0.5);
}

function assertMarketQuantity(quantity: number): void {
  if (!Number.isInteger(quantity) || quantity < 1 || quantity > 999) {
    throw new Error("quantity must be an integer between 1 and 999.");
  }
}

function assertMarketRequestId(requestId: string): void {
  if (!requestId.trim() || requestId.length > 100) {
    throw new Error("requestId must contain between 1 and 100 characters.");
  }
}

function assertMatchingMarketTransaction(
  transaction: {
    playerId: string;
    action: string;
    resourceType: string;
    resourceId: string;
    quantity: number;
    unitPrice: number;
  },
  expected: {
    action: "buy" | "sell";
    materialId: string;
    quantity: number;
    unitPrice: number;
  },
): void {
  const matches =
    transaction.playerId === currentPlayerId() &&
    transaction.action === expected.action &&
    transaction.resourceType === "material" &&
    transaction.resourceId === expected.materialId &&
    transaction.quantity === expected.quantity &&
    transaction.unitPrice === expected.unitPrice;

  if (!matches) {
    throw new Error("requestId was already used for a different market transaction.");
  }
}

function parseJsonStringArray(value: string): string[] {
  try {
    const parsed = JSON.parse(value);

    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed.filter((item): item is string => typeof item === "string");
  } catch {
    return [];
  }
}

function capitalize(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function label(key: string): string {
  return (locales.en as Record<string, string>)[key] ?? key;
}

function requiredContentDefinition<T extends { id: string }>(
  values: ReadonlyMap<string, T>,
  id: string,
  kind: string,
): T {
  const value = values.get(id);
  if (!value) {
    throw new Error(`Validated campaign content references unknown ${kind} "${id}".`);
  }
  return value;
}
