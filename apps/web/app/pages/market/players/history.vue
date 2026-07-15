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
        <h1>{{ t("market.players.history.title") }}</h1>
        <p class="muted">{{ t("market.players.history.description") }}</p>
      </div>
      <p v-if="state" class="status-note">
        {{ t("market.players.history.transactionCount", { count: state.pagination.total }) }}
      </p>
    </header>

    <section class="panel">
      <div class="filter-bar market-history-filters">
        <label>
          <span class="field-label">{{ t("market.players.history.role.label") }}</span>
          <select v-model="role">
            <option v-for="value in roles" :key="value" :value="value">
              {{ t(`market.players.history.role.${value}`) }}
            </option>
          </select>
        </label>
      </div>
    </section>

    <p v-if="pending" class="panel">{{ t("market.players.history.loading") }}</p>
    <p v-else-if="error" class="panel">{{ t("market.players.history.loadError") }}</p>

    <template v-else-if="state">
      <section v-if="state.transactions.length === 0" class="panel empty-state">
        <h2>{{ t("market.players.history.emptyTitle") }}</h2>
        <p class="muted">{{ t("market.players.history.emptyBody") }}</p>
      </section>

      <section v-else class="item-grid market-listing-grid">
        <article
          v-for="transaction in state.transactions"
          :key="transaction.id"
          :class="['card', 'item-card', `rarity-border-${transaction.rarity}`]"
        >
          <ItemArtwork :definition-id="transaction.definitionId" :kind="transaction.resourceType" />
          <div class="item-card-body">
            <div class="card-heading">
              <div>
                <h2>{{ transactionName(transaction) }}</h2>
                <small>{{ t(`itemType.${transaction.resourceType}`) }}</small>
              </div>
              <span :class="['pill', `rarity-${transaction.rarity}`]">
                {{ t(`rarity.${transaction.rarity}`) }}
              </span>
            </div>

            <div class="control-row market-listing-badges">
              <span
                :class="[
                  'pill',
                  transaction.direction === 'purchase' ? 'history-purchase' : 'history-sale',
                ]"
              >
                {{ t(`market.players.history.direction.${transaction.direction}`) }}
              </span>
              <span v-if="transaction.element" :class="['pill', `element-${transaction.element}`]">
                {{ t(`element.${transaction.element}`) }}
              </span>
            </div>

            <dl class="summary-grid item-detail-grid">
              <div class="stat">
                <dt>{{ t("common.credits") }}</dt>
                <dd>{{ formatNumber(transaction.price) }}</dd>
              </div>
              <div class="stat">
                <dt>{{ t("itemDetail.quantity") }}</dt>
                <dd>{{ transaction.quantity }}</dd>
              </div>
              <div v-if="transaction.level !== null" class="stat">
                <dt>{{ t("common.level") }}</dt>
                <dd>{{ transaction.level }}</dd>
              </div>
              <div v-if="transaction.quality !== null" class="stat">
                <dt>{{ t("common.quality") }}</dt>
                <dd>{{ transaction.quality }}%</dd>
              </div>
            </dl>

            <small v-if="transaction.bundleItemCount > 1">
              {{
                t("market.players.bundleCount", {
                  count: transaction.bundleItemCount,
                })
              }}
            </small>
            <small>
              {{ t("market.players.history.soldAt", { date: formatDate(transaction.soldAt) }) }}
            </small>
          </div>
        </article>
      </section>

      <nav
        class="control-row market-pagination"
        :aria-label="t('market.players.history.pagination')"
      >
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
import type {
  PlayerMarketHistoryState,
  PlayerMarketHistoryTransactionView,
} from "~/utils/playerState";
import { sectionLinks } from "~/utils/viewData";

const route = useRoute();
const { t, locale } = useI18n();
const contentText = useContentText();
const roles = ["all", "buyer", "seller"] as const;
const role = ref<(typeof roles)[number]>("all");
const page = ref(1);
const query = computed(() => ({ role: role.value, page: page.value, pageSize: 24 }));
const {
  data: state,
  error,
  pending,
} = await useFetch<PlayerMarketHistoryState>("/api/market/players/history", { query });

watch(role, () => {
  page.value = 1;
});

function transactionName(transaction: PlayerMarketHistoryTransactionView): string {
  return transaction.nameKey
    ? contentText(transaction.nameKey, transaction.label)
    : transaction.label;
}

function formatNumber(value: number): string {
  return new Intl.NumberFormat(locale.value).format(value);
}

function formatDate(value: string): string {
  return new Intl.DateTimeFormat(locale.value, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}
</script>
