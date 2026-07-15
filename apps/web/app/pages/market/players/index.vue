<template>
  <main class="shell">
    <nav class="section-nav" :aria-label="t('accessibility.marketNavigation')">
      <NuxtLink
        v-for="link in sectionLinks.market"
        :key="link.to"
        :class="{ active: route.path === link.to }"
        :to="link.to"
      >
        {{ t(link.labelKey) }}
      </NuxtLink>
    </nav>

    <header class="view-header">
      <div class="view-title">
        <span class="eyebrow">{{ t("market.section") }}</span>
        <h1>{{ t("market.players.title") }}</h1>
        <p class="muted">{{ t("market.players.description") }}</p>
      </div>
      <p v-if="state" class="status-note">
        {{ t("market.players.listingCount", { count: state.pagination.total }) }}
      </p>
    </header>

    <section v-if="state" class="panel">
      <div class="card-heading">
        <div>
          <h2>{{ t("market.players.create.title") }}</h2>
          <p class="muted">{{ t("market.players.create.description") }}</p>
        </div>
        <span class="pill muted-pill">
          {{
            t("market.players.create.capacity", {
              count: state.createOptions.activeListingCount,
              maximum: state.createOptions.maxActiveListings,
            })
          }}
        </span>
      </div>

      <form class="filter-bar" @submit.prevent="createListing">
        <label>
          <span class="field-label">{{ t("common.type") }}</span>
          <select v-model="createKind" :disabled="creating || createLimitReached">
            <option value="item">{{ t("market.players.create.item") }}</option>
            <option value="material">{{ t("itemType.material") }}</option>
          </select>
        </label>
        <label>
          <span class="field-label">{{ t("market.players.create.resource") }}</span>
          <select v-model="createResourceId" :disabled="creating || createLimitReached" required>
            <option disabled value="">{{ t("market.players.create.choose") }}</option>
            <option v-for="option in sellableOptions" :key="option.id" :value="option.id">
              {{ option.label }}
            </option>
          </select>
        </label>
        <label v-if="createKind === 'material'">
          <span class="field-label">{{ t("itemDetail.quantity") }}</span>
          <input
            v-model.number="createQuantity"
            :disabled="creating || createLimitReached"
            :max="selectedMaterialQuantity"
            min="1"
            required
            step="1"
            type="number"
          />
        </label>
        <label>
          <span class="field-label">{{ t("market.players.create.price") }}</span>
          <input
            v-model.number="createPrice"
            :disabled="creating || createLimitReached"
            min="1"
            required
            step="1"
            type="number"
          />
        </label>
        <button
          :disabled="creating || createLimitReached || !createResourceId"
          class="primary-button"
          type="submit"
        >
          {{ creating ? t("market.players.create.creating") : t("market.players.create.submit") }}
        </button>
      </form>

      <p v-if="sellableOptions.length === 0" class="muted">
        {{ t("market.players.create.noResources") }}
      </p>
      <p v-if="createFeedback" class="status-note">{{ createFeedback }}</p>
    </section>

    <section class="panel market-browse-filters">
      <div class="filter-bar">
        <label>
          <span class="field-label">{{ t("common.type") }}</span>
          <select v-model="resourceType">
            <option value="">{{ t("common.all") }}</option>
            <option v-for="type in resourceTypes" :key="type" :value="type">
              {{ t(`itemType.${type}`) }}
            </option>
          </select>
        </label>
        <label>
          <span class="field-label">{{ t("market.players.definition") }}</span>
          <select v-model="definitionId">
            <option value="">{{ t("common.all") }}</option>
            <option
              v-for="definition in availableDefinitions"
              :key="`${definition.resourceType}:${definition.definitionId}`"
              :value="definition.definitionId"
            >
              {{ contentText(definition.nameKey, definition.label) }}
            </option>
          </select>
        </label>
        <label>
          <span class="field-label">{{ t("inventory.materials.rarity") }}</span>
          <select v-model="rarity">
            <option value="">{{ t("common.all") }}</option>
            <option v-for="value in rarities" :key="value" :value="value">
              {{ t(`rarity.${value}`) }}
            </option>
          </select>
        </label>
        <label>
          <span class="field-label">{{ t("common.element") }}</span>
          <select v-model="element">
            <option value="">{{ t("common.all") }}</option>
            <option v-for="value in elements" :key="value" :value="value">
              {{ t(`element.${value}`) }}
            </option>
          </select>
        </label>
        <label>
          <span class="field-label">{{ t("market.players.sort.label") }}</span>
          <select v-model="sort">
            <option v-for="value in sorts" :key="value" :value="value">
              {{ t(`market.players.sort.${value}`) }}
            </option>
          </select>
        </label>
        <label>
          <span class="field-label">{{ t("market.players.minLevel") }}</span>
          <input v-model="minLevel" max="50" min="0" step="1" type="number" />
        </label>
        <label>
          <span class="field-label">{{ t("market.players.maxLevel") }}</span>
          <input v-model="maxLevel" max="50" min="0" step="1" type="number" />
        </label>
        <label>
          <span class="field-label">{{ t("market.players.minQuality") }}</span>
          <input v-model="minQuality" max="100" min="0" step="1" type="number" />
        </label>
        <label>
          <span class="field-label">{{ t("market.players.maxQuality") }}</span>
          <input v-model="maxQuality" max="100" min="0" step="1" type="number" />
        </label>
        <label>
          <span class="field-label">{{ t("market.players.minPrice") }}</span>
          <input v-model="minPrice" min="1" step="1" type="number" />
        </label>
        <label>
          <span class="field-label">{{ t("market.players.maxPrice") }}</span>
          <input v-model="maxPrice" min="1" step="1" type="number" />
        </label>
      </div>
    </section>

    <p v-if="pending" class="panel">{{ t("market.players.loading") }}</p>
    <p v-else-if="error" class="panel">{{ t("market.players.loadError") }}</p>
    <p v-else-if="cancelFeedback" class="panel status-note">{{ cancelFeedback }}</p>
    <p v-else-if="purchaseFeedback" class="panel status-note">{{ purchaseFeedback }}</p>

    <template v-else-if="state">
      <section v-if="state.listings.length === 0" class="panel empty-state">
        <h2>{{ t("market.players.emptyTitle") }}</h2>
        <p class="muted">{{ t("market.players.emptyBody") }}</p>
      </section>

      <section v-else class="item-grid market-listing-grid">
        <article
          v-for="listing in state.listings"
          :key="listing.id"
          :class="['card', 'item-card', `rarity-border-${listing.rarity}`]"
        >
          <ItemArtwork :definition-id="listing.definitionId" :kind="listing.resourceType" />
          <div class="item-card-body">
            <div class="card-heading">
              <div>
                <h2>{{ listingName(listing) }}</h2>
                <small>{{ t(`itemType.${listing.resourceType}`) }}</small>
              </div>
              <span :class="['pill', `rarity-${listing.rarity}`]">
                {{ t(`rarity.${listing.rarity}`) }}
              </span>
            </div>

            <div class="control-row market-listing-badges">
              <span v-if="listing.element" :class="['pill', `element-${listing.element}`]">
                {{ t(`element.${listing.element}`) }}
              </span>
              <span v-if="listing.isOwnListing" class="pill muted-pill">
                {{ t("market.players.ownListing") }}
              </span>
            </div>

            <dl class="summary-grid item-detail-grid">
              <div class="stat">
                <dt>{{ t("common.credits") }}</dt>
                <dd>{{ formatNumber(listing.price) }}</dd>
              </div>
              <div class="stat">
                <dt>{{ t("itemDetail.quantity") }}</dt>
                <dd>{{ listing.quantity }}</dd>
              </div>
              <div v-if="listing.level !== null" class="stat">
                <dt>{{ t("common.level") }}</dt>
                <dd>{{ listing.level }}</dd>
              </div>
              <div v-if="listing.quality !== null" class="stat">
                <dt>{{ t("common.quality") }}</dt>
                <dd>{{ listing.quality }}%</dd>
              </div>
            </dl>

            <small v-if="listing.bundleItemCount > 1">
              {{ t("market.players.bundleCount", { count: listing.bundleItemCount }) }}
            </small>
            <small>{{ formatDate(listing.createdAt) }}</small>
            <button
              v-if="listing.isOwnListing"
              :disabled="cancellingListingId === listing.id"
              class="secondary-button"
              type="button"
              @click="cancelListing(listing.id)"
            >
              {{
                cancellingListingId === listing.id
                  ? t("market.players.cancel.cancelling")
                  : t("market.players.cancel.submit")
              }}
            </button>
            <button
              v-else
              :disabled="purchasingListingId === listing.id"
              class="primary-button"
              type="button"
              @click="purchaseListing(listing)"
            >
              {{
                purchasingListingId === listing.id
                  ? t("market.players.purchase.purchasing")
                  : t("market.players.purchase.submit")
              }}
            </button>
          </div>
        </article>
      </section>

      <nav class="control-row market-pagination" :aria-label="t('market.players.pagination')">
        <button :disabled="state.pagination.page <= 1" class="secondary-button" @click="page--">
          {{ t("market.players.previous") }}
        </button>
        <span>
          {{
            t("market.players.page", {
              page: state.pagination.page,
              total: state.pagination.totalPages,
            })
          }}
        </span>
        <button
          :disabled="state.pagination.page >= state.pagination.totalPages"
          class="secondary-button"
          @click="page++"
        >
          {{ t("market.players.next") }}
        </button>
      </nav>
    </template>
  </main>
