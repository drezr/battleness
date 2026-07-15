import { createHash } from "node:crypto";
import { Prisma, type PrismaClient } from "@prisma/client";
import { contentVersion, definitions, levelFromExperience, locales } from "@battleness/content";
import { seedDevelopmentPlayer, usePrisma } from "./gameState";
import { assertValidPlayerGameState } from "./gameStateValidation";
import { currentPlayerId } from "./playerContext";

const resourceTypes = ["ring", "gem", "monster", "spell", "material"] as const;
const itemTypes = ["ring", "gem", "monster", "spell"] as const;
const rarities = ["common", "refined", "rare", "epic"] as const;
const elements = ["electric", "fire", "ice"] as const;
const sorts = ["newest", "priceAsc", "priceDesc", "levelDesc", "qualityDesc"] as const;
const historyRoles = ["all", "buyer", "seller"] as const;
const maxActiveListings = 20;
const transactionOptions = {
  isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
  maxWait: 5_000,
  timeout: 30_000,
} as const;

const createItemInclude = Prisma.validator<Prisma.InventoryItemInclude>()({
  marketEscrow: true,
  equippedRing: true,
  loadoutRings: true,
  socketedAsGem: true,
  enchantedByGem: true,
  gemEnchantment: true,
  sockets: {
    include: {
      gemItem: {
        include: {
          marketEscrow: true,
          gemEnchantment: {
            include: { targetItem: { include: { marketEscrow: true } } },
          },
        },
      },
    },
  },
});

type ResourceType = (typeof resourceTypes)[number];
type ItemType = (typeof itemTypes)[number];
type Rarity = (typeof rarities)[number];
type Element = (typeof elements)[number];
type Sort = (typeof sorts)[number];
type CreateOptionItem = Prisma.InventoryItemGetPayload<{ include: typeof createItemInclude }>;

export type PlayerMarketBrowseInput = {
  resourceType?: string;
  definitionId?: string;
  rarity?: string;
  element?: string;
  minLevel?: string;
  maxLevel?: string;
  minQuality?: string;
  maxQuality?: string;
  minPrice?: string;
  maxPrice?: string;
  sort?: string;
  page?: string;
  pageSize?: string;
};

export type PlayerMarketCreateInput = {
  inventoryItemId?: string;
  materialId?: string;
  quantity?: number;
  price?: number;
  requestId?: string;
};

export type PlayerMarketCancelInput = {
  listingId?: string;
  requestId?: string;
};

export type PlayerMarketPurchaseInput = {
  listingId?: string;
  requestId?: string;
};

export type PlayerMarketHistoryInput = {
  role?: string;
  page?: string;
  pageSize?: string;
};

type NormalizedBrowseInput = {
  resourceType?: ResourceType;
  definitionId?: string;
  rarity?: Rarity;
  element?: Element;
  minLevel?: number;
  maxLevel?: number;
  minQuality?: number;
  maxQuality?: number;
  minPrice?: number;
  maxPrice?: number;
  sort: Sort;
  page: number;
  pageSize: number;
};

type NormalizedCreateInput = {
  inventoryItemId?: string;
  materialId?: string;
  quantity: number;
  price: number;
  requestId: string;
};

