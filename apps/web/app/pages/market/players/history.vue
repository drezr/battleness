<template>
  <main class="shell market-history-page">
    <header class="view-header market-view-header">
      <div class="view-title">
        <SectionBackLink
          to="/market"
          :label="t('navigation.backToHub', { section: t('navigation.market') })"
        />
        <div class="view-title-heading">
          <h1>{{ t("market.players.history.title") }}</h1>
          <ViewHelpButton
            :title="t('market.players.history.title')"
            :description="t('market.players.history.description')"
          />
        </div>
      </div>
      <NuxtLink class="button-link secondary-button" to="/market/players"
        ><Store :size="17" />{{ t("market.players.backToMarket") }}<ArrowRight :size="16"
      /></NuxtLink>
    </header>

    <section class="market-history-toolbar">
      <div>
        <span class="market-history-icon"><History :size="21" /></span
        ><span
          ><small>{{ t("market.players.history.privateLedger") }}</small
          ><strong v-if="state">{{
            t("market.players.history.transactionCount", { count: state.pagination.total })
          }}</strong></span
        >
      </div>
      <label
        ><span class="field-label">{{ t("market.players.history.role.label") }}</span
        ><select v-model="role">
          <option v-for="value in roles" :key="value" :value="value">
            {{ t(`market.players.history.role.${value}`) }}
          </option>
        </select></label
      >
    </section>

    <p v-if="pending" class="panel">{{ t("market.players.history.loading") }}</p>
    <p v-else-if="error" class="panel">{{ t("market.players.history.loadError") }}</p>

    <template v-else-if="state">
      <section v-if="state.transactions.length === 0" class="player-market-empty">
        <ReceiptText :size="30" />
        <div>
          <h2>{{ t("market.players.history.emptyTitle") }}</h2>
          <p>{{ t("market.players.history.emptyBody") }}</p>
        </div>
      </section>
      <section v-else class="market-ledger-list">
        <article
          v-for="transaction in state.transactions"
          :key="transaction.id"
          :class="`rarity-border-${transaction.rarity}`"
        >
          <span :class="['ledger-direction-icon', transaction.direction]"
            ><ShoppingCart v-if="transaction.direction === 'purchase'" :size="18" /><Banknote
              v-else
              :size="18"
          /></span>
          <ItemArtwork :definition-id="transaction.definitionId" :kind="transaction.resourceType" />
          <div class="ledger-item-copy">
            <span class="eyebrow">{{
              t(`market.players.history.direction.${transaction.direction}`)
            }}</span>
            <h2>{{ transactionName(transaction) }}</h2>
            <span
              ><small>{{ t(`itemType.${transaction.resourceType}`) }}</small
              ><span
                v-if="transaction.element"
                :class="['pill', `element-${transaction.element}`]"
                >{{ t(`element.${transaction.element}`) }}</span
              ><span :class="['pill', `rarity-${transaction.rarity}`]">{{
                t(`rarity.${transaction.rarity}`)
              }}</span></span
            >
          </div>
          <dl class="ledger-stats">
            <div>
              <dt>{{ t("itemDetail.quantity") }}</dt>
              <dd>{{ transaction.quantity }}</dd>
            </div>
            <div v-if="transaction.level !== null">
              <dt>{{ t("common.level") }}</dt>
              <dd>{{ transaction.level }}</dd>
            </div>
            <div v-if="transaction.quality !== null">
              <dt>{{ t("common.quality") }}</dt>
              <dd>{{ transaction.quality }}%</dd>
            </div>
            <div v-if="transaction.bundleItemCount > 1">
              <dt>{{ t("market.players.bundle") }}</dt>
              <dd>{{ transaction.bundleItemCount }}</dd>
            </div>
          </dl>
          <div class="ledger-settlement">
            <small>{{
              t("market.players.history.soldAt", { date: formatDate(transaction.soldAt) })
            }}</small
            ><strong><Coins :size="17" />{{ formatNumber(transaction.price) }}</strong>
          </div>
        </article>
      </section>

      <nav class="market-pagination" :aria-label="t('market.players.history.pagination')">
        <button :disabled="state.pagination.page <= 1" class="secondary-button" @click="page--">
          <ChevronLeft :size="16" />{{ t("market.players.previous") }}
        </button>
        <span>{{
          t("market.players.page", {
            page: state.pagination.page,
            total: state.pagination.totalPages,
          })
        }}</span>
        <button
          :disabled="state.pagination.page >= state.pagination.totalPages"
          class="secondary-button"
          @click="page++"
        >
          {{ t("market.players.next") }}<ChevronRight :size="16" />
        </button>
      </nav>
    </template>
  </main>
</template>

<script setup lang="ts">
import {
  ArrowRight,
  Banknote,
  ChevronLeft,
  ChevronRight,
  Coins,
  History,
  ReceiptText,
  ShoppingCart,
  Store,
} from "@lucide/vue";
import type {
  PlayerMarketHistoryState,
  PlayerMarketHistoryTransactionView,
} from "~/utils/playerState";
const { t, locale } = useI18n();
const { formatDateTime: formatLocalizedDateTime } = useDateTimeFormatter();
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
  return formatLocalizedDateTime(value, { dateStyle: "medium", timeStyle: "short" });
}
</script>