</template>

<script setup lang="ts">
import type { PlayerMarketBrowseState, PlayerMarketListingView } from "~/utils/playerState";
import { sectionLinks } from "~/utils/viewData";

const route = useRoute();
const { t, locale } = useI18n();
const contentText = useContentText();
const createKind = ref<"item" | "material">("item");
const createResourceId = ref("");
const createQuantity = ref(1);
const createPrice = ref(1);
const createRequestId = ref<string | null>(null);
const creating = ref(false);
const createFeedback = ref("");
const cancellingListingId = ref<string | null>(null);
const cancelFeedback = ref("");
const cancelRequestIds = new Map<string, string>();
const purchasingListingId = ref<string | null>(null);
const purchaseFeedback = ref("");
const purchaseRequestIds = new Map<string, string>();
const resourceType = ref("");
const definitionId = ref("");
const rarity = ref("");
const element = ref("");
const minLevel = ref("");
const maxLevel = ref("");
const minQuality = ref("");
const maxQuality = ref("");
const minPrice = ref("");
const maxPrice = ref("");
const sort = ref("newest");
const page = ref(1);
const query = computed(() => ({
  resourceType: resourceType.value || undefined,
  definitionId: definitionId.value || undefined,
  rarity: rarity.value || undefined,
  element: element.value || undefined,
  minLevel: minLevel.value || undefined,
  maxLevel: maxLevel.value || undefined,
  minQuality: minQuality.value || undefined,
  maxQuality: maxQuality.value || undefined,
  minPrice: minPrice.value || undefined,
  maxPrice: maxPrice.value || undefined,
  sort: sort.value,
  page: page.value,
  pageSize: 24,
}));
const {
  data: state,
  error,
  pending,
  refresh,
} = await useFetch<PlayerMarketBrowseState>("/api/market/players", { query });
const resourceTypes = ["ring", "gem", "monster", "spell", "material"] as const;
const rarities = ["common", "refined", "rare", "epic"] as const;
const elements = ["electric", "fire", "ice"] as const;
const sorts = ["newest", "priceAsc", "priceDesc", "levelDesc", "qualityDesc"] as const;
const availableDefinitions = computed(() => {
  const options = state.value?.filters.definitions ?? [];
  return resourceType.value
    ? options.filter((definition) => definition.resourceType === resourceType.value)
    : options;
});
const createLimitReached = computed(
  () =>
    Boolean(state.value) &&
    state.value!.createOptions.activeListingCount >= state.value!.createOptions.maxActiveListings,
);
const sellableOptions = computed(() => {
  if (!state.value) return [];
  if (createKind.value === "material") {
    return state.value.createOptions.materials.map((material) => ({
      id: material.materialId,
      label: `${contentText(material.nameKey, material.label)} (${material.quantity})`,
    }));
  }
  return state.value.createOptions.items.map((item) => ({
    id: item.inventoryItemId,
    label:
      item.bundleItemCount > 1
        ? `${contentText(item.nameKey, item.label)} (${t("market.players.bundleCount", { count: item.bundleItemCount })})`
        : contentText(item.nameKey, item.label),
  }));
});
const selectedMaterialQuantity = computed(
  () =>
    state.value?.createOptions.materials.find(
      (material) => material.materialId === createResourceId.value,
    )?.quantity ?? 1,
);