export async function getPlayerMarketListings(input: PlayerMarketBrowseInput) {
  const filters = normalizeBrowseInput(input);
  const prisma = usePrisma();
  const where: Prisma.PlayerMarketListingWhereInput = {
    status: "active",
    ...(filters.resourceType ? { resourceType: filters.resourceType } : {}),
    ...(filters.definitionId ? { definitionId: filters.definitionId } : {}),
    ...(filters.rarity ? { rarity: filters.rarity } : {}),
    ...(filters.element ? { element: filters.element } : {}),
    ...(filters.minLevel !== undefined || filters.maxLevel !== undefined
      ? { level: { gte: filters.minLevel, lte: filters.maxLevel } }
      : {}),
    ...(filters.minQuality !== undefined || filters.maxQuality !== undefined
      ? { quality: { gte: filters.minQuality, lte: filters.maxQuality } }
      : {}),
    ...(filters.minPrice !== undefined || filters.maxPrice !== undefined
      ? { price: { gte: filters.minPrice, lte: filters.maxPrice } }
      : {}),
  };
  const orderBy = listingOrder(filters.sort);
  const [total, listings, createOptions] = await Promise.all([
    prisma.playerMarketListing.count({ where }),
    prisma.playerMarketListing.findMany({
      where,
      orderBy,
      skip: (filters.page - 1) * filters.pageSize,
      take: filters.pageSize,
      select: {
        id: true,
        sellerId: true,
        resourceType: true,
        definitionId: true,
        rarity: true,
        element: true,
        level: true,
        quality: true,
        quantity: true,
        price: true,
        contentVersion: true,
        createdAt: true,
        _count: { select: { escrowItems: true } },
      },
    }),
    getCreateOptions(prisma),
  ]);

  return {
    createOptions,
    filters: {
      resourceTypes: [...resourceTypes],
      rarities: [...rarities],
      elements: [...elements],
      sorts: [...sorts],
      definitions: resourceTypes.flatMap((resourceType) =>
        definitionCollection(resourceType).map((definition) => ({
          resourceType,
          definitionId: definition.id,
          nameKey: definition.nameKey,
          label: (locales.en as Record<string, string>)[definition.nameKey] ?? definition.id,
        })),
      ),
    },
    pagination: {
      page: filters.page,
      pageSize: filters.pageSize,
      total,
      totalPages: Math.max(1, Math.ceil(total / filters.pageSize)),
    },
    listings: listings.map((listing) => {
      const text = listingDefinitionText(listing.resourceType, listing.definitionId);
      return {
        id: listing.id,
        resourceType: listing.resourceType,
        definitionId: listing.definitionId,
        nameKey: text.nameKey,
        label: text.label,
        rarity: listing.rarity,
        element: listing.element,
        level: listing.level,
        quality: listing.quality,
        quantity: listing.quantity,
        price: listing.price,
        contentVersion: listing.contentVersion,
        createdAt: listing.createdAt.toISOString(),
        bundleItemCount: listing._count.escrowItems,
        isOwnListing: listing.sellerId === currentPlayerId(),
      };
    }),
  };
}

export async function getPlayerMarketHistory(input: PlayerMarketHistoryInput) {
  const role = optionalEnum(input.role, historyRoles, "role") ?? "all";
  const page = optionalInteger(input.page, "page", 1, 10_000) ?? 1;
  const pageSize = optionalInteger(input.pageSize, "pageSize", 1, 48) ?? 24;
  const prisma = usePrisma();
  const playerId = currentPlayerId();
  const participantWhere =
    role === "buyer"
      ? { buyerId: playerId }
      : role === "seller"
        ? { sellerId: playerId }
        : { OR: [{ buyerId: playerId }, { sellerId: playerId }] };
  const where: Prisma.PlayerMarketListingWhereInput = {
    status: "sold",
    soldAt: { not: null },
    ...participantWhere,
  };
  const [total, listings] = await Promise.all([
    prisma.playerMarketListing.count({ where }),
    prisma.playerMarketListing.findMany({
      where,
      orderBy: [{ soldAt: "desc" }, { id: "desc" }],
      skip: (page - 1) * pageSize,
      take: pageSize,
      select: {
        id: true,
        sellerId: true,
        buyerId: true,
        resourceType: true,
        definitionId: true,
        rarity: true,
        element: true,
        level: true,
        quality: true,
        quantity: true,
        price: true,
        itemSnapshotJson: true,
        contentVersion: true,
        createdAt: true,
        soldAt: true,
      },
    }),
  ]);

  return {
    filter: { role },
    pagination: {
      page,
      pageSize,
      total,
      totalPages: Math.max(1, Math.ceil(total / pageSize)),
    },
    transactions: listings.map((listing) => {
      const text = listingDefinitionText(listing.resourceType, listing.definitionId);
      return {
        id: listing.id,
        direction: listing.buyerId === playerId ? "purchase" : "sale",
        resourceType: listing.resourceType,
        definitionId: listing.definitionId,
        nameKey: text.nameKey,
        label: text.label,
        rarity: listing.rarity,
        element: listing.element,
        level: listing.level,
        quality: listing.quality,
        quantity: listing.quantity,
        price: listing.price,
        contentVersion: listing.contentVersion,
        listedAt: listing.createdAt.toISOString(),
        soldAt: listing.soldAt!.toISOString(),
        bundleItemCount: snapshotItemCount(listing.itemSnapshotJson),
      };
    }),
  };
}

