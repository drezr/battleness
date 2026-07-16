<template>
  <main class="shell home-shell">
    <p v-if="pending" class="panel">{{ t("home.loading") }}</p>
    <p v-else-if="error" class="panel">{{ t("home.loadError") }}</p>

    <template v-else-if="state">
      <header class="home-header">
        <div>
          <span class="eyebrow">{{ t("home.section") }}</span>
          <h1>{{ t("home.welcome", { player: state.player.displayName }) }}</h1>
          <p class="muted">{{ t("home.description") }}</p>
        </div>
        <img class="home-wordmark" src="/assets/brand/battleness-logo.png" :alt="t('app.brand')" />
      </header>

      <section class="home-command-grid">
        <article class="battle-command-card">
          <div class="battle-command-copy">
            <span class="mode-label"><Swords :size="16" /> {{ t("home.nextBattle") }}</span>
            <h2>{{ t("home.campaignTitle") }}</h2>
            <p>{{ t("home.campaignDescription") }}</p>
            <div class="control-row">
              <NuxtLink class="button-link primary-command" to="/battle/campaign">
                <Play :size="17" fill="currentColor" aria-hidden="true" />
                {{ t("home.enterCampaign") }}
              </NuxtLink>
              <NuxtLink class="button-link secondary-button" to="/battle/pvp">
                <Users :size="17" aria-hidden="true" />
                {{ t("navigation.pvp") }}
              </NuxtLink>
            </div>
          </div>
          <div class="battle-emblem" aria-hidden="true">
            <Shield :size="78" stroke-width="1.2" />
            <Swords :size="34" stroke-width="1.8" />
          </div>
        </article>

        <dl class="home-metrics">
          <div>
            <span class="metric-icon experience"><Zap :size="18" /></span>
            <dt>{{ t("common.heroLevel") }}</dt>
            <dd>{{ state.player.level }}</dd>
          </div>
          <div>
            <span class="metric-icon credits"><Coins :size="18" /></span>
            <dt>{{ t("common.credits") }}</dt>
            <dd>{{ formattedCredits }}</dd>
          </div>
          <div>
            <span class="metric-icon collection"><Backpack :size="18" /></span>
            <dt>{{ t("common.items") }}</dt>
            <dd>{{ state.inventory.length }}</dd>
          </div>
          <div>
            <span class="metric-icon materials"><Boxes :size="18" /></span>
            <dt>{{ t("common.materials") }}</dt>
            <dd>{{ totalMaterialQuantity(state.materials) }}</dd>
          </div>
        </dl>
      </section>

      <section class="home-section">
        <div class="section-heading-row">
          <div>
            <span class="eyebrow">{{ t("home.quickActions") }}</span>
            <h2>{{ t("home.chooseDestination") }}</h2>
          </div>
        </div>
        <div class="destination-grid">
          <NuxtLink class="destination-card forge" to="/forge/craft">
            <span class="destination-icon"><Anvil :size="24" /></span>
            <span>
              <strong>{{ t("navigation.forge") }}</strong>
              <small>{{ t("home.forgeDescription") }}</small>
            </span>
            <ChevronRight :size="19" aria-hidden="true" />
          </NuxtLink>
          <NuxtLink class="destination-card inventory" to="/inventory/items">
            <span class="destination-icon"><Backpack :size="24" /></span>
            <span>
              <strong>{{ t("navigation.inventory") }}</strong>
              <small>{{ t("home.inventoryDescription", collectionCounts) }}</small>
            </span>
            <ChevronRight :size="19" aria-hidden="true" />
          </NuxtLink>
          <NuxtLink class="destination-card market" to="/market/game">
            <span class="destination-icon"><Store :size="24" /></span>
            <span>
              <strong>{{ t("navigation.market") }}</strong>
              <small>{{ t("home.marketDescription") }}</small>
            </span>
            <ChevronRight :size="19" aria-hidden="true" />
          </NuxtLink>
        </div>
      </section>

      <section class="home-section collection-preview">
        <div class="section-heading-row">
          <div>
            <span class="eyebrow">{{ t("home.collection") }}</span>
            <h2>{{ t("home.recentItems") }}</h2>
          </div>
          <NuxtLink class="text-link" to="/inventory/items">
            {{ t("home.viewInventory") }} <ArrowRight :size="16" aria-hidden="true" />
          </NuxtLink>
        </div>
        <div class="collection-strip">
          <article
            v-for="item in previewItems"
            :key="item.id"
            :class="['collection-preview-card', `rarity-border-${item.rarity}`]"
          >
            <div class="collection-artwork-wrap">
              <ItemArtwork :definition-id="item.definitionId" :kind="item.type" />
              <span :class="['pill', `element-${item.element}`]">
                {{ t(`element.${item.element}`) }}
              </span>
            </div>
            <span class="eyebrow">{{ t(`itemType.${item.type}`) }}</span>
            <strong>{{ itemName(item.type, item.definitionId, item.label) }}</strong>
            <small>{{ t("home.itemMeta", { level: item.level, quality: item.quality }) }}</small>
          </article>
        </div>
      </section>
    </template>
  </main>
</template>

<script setup lang="ts">
import {
  Anvil,
  ArrowRight,
  Backpack,
  Boxes,
  ChevronRight,
  Coins,
  Play,
  Shield,
  Store,
  Swords,
  Users,
  Zap,
} from "@lucide/vue";
import type { PlayerState } from "~/utils/playerState";
import { inventoryCountByType, totalMaterialQuantity } from "~/utils/playerState";

const { data: state, error, pending } = await useFetch<PlayerState>("/api/player");
const { locale, t } = useI18n();
const contentText = useContentText();

const collectionCounts = computed(() => ({
  rings: inventoryCountByType(state.value?.inventory, "ring"),
  gems: inventoryCountByType(state.value?.inventory, "gem"),
  monsters: inventoryCountByType(state.value?.inventory, "monster"),
  spells: inventoryCountByType(state.value?.inventory, "spell"),
}));
const previewItems = computed(() => state.value?.inventory.slice(0, 4) ?? []);
const formattedCredits = computed(() =>
  state.value ? new Intl.NumberFormat(locale.value).format(state.value.player.credits) : "-",
);

function itemName(type: string, definitionId: string, fallback: string): string {
  return contentText(`${type}.${definitionId}.name`, fallback);
}
</script>
