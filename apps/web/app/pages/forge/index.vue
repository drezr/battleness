<template>
  <main class="shell app-hub-page forge-hub-page">
    <nav class="section-nav" :aria-label="t('accessibility.forgeNavigation')">
      <NuxtLink
        v-for="link in sectionLinks.forge"
        :key="link.to"
        :class="{ active: route.path === link.to }"
        :to="link.to"
      >
        {{ t(link.labelKey) }}
      </NuxtLink>
    </nav>

    <header class="view-header app-hub-header">
      <div class="view-title">
        <span class="eyebrow">{{ t("forge.section") }}</span>
        <h1>{{ t("forge.hub.title") }}</h1>
        <p class="muted">{{ t("forge.hub.description") }}</p>
      </div>
      <NuxtLink class="hub-resource-link" to="/inventory/materials">
        <PackageOpen :size="20" />
        <span
          ><small>{{ t("forge.hub.materialStock") }}</small
          ><strong>{{ materialUnits }}</strong></span
        >
        <ChevronRight :size="17" />
      </NuxtLink>
    </header>

    <p v-if="pending" class="panel">{{ t("forge.hub.loading") }}</p>
    <p v-else-if="error || !state" class="panel">{{ t("forge.hub.loadError") }}</p>

    <template v-else>
      <section class="hub-stat-strip" :aria-label="t('forge.hub.workshopOverview')">
        <NuxtLink to="/forge/craft">
          <span class="hub-stat-icon craft"><ScrollText :size="19" /></span>
          <span
            ><small>{{ t("forge.craft.recipes") }}</small
            ><strong>{{ state.recipes.length }}</strong
            ><em>{{ t("forge.hub.knownBlueprints") }}</em></span
          >
        </NuxtLink>
        <NuxtLink to="/forge/craft">
          <span class="hub-stat-icon ready"><Hammer :size="19" /></span>
          <span
            ><small>{{ t("forge.craft.craftable") }}</small
            ><strong>{{ craftableCount }}</strong
            ><em>{{ t("forge.hub.readyBlueprints") }}</em></span
          >
        </NuxtLink>
        <NuxtLink to="/forge/socket">
          <span class="hub-stat-icon sockets"><Gem :size="19" /></span>
          <span
            ><small>{{ t("common.gems") }}</small
            ><strong>{{ gemCount }}</strong
            ><em>{{ t("forge.hub.socketResources") }}</em></span
          >
        </NuxtLink>
        <NuxtLink to="/forge/quality">
          <span class="hub-stat-icon credits"><Coins :size="19" /></span>
          <span
            ><small>{{ t("common.credits") }}</small
            ><strong>{{ formattedCredits }}</strong
            ><em>{{ t("forge.hub.improvementBudget") }}</em></span
          >
        </NuxtLink>
      </section>

      <section class="hub-workflow-grid forge-workflow-grid">
        <NuxtLink class="hub-workflow-card primary" to="/forge/craft">
          <span class="hub-workflow-number">01</span>
          <span class="hub-workflow-icon"><Hammer :size="28" /></span>
          <span class="eyebrow">{{ t("forge.hub.production") }}</span>
          <h2>{{ t("forge.craft.title") }}</h2>
          <p>{{ t("forge.craft.description") }}</p>
          <dl>
            <div>
              <dt>{{ t("forge.craft.craftable") }}</dt>
              <dd>{{ craftableCount }}</dd>
            </div>
            <div>
              <dt>{{ t("forge.craft.materialUnits") }}</dt>
              <dd>{{ materialUnits }}</dd>
            </div>
          </dl>
          <span class="hub-workflow-action"
            >{{ t("forge.hub.openStation") }} <ArrowRight :size="17"
          /></span>
        </NuxtLink>

        <NuxtLink class="hub-workflow-card" to="/forge/socket">
          <span class="hub-workflow-number">02</span>
          <span class="hub-workflow-icon"><Network :size="28" /></span>
          <span class="eyebrow">{{ t("forge.hub.composition") }}</span>
          <h2>{{ t("forge.socket.title") }}</h2>
          <p>{{ t("forge.socket.description") }}</p>
          <dl>
            <div>
              <dt>{{ t("common.rings") }}</dt>
              <dd>{{ ringCount }}</dd>
            </div>
            <div>
              <dt>{{ t("common.gems") }}</dt>
              <dd>{{ gemCount }}</dd>
            </div>
          </dl>
          <span class="hub-workflow-action"
            >{{ t("forge.hub.openStation") }} <ArrowRight :size="17"
          /></span>
        </NuxtLink>

        <NuxtLink class="hub-workflow-card" to="/forge/quality">
          <span class="hub-workflow-number">03</span>
          <span class="hub-workflow-icon"><Sparkles :size="28" /></span>
          <span class="eyebrow">{{ t("forge.hub.refinement") }}</span>
          <h2>{{ t("forge.quality.title") }}</h2>
          <p>{{ t("forge.quality.description") }}</p>
          <dl>
            <div>
              <dt>{{ t("forge.hub.candidates") }}</dt>
              <dd>{{ qualityCandidates }}</dd>
            </div>
            <div>
              <dt>{{ t("progression.averageQuality") }}</dt>
              <dd>{{ averageQuality }}</dd>
            </div>
          </dl>
          <span class="hub-workflow-action"
            >{{ t("forge.hub.openStation") }} <ArrowRight :size="17"
          /></span>
        </NuxtLink>
      </section>

      <section class="hub-guidance-bar">
        <span class="hub-guidance-icon"><Lightbulb :size="20" /></span>
        <span
          ><strong>{{ t("forge.hub.recommendedNext") }}</strong
          ><small>{{ recommendation }}</small></span
        >
        <NuxtLink class="button-link secondary-button" :to="recommendationRoute"
          >{{ t("forge.hub.followRecommendation") }} <ArrowRight :size="16"
        /></NuxtLink>
      </section>
    </template>
  </main>