export async function createPlayerMarketListing(input: PlayerMarketCreateInput) {
  const normalized = normalizeCreateInput(input);
  const payloadHash = createHash("sha256").update(JSON.stringify(normalized)).digest("hex");
  const prisma = usePrisma();

  await seedDevelopmentPlayer(prisma);

  const listing = await runMarketTransaction(prisma, async (transaction) => {
    const existing = await transaction.playerMarketMutation.findUnique({
      where: { requestId: normalized.requestId },
      include: { listing: true },
    });
    if (existing) {
      assertMatchingCreateMutation(existing, payloadHash);
      return existing.listing;
    }

    const activeListingCount = await transaction.playerMarketListing.count({
      where: { sellerId: currentPlayerId(), status: "active" },
    });
    if (activeListingCount >= maxActiveListings) {
      throw new Error(`A player can have at most ${maxActiveListings} active listings.`);
    }

    if (normalized.materialId) {
      return createMaterialListing(transaction, normalized, payloadHash);
    }
    return createItemListing(transaction, normalized, payloadHash);
  });

  return { listingId: listing.id };
}

export async function cancelPlayerMarketListing(input: PlayerMarketCancelInput) {
  const listingId = optionalSafeId(input.listingId, "listingId");
  if (!listingId) throw new Error("listingId is required.");
  const requestId = requiredRequestId(input.requestId);
  const normalized = { listingId, requestId };
  const payloadHash = createHash("sha256").update(JSON.stringify(normalized)).digest("hex");
  const prisma = usePrisma();

  await seedDevelopmentPlayer(prisma);

  const listing = await runMarketTransaction(prisma, async (transaction) => {
    const existing = await transaction.playerMarketMutation.findUnique({
      where: { requestId },
      include: { listing: true },
    });
    if (existing) {
      assertMatchingMutation(existing, "cancel", payloadHash);
      return existing.listing;
    }

    const current = await transaction.playerMarketListing.findFirst({
      where: { id: listingId, sellerId: currentPlayerId() },
    });
    if (!current) {
      throw new Error(`Listing "${listingId}" is not available for this player.`);
    }

    const claim = await transaction.playerMarketListing.updateMany({
      where: { id: listingId, sellerId: currentPlayerId(), status: "active" },
      data: { status: "cancelled", cancelledAt: new Date() },
    });
    if (claim.count !== 1) {
      throw new Error(`Listing "${listingId}" is no longer active.`);
    }

    if (current.resourceType === "material") {
      await transaction.materialStock.upsert({
        where: {
          playerId_materialId: {
            playerId: currentPlayerId(),
            materialId: current.definitionId,
          },
        },
        create: {
          playerId: currentPlayerId(),
          materialId: current.definitionId,
          quantity: current.quantity,
          contentVersion: current.contentVersion,
        },
        update: {
          quantity: { increment: current.quantity },
          contentVersion: current.contentVersion,
        },
      });
    } else {
      await transaction.playerMarketEscrowItem.deleteMany({ where: { listingId } });
    }

    await transaction.playerMarketMutation.create({
      data: {
        requestId,
        playerId: currentPlayerId(),
        listingId,
        action: "cancel",
        payloadHash,
      },
    });

    return transaction.playerMarketListing.findUniqueOrThrow({ where: { id: listingId } });
  });

  return { listingId: listing.id, status: listing.status };
}