watch(resourceType, () => {
  definitionId.value = "";
});

watch([createKind, createResourceId, createQuantity, createPrice], () => {
  createRequestId.value = null;
  createFeedback.value = "";
});

watch(createKind, () => {
  createResourceId.value = "";
  createQuantity.value = 1;
});

watch(
  [
    resourceType,
    definitionId,
    rarity,
    element,
    minLevel,
    maxLevel,
    minQuality,
    maxQuality,
    minPrice,
    maxPrice,
    sort,
  ],
  () => {
    page.value = 1;
  },
);

function listingName(listing: PlayerMarketListingView): string {
  return listing.nameKey ? contentText(listing.nameKey, listing.label) : listing.label;
}

function formatNumber(value: number): string {
  return new Intl.NumberFormat(locale.value).format(value);
}

function formatDate(value: string): string {
  return new Intl.DateTimeFormat(locale.value, { dateStyle: "medium" }).format(new Date(value));
}

async function createListing(): Promise<void> {
  if (!createResourceId.value || createLimitReached.value) return;
  creating.value = true;
  createFeedback.value = "";
  cancelFeedback.value = "";
  purchaseFeedback.value = "";
  createRequestId.value ??= crypto.randomUUID();

  try {
    await $fetch("/api/market/players", {
      method: "POST",
      body:
        createKind.value === "material"
          ? {
              materialId: createResourceId.value,
              quantity: createQuantity.value,
              price: createPrice.value,
              requestId: createRequestId.value,
            }
          : {
              inventoryItemId: createResourceId.value,
              price: createPrice.value,
              requestId: createRequestId.value,
            },
    });
    createResourceId.value = "";
    createQuantity.value = 1;
    createPrice.value = 1;
    createRequestId.value = null;
    await refresh();
    createFeedback.value = t("market.players.create.success");
  } catch {
    createFeedback.value = t("market.players.create.error");
  } finally {
    creating.value = false;
  }
}