</template>

<script setup lang="ts">
import {
  ArrowRight,
  ChevronRight,
  Coins,
  Gem,
  Hammer,
  Lightbulb,
  Network,
  PackageOpen,
  ScrollText,
  Sparkles,
} from "@lucide/vue";
import type { PlayerState } from "~/utils/playerState";
import { inventoryCountByType, totalMaterialQuantity } from "~/utils/playerState";
import { sectionLinks } from "~/utils/viewData";

const route = useRoute();
const { locale, t } = useI18n();
const {
  data: state,
  error,
  pending,
} = await useFetch<PlayerState>("/api/player", { key: "forge-hub-player" });
const craftableCount = computed(
  () => state.value?.recipes.filter((recipe) => recipe.canCraft).length ?? 0,
);
const materialUnits = computed(() => totalMaterialQuantity(state.value?.materials));
const ringCount = computed(() => inventoryCountByType(state.value?.inventory, "ring"));
const gemCount = computed(() => inventoryCountByType(state.value?.inventory, "gem"));
const qualityCandidates = computed(
  () => state.value?.inventory.filter((item) => item.quality < 100).length ?? 0,
);
const averageQuality = computed(() => {
  const items = state.value?.inventory ?? [];
  return items.length
    ? Math.round(items.reduce((sum, item) => sum + item.quality, 0) / items.length)
    : 0;
});
const formattedCredits = computed(() =>
  new Intl.NumberFormat(locale.value).format(state.value?.player.credits ?? 0),
);
const recommendationRoute = computed(() =>
  craftableCount.value > 0 ? "/forge/craft" : "/market/game",
);
const recommendation = computed(() =>
  t(
    craftableCount.value > 0 ? "forge.hub.craftRecommendation" : "forge.hub.materialRecommendation",
  ),
);
</script>