export async function purchasePlayerMarketListing(input: PlayerMarketPurchaseInput) {
  const listingId = optionalSafeId(input.listingId, "listingId");
  if (!listingId) throw new Error("listingId is required.");
  const requestId = requiredRequestId(input.requestId);
  const normalized = { listingId, requestId };
  const payloadHash = createHash("sha256").update(JSON.stringify(normalized)).digest("hex");
  const prisma = usePrisma();

  await seedDevelopmentPlayer(prisma);

  const listing = await runMarketTransaction(prisma, async (transaction) => {
    const existing = await transaction.playerMarketMutation.findUnique({
      where: { requestId },
      include: { listing: true },
    });
    if (existing) {
      assertMatchingMutation(existing, "purchase", payloadHash);
      return existing.listing;
    }

    const current = await transaction.playerMarketListing.findUnique({
      where: { id: listingId },
      include: { escrowItems: true },
    });
    if (!current || current.status !== "active") {
      throw new Error(`Listing "${listingId}" is no longer available.`);
    }
    if (current.sellerId === currentPlayerId()) {
      throw new Error("Players cannot purchase their own listings.");
    }

    const claim = await transaction.playerMarketListing.updateMany({
      where: { id: listingId, status: "active", buyerId: null },
      data: { status: "sold", buyerId: currentPlayerId(), soldAt: new Date() },
    });
    if (claim.count !== 1) {
      throw new Error(`Listing "${listingId}" is no longer available.`);
    }

    const payment = await transaction.player.updateMany({
      where: { id: currentPlayerId(), credits: { gte: current.price } },
      data: { credits: { decrement: current.price } },
    });
    if (payment.count !== 1) throw new Error("Not enough credits.");
    await transaction.player.update({
      where: { id: current.sellerId },
      data: { credits: { increment: current.price } },
    });

    if (current.resourceType === "material") {
      await transaction.materialStock.upsert({
        where: {
          playerId_materialId: {
            playerId: currentPlayerId(),
            materialId: current.definitionId,
          },
        },
        create: {
          playerId: currentPlayerId(),
          materialId: current.definitionId,
          quantity: current.quantity,
          contentVersion: current.contentVersion,
        },
        update: {
          quantity: { increment: current.quantity },
          contentVersion: current.contentVersion,
        },
      });
    } else {
      await transferEscrowedItems(transaction, current);
    }

    await transaction.playerMarketMutation.create({
      data: {
        requestId,
        playerId: currentPlayerId(),
        listingId,
        action: "purchase",
        payloadHash,
      },
    });
    await assertValidPlayerGameState(transaction, current.sellerId);
    await assertValidPlayerGameState(transaction, currentPlayerId());

    return transaction.playerMarketListing.findUniqueOrThrow({ where: { id: listingId } });
  });

  return { listingId: listing.id, status: listing.status };
}

async function transferEscrowedItems(
  transaction: Prisma.TransactionClient,
  listing: {
    id: string;
    sellerId: string;
    escrowItems: readonly { inventoryItemId: string }[];
  },
) {
  const itemIds = listing.escrowItems.map((entry) => entry.inventoryItemId);
  if (itemIds.length === 0) {
    throw new Error(`Listing "${listing.id}" has no escrowed items.`);
  }

  const transfer = await transaction.inventoryItem.updateMany({
    where: { id: { in: itemIds }, playerId: listing.sellerId },
    data: { playerId: currentPlayerId(), equipped: false },
  });
  if (transfer.count !== itemIds.length) {
    throw new Error(`Listing "${listing.id}" has an invalid escrow bundle.`);
  }

  await transaction.ringSocket.updateMany({
    where: {
      playerId: listing.sellerId,
      OR: [{ ringItemId: { in: itemIds } }, { gemItemId: { in: itemIds } }],
    },
    data: { playerId: currentPlayerId() },
  });
  await transaction.gemEnchantment.updateMany({
    where: {
      playerId: listing.sellerId,
      OR: [{ gemItemId: { in: itemIds } }, { targetItemId: { in: itemIds } }],
    },
    data: { playerId: currentPlayerId() },
  });
  await transaction.playerMarketEscrowItem.deleteMany({ where: { listingId: listing.id } });
}