async function cancelListing(listingId: string): Promise<void> {
  if (cancellingListingId.value) return;
  cancellingListingId.value = listingId;
  cancelFeedback.value = "";
  createFeedback.value = "";
  purchaseFeedback.value = "";
  const requestId = cancelRequestIds.get(listingId) ?? crypto.randomUUID();
  cancelRequestIds.set(listingId, requestId);

  try {
    await $fetch(`/api/market/players/${listingId}`, {
      method: "DELETE",
      body: { requestId },
    });
    cancelRequestIds.delete(listingId);
    await refresh();
    cancelFeedback.value = t("market.players.cancel.success");
  } catch {
    cancelFeedback.value = t("market.players.cancel.error");
  } finally {
    cancellingListingId.value = null;
  }
}

async function purchaseListing(listing: PlayerMarketListingView): Promise<void> {
  if (purchasingListingId.value) return;
  const confirmed = window.confirm(
    t("market.players.purchase.confirm", { price: formatNumber(listing.price) }),
  );
  if (!confirmed) return;

  purchasingListingId.value = listing.id;
  purchaseFeedback.value = "";
  createFeedback.value = "";
  cancelFeedback.value = "";
  const requestId = purchaseRequestIds.get(listing.id) ?? crypto.randomUUID();
  purchaseRequestIds.set(listing.id, requestId);

  try {
    await $fetch(`/api/market/players/${listing.id}/purchase`, {
      method: "POST",
      body: { requestId },
    });
    purchaseRequestIds.delete(listing.id);
    await refresh();
    purchaseFeedback.value = t("market.players.purchase.success");
  } catch {
    purchaseFeedback.value = t("market.players.purchase.error");
  } finally {
    purchasingListingId.value = null;
  }
}
</script>
