<template>
  <main class="shell app-hub-page market-hub-page">
    <nav class="section-nav" :aria-label="t('accessibility.marketNavigation')">
      <NuxtLink
        v-for="link in sectionLinks.market"
        :key="link.to"
        :class="{ active: route.path === link.to }"
        :to="link.to"
        >{{ t(link.labelKey) }}</NuxtLink
      >
    </nav>

    <header class="view-header app-hub-header">
      <div class="view-title">
        <span class="eyebrow">{{ t("market.section") }}</span>
        <h1>{{ t("market.hub.title") }}</h1>
        <p class="muted">{{ t("market.hub.description") }}</p>
      </div>
      <div v-if="gameMarket" class="hub-balance-panel">
        <span class="hub-balance-icon"><Coins :size="21" /></span>
        <span
          ><small>{{ t("market.hub.availableBalance") }}</small
          ><strong>{{ formattedCredits }}</strong></span
        >
      </div>
    </header>

    <p v-if="pending" class="panel">{{ t("market.hub.loading") }}</p>
    <p v-else-if="error || !gameMarket || !playerMarket" class="panel">
      {{ t("market.hub.loadError") }}
    </p>

    <template v-else>
      <section class="hub-stat-strip" :aria-label="t('market.hub.exchangeOverview')">
        <NuxtLink to="/market/game"
          ><span class="hub-stat-icon stock"><PackageOpen :size="19" /></span
          ><span
            ><small>{{ t("market.game.materials") }}</small
            ><strong>{{ gameMarket.materials.length }}</strong
            ><em>{{ t("market.hub.fixedResources") }}</em></span
          ></NuxtLink
        >
        <NuxtLink to="/market/game"
          ><span class="hub-stat-icon buyback"><BadgeDollarSign :size="19" /></span
          ><span
            ><small>{{ t("market.game.buybackInventory") }}</small
            ><strong>{{ sellableItemCount }}</strong
            ><em>{{ t("market.hub.sellableItems") }}</em></span
          ></NuxtLink
        >
        <NuxtLink to="/market/players"
          ><span class="hub-stat-icon listings"><Store :size="19" /></span
          ><span
            ><small>{{ t("market.players.activeListings") }}</small
            ><strong>{{ playerMarket.pagination.total }}</strong
            ><em>{{ t("market.hub.playerOffers") }}</em></span
          ></NuxtLink
        >
        <NuxtLink to="/market/players"
          ><span class="hub-stat-icon capacity"><Tag :size="19" /></span
          ><span
            ><small>{{ t("market.players.yourListings") }}</small
            ><strong
              >{{ playerMarket.createOptions.activeListingCount }} /
              {{ playerMarket.createOptions.maxActiveListings }}</strong
            ><em>{{ t("market.hub.listingCapacity") }}</em></span
          ></NuxtLink
        >
      </section>

      <section class="market-hub-destinations">
        <NuxtLink class="market-hub-destination game-economy" to="/market/game">
          <span class="market-destination-icon"><Landmark :size="30" /></span>
          <span class="eyebrow">{{ t("market.hub.systemExchange") }}</span>
          <h2>{{ t("market.game.title") }}</h2>
          <p>{{ t("market.game.description") }}</p>
          <ul>
            <li><Check :size="15" /> {{ t("market.hub.fixedPrices") }}</li>
            <li><Check :size="15" /> {{ t("market.hub.materialTrading") }}</li>
            <li><Check :size="15" /> {{ t("market.hub.recipeBuyback") }}</li>
          </ul>
          <span class="hub-workflow-action"
            >{{ t("market.hub.enterMarket") }} <ArrowRight :size="17"
          /></span>
        </NuxtLink>

        <NuxtLink class="market-hub-destination player-economy" to="/market/players">
          <span class="market-destination-icon"><Users :size="30" /></span>
          <span class="eyebrow">{{ t("market.hub.playerExchange") }}</span>
          <h2>{{ t("market.players.title") }}</h2>
          <p>{{ t("market.players.description") }}</p>
          <ul>
            <li><Check :size="15" /> {{ t("market.hub.permanentOffers") }}</li>
            <li><Check :size="15" /> {{ t("market.hub.anonymousSellers") }}</li>
            <li><Check :size="15" /> {{ t("market.hub.escrowProtection") }}</li>
          </ul>
          <span class="hub-workflow-action"
            >{{ t("market.hub.browseListings") }} <ArrowRight :size="17"
          /></span>
        </NuxtLink>
      </section>

      <section class="market-hub-activity">
        <div class="section-heading-row">
          <div>
            <span class="eyebrow">{{ t("market.hub.activity") }}</span>
            <h2>{{ t("market.hub.recentGameTransactions") }}</h2>
          </div>
          <NuxtLink class="text-link" to="/market/players/history"
            >{{ t("market.players.openHistory") }} <ArrowRight :size="16"
          /></NuxtLink>
        </div>
        <div v-if="recentTransactions.length" class="market-hub-transaction-list">
          <article v-for="transaction in recentTransactions" :key="transaction.id">
            <span :class="['market-transaction-direction', transaction.action]"
              ><ArrowDownLeft v-if="transaction.action === 'buy'" :size="17" /><ArrowUpRight
                v-else
                :size="17"
            /></span>
            <span
              ><strong>{{ transaction.resourceLabel }}</strong
              ><small
                >{{ t(`market.game.action.${transaction.action}`) }} ·
                {{ formatDate(transaction.createdAt) }}</small
              ></span
            >
            <span
              ><small>{{ t("common.quantity") }}</small
              ><strong>{{ transaction.quantity }}</strong></span
            >
            <strong :class="transaction.creditsDelta >= 0 ? 'positive' : 'negative'"
              >{{ transaction.creditsDelta >= 0 ? "+" : "" }}{{ transaction.creditsDelta }}</strong
            >
          </article>
        </div>
        <div v-else class="market-hub-empty">
          <History :size="24" /><span
            ><strong>{{ t("market.game.noActivity") }}</strong
            ><small>{{ t("market.hub.activityHint") }}</small></span
          >
        </div>
      </section>
    </template>
  </main>
</template>

<script setup lang="ts">
import {
  ArrowDownLeft,
  ArrowRight,
  ArrowUpRight,
  BadgeDollarSign,
  Check,
  Coins,
  History,
  Landmark,
  PackageOpen,
  Store,
  Tag,
  Users,
} from "@lucide/vue";
import type { GameMarketState, PlayerMarketBrowseState } from "~/utils/playerState";
import { sectionLinks } from "~/utils/viewData";

const route = useRoute();
const { locale, t } = useI18n();
const [gameRequest, playerRequest] = await Promise.all([
  useFetch<GameMarketState>("/api/market/game", { key: "market-hub-game" }),
  useFetch<PlayerMarketBrowseState>("/api/market/players", { key: "market-hub-players" }),
]);
const gameMarket = gameRequest.data;
const playerMarket = playerRequest.data;
const pending = computed(() => gameRequest.pending.value || playerRequest.pending.value);
const error = computed(() => gameRequest.error.value || playerRequest.error.value);
const formattedCredits = computed(() =>
  new Intl.NumberFormat(locale.value).format(gameMarket.value?.player.credits ?? 0),
);
const sellableItemCount = computed(
  () => gameMarket.value?.items.filter((item) => item.canSell).length ?? 0,
);
const recentTransactions = computed(() => gameMarket.value?.transactions.slice(0, 4) ?? []);

function formatDate(value: string): string {
  return new Intl.DateTimeFormat(locale.value, { dateStyle: "medium" }).format(new Date(value));
}
</script>