async function createMaterialListing(
  transaction: Prisma.TransactionClient,
  input: NormalizedCreateInput & { materialId?: string },
  payloadHash: string,
) {
  const materialId = input.materialId;
  if (!materialId) throw new Error("materialId is required.");
  const definition = listingDefinition("material", materialId);
  const stockUpdate = await transaction.materialStock.updateMany({
    where: {
      playerId: currentPlayerId(),
      materialId,
      quantity: { gte: input.quantity },
    },
    data: { quantity: { decrement: input.quantity }, contentVersion },
  });
  if (stockUpdate.count !== 1) {
    throw new Error("Not enough material stock.");
  }

  return transaction.playerMarketListing.create({
    data: {
      sellerId: currentPlayerId(),
      resourceType: "material",
      definitionId: materialId,
      rarity: definition.rarity,
      quantity: input.quantity,
      price: input.price,
      contentVersion,
      mutations: {
        create: {
          requestId: input.requestId,
          playerId: currentPlayerId(),
          action: "create",
          payloadHash,
        },
      },
    },
  });
}

async function createItemListing(
  transaction: Prisma.TransactionClient,
  input: NormalizedCreateInput,
  payloadHash: string,
) {
  const inventoryItemId = input.inventoryItemId;
  if (!inventoryItemId) throw new Error("inventoryItemId is required.");
  const item = await transaction.inventoryItem.findFirst({
    where: { id: inventoryItemId, playerId: currentPlayerId() },
    include: createItemInclude,
  });
  if (!item || !isEligibleCreateItem(item)) {
    throw new Error(`Inventory item "${inventoryItemId}" is not eligible for listing.`);
  }
  if (!itemTypes.includes(item.type as ItemType)) {
    throw new Error(`Inventory item "${inventoryItemId}" has an unsupported type.`);
  }

  const definition = listingDefinition(item.type as ItemType, item.definitionId);
  const bundle = item.type === "ring" ? ringBundle(item) : standaloneBundle(item);

  return transaction.playerMarketListing.create({
    data: {
      sellerId: currentPlayerId(),
      resourceType: item.type,
      definitionId: item.definitionId,
      rarity: definition.rarity,
      element: definition.element,
      level: levelFromExperience(item.experience),
      quality: item.quality,
      quantity: 1,
      price: input.price,
      rootItemId: item.id,
      itemSnapshotJson: JSON.stringify(bundle.snapshot),
      contentVersion: item.contentVersion ?? contentVersion,
      escrowItems: { create: bundle.escrowItems },
      mutations: {
        create: {
          requestId: input.requestId,
          playerId: currentPlayerId(),
          action: "create",
          payloadHash,
        },
      },
    },
  });
}

async function getCreateOptions(prisma: PrismaClient) {
  const [activeListingCount, items, materialStock] = await Promise.all([
    prisma.playerMarketListing.count({
      where: { sellerId: currentPlayerId(), status: "active" },
    }),
    prisma.inventoryItem.findMany({
      where: { playerId: currentPlayerId(), marketEscrow: null },
      include: createItemInclude,
      orderBy: { createdAt: "desc" },
    }),
    prisma.materialStock.findMany({
      where: { playerId: currentPlayerId(), quantity: { gt: 0 } },
    }),
  ]);

  return {
    activeListingCount,
    maxActiveListings,
    items: items.filter(isEligibleCreateItem).map((item) => {
      const definition = listingDefinition(item.type as ItemType, item.definitionId);
      return {
        inventoryItemId: item.id,
        resourceType: item.type,
        definitionId: item.definitionId,
        nameKey: definition.nameKey,
        label: definition.label,
        rarity: definition.rarity,
        element: definition.element,
        level: levelFromExperience(item.experience),
        quality: item.quality,
        bundleItemCount:
          item.type === "ring"
            ? 1 +
              item.sockets.length +
              item.sockets.filter((socket) => socket.gemItem.gemEnchantment).length
            : 1,
      };
    }),
    materials: materialStock.map((stock) => {
      const definition = listingDefinition("material", stock.materialId);
      return {
        materialId: stock.materialId,
        definitionId: stock.materialId,
        nameKey: definition.nameKey,
        label: definition.label,
        rarity: definition.rarity,
        quantity: stock.quantity,
      };
    }),
  };
}

function isEligibleCreateItem(item: CreateOptionItem): boolean {
  if (item.marketEscrow || !itemTypes.includes(item.type as ItemType)) return false;
  if (item.type === "ring") {
    if (item.equipped || item.equippedRing || item.loadoutRings.length > 0) return false;
    return item.sockets.every(
      (socket) =>
        !socket.gemItem.marketEscrow && !socket.gemItem.gemEnchantment?.targetItem.marketEscrow,
    );
  }
  if (item.socketedAsGem || item.enchantedByGem) return false;
  if (item.type === "gem" && item.gemEnchantment) return false;
  return true;
}

function standaloneBundle(item: CreateOptionItem) {
  return {
    escrowItems: [{ inventoryItemId: item.id, role: "root" }],
    snapshot: {
      version: 1,
      rootItemId: item.id,
      items: [itemSnapshot(item)],
      sockets: [],
      enchantments: [],
    },
  };
}

function ringBundle(item: CreateOptionItem) {
  const items = [itemSnapshot(item)];
  const escrowItems = [{ inventoryItemId: item.id, role: "root" }];
  const sockets = item.sockets.map((socket) => ({
    ringItemId: socket.ringItemId,
    gemItemId: socket.gemItemId,
    socketIndex: socket.socketIndex,
  }));
  const enchantments: { gemItemId: string; targetItemId: string; targetType: string }[] = [];

  for (const socket of item.sockets) {
    items.push(itemSnapshot(socket.gemItem));
    escrowItems.push({ inventoryItemId: socket.gemItem.id, role: "socketedGem" });
    const enchantment = socket.gemItem.gemEnchantment;
    if (!enchantment) continue;
    items.push(itemSnapshot(enchantment.targetItem));
    escrowItems.push({ inventoryItemId: enchantment.targetItem.id, role: "enchantment" });
    enchantments.push({
      gemItemId: enchantment.gemItemId,
      targetItemId: enchantment.targetItemId,
      targetType: enchantment.targetType,
    });
  }

  return {
    escrowItems,
    snapshot: { version: 1, rootItemId: item.id, items, sockets, enchantments },
  };
}

function itemSnapshot(item: {
  id: string;
  type: string;
  definitionId: string;
  contentVersion: string | null;
  experience: number;
  quality: number;
  socketCount: number | null;
}) {
  return {
    id: item.id,
    type: item.type,
    definitionId: item.definitionId,
    contentVersion: item.contentVersion,
    experience: item.experience,
    quality: item.quality,
    socketCount: item.socketCount,
  };
}

function normalizeBrowseInput(input: PlayerMarketBrowseInput): NormalizedBrowseInput {
  const normalized = {
    resourceType: optionalEnum(input.resourceType, resourceTypes, "resourceType"),
    definitionId: optionalDefinitionId(input.definitionId),
    rarity: optionalEnum(input.rarity, rarities, "rarity"),
    element: optionalEnum(input.element, elements, "element"),
    minLevel: optionalInteger(input.minLevel, "minLevel", 0, 50),
    maxLevel: optionalInteger(input.maxLevel, "maxLevel", 0, 50),
    minQuality: optionalInteger(input.minQuality, "minQuality", 0, 100),
    maxQuality: optionalInteger(input.maxQuality, "maxQuality", 0, 100),
    minPrice: optionalInteger(input.minPrice, "minPrice", 1, 2_147_483_647),
    maxPrice: optionalInteger(input.maxPrice, "maxPrice", 1, 2_147_483_647),
    sort: optionalEnum(input.sort, sorts, "sort") ?? "newest",
    page: optionalInteger(input.page, "page", 1, 10_000) ?? 1,
    pageSize: optionalInteger(input.pageSize, "pageSize", 1, 48) ?? 24,
  };

  assertRange(normalized.minLevel, normalized.maxLevel, "level");
  assertRange(normalized.minQuality, normalized.maxQuality, "quality");
  assertRange(normalized.minPrice, normalized.maxPrice, "price");
  return normalized;
}

function normalizeCreateInput(input: PlayerMarketCreateInput): NormalizedCreateInput {
  const inventoryItemId = optionalSafeId(input.inventoryItemId, "inventoryItemId");
  const materialId = optionalSafeId(input.materialId, "materialId");
  if (Boolean(inventoryItemId) === Boolean(materialId)) {
    throw new Error("Exactly one of inventoryItemId or materialId is required.");
  }
  const requestId = requiredRequestId(input.requestId);
  const price = requiredInteger(input.price, "price", 1, 2_147_483_647);
  const quantity = materialId ? requiredInteger(input.quantity, "quantity", 1, 2_147_483_647) : 1;
  if (inventoryItemId && input.quantity !== undefined && input.quantity !== 1) {
    throw new Error("Item listings must have a quantity of 1.");
  }
  return { inventoryItemId, materialId, quantity, price, requestId };
}

function optionalEnum<const T extends readonly string[]>(
  value: string | undefined,
  values: T,
  field: string,
): T[number] | undefined {
  if (value === undefined || value === "") return undefined;
  if (!(values as readonly string[]).includes(value)) {
    throw new Error(`${field} must be one of: ${values.join(", ")}.`);
  }
  return value as T[number];
}

function optionalInteger(
  value: string | undefined,
  field: string,
  minimum: number,
  maximum: number,
): number | undefined {
  if (value === undefined || value === "") return undefined;
  if (!/^\d+$/.test(value)) throw new Error(`${field} must be an integer.`);
  return requiredInteger(Number(value), field, minimum, maximum);
}

function requiredInteger(
  value: number | undefined,
  field: string,
  minimum: number,
  maximum: number,
): number {
  if (!Number.isSafeInteger(value) || value === undefined || value < minimum || value > maximum) {
    throw new Error(`${field} must be between ${minimum} and ${maximum}.`);
  }
  return value;
}

function optionalDefinitionId(value: string | undefined): string | undefined {
  return optionalSafeId(value, "definitionId");
}

function optionalSafeId(value: string | undefined, field: string): string | undefined {
  if (value === undefined || value === "") return undefined;
  const normalized = value.trim();
  if (!/^[A-Za-z0-9._-]{1,100}$/.test(normalized)) {
    throw new Error(`${field} must contain between 1 and 100 safe identifier characters.`);
  }
  return normalized;
}

function requiredRequestId(value: string | undefined): string {
  const normalized = value?.trim();
  if (!normalized || normalized.length > 100) {
    throw new Error("requestId must contain between 1 and 100 characters.");
  }
  return normalized;
}

function assertRange(minimum: number | undefined, maximum: number | undefined, field: string) {
  if (minimum !== undefined && maximum !== undefined && minimum > maximum) {
    throw new Error(`min${capitalize(field)} cannot exceed max${capitalize(field)}.`);
  }
}

function assertMatchingCreateMutation(
  mutation: { playerId: string; action: string; payloadHash: string },
  payloadHash: string,
) {
  if (
    mutation.playerId !== currentPlayerId() ||
    mutation.action !== "create" ||
    mutation.payloadHash !== payloadHash
  ) {
    throw new Error("requestId was already used for a different player-market mutation.");
  }
}

function assertMatchingMutation(
  mutation: { playerId: string; action: string; payloadHash: string },
  action: string,
  payloadHash: string,
) {
  if (
    mutation.playerId !== currentPlayerId() ||
    mutation.action !== action ||
    mutation.payloadHash !== payloadHash
  ) {
    throw new Error("requestId was already used for a different player-market mutation.");
  }
}

async function runMarketTransaction<T>(
  prisma: PrismaClient,
  operation: (transaction: Prisma.TransactionClient) => Promise<T>,
): Promise<T> {
  for (let attempt = 1; attempt <= 4; attempt += 1) {
    try {
      return await prisma.$transaction(operation, transactionOptions);
    } catch (error) {
      if (
        attempt === 4 ||
        !(error instanceof Prisma.PrismaClientKnownRequestError) ||
        error.code !== "P2034"
      ) {
        throw error;
      }
    }
  }
  throw new Error("The player-market transaction could not be completed.");
}

function listingOrder(sort: Sort): Prisma.PlayerMarketListingOrderByWithRelationInput[] {
  if (sort === "priceAsc") return [{ price: "asc" }, { createdAt: "desc" }, { id: "desc" }];
  if (sort === "priceDesc") return [{ price: "desc" }, { createdAt: "desc" }, { id: "desc" }];
  if (sort === "levelDesc") return [{ level: "desc" }, { createdAt: "desc" }, { id: "desc" }];
  if (sort === "qualityDesc") {
    return [{ quality: "desc" }, { createdAt: "desc" }, { id: "desc" }];
  }
  return [{ createdAt: "desc" }, { id: "desc" }];
}

function listingDefinitionText(resourceType: string, definitionId: string) {
  const collection = definitionCollection(resourceType);
  const definition = collection.find((candidate) => candidate.id === definitionId);
  const nameKey = definition?.nameKey ?? null;
  return {
    nameKey,
    label: nameKey
      ? ((locales.en as Record<string, string>)[nameKey] ?? definitionId)
      : definitionId,
  };
}

function snapshotItemCount(snapshotJson: string | null): number {
  if (!snapshotJson) return 0;
  try {
    const snapshot = JSON.parse(snapshotJson) as { items?: unknown };
    return Array.isArray(snapshot.items) ? snapshot.items.length : 0;
  } catch {
    return 0;
  }
}

function listingDefinition(resourceType: ResourceType, definitionId: string) {
  if (resourceType === "material") {
    const definition = definitions.materials.find((candidate) => candidate.id === definitionId);
    if (!definition) throw new Error(`Unknown material definition "${definitionId}".`);
    return {
      nameKey: definition.nameKey,
      label: (locales.en as Record<string, string>)[definition.nameKey] ?? definition.id,
      rarity: definition.rarity,
      element: null,
    };
  }
  const collections: Record<
    ItemType,
    readonly { id: string; nameKey: string; rarity: string; element: string }[]
  > = {
    ring: definitions.rings,
    gem: definitions.gems,
    monster: definitions.monsters,
    spell: definitions.spells,
  };
  const definition = collections[resourceType].find((candidate) => candidate.id === definitionId);
  if (!definition) throw new Error(`Unknown ${resourceType} definition "${definitionId}".`);
  return {
    nameKey: definition.nameKey,
    label: (locales.en as Record<string, string>)[definition.nameKey] ?? definition.id,
    rarity: definition.rarity,
    element: definition.element,
  };
}

function definitionCollection(resourceType: string): readonly { id: string; nameKey: string }[] {
  if (resourceType === "ring") return definitions.rings;
  if (resourceType === "gem") return definitions.gems;
  if (resourceType === "monster") return definitions.monsters;
  if (resourceType === "spell") return definitions.spells;
  if (resourceType === "material") return definitions.materials;
  return [];
}

function capitalize(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1);
}
