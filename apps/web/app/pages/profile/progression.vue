<template>
  <main class="shell progression-page">
    <nav class="section-nav" :aria-label="t('accessibility.profileNavigation')">
      <NuxtLink
        v-for="link in sectionLinks.profile"
        :key="link.to"
        :class="{ active: route.path === link.to }"
        :to="link.to"
      >
        {{ $t(link.labelKey) }}
      </NuxtLink>
    </nav>

    <header class="view-header progression-header">
      <div class="view-title">
        <span class="eyebrow">{{ t("profile.section") }}</span>
        <h1>{{ t("progression.title") }}</h1>
        <p class="muted">{{ t("progression.description") }}</p>
      </div>
      <NuxtLink class="button-link secondary-button" to="/inventory/items">
        <Backpack :size="17" aria-hidden="true" />
        {{ t("progression.openCollection") }}
        <ArrowRight :size="16" aria-hidden="true" />
      </NuxtLink>
    </header>

    <p v-if="pending" class="panel">{{ t("progression.loading") }}</p>
    <p v-else-if="error || !state" class="panel">{{ t("progression.loadError") }}</p>

    <template v-else>
      <section class="progression-command-panel">
        <div class="progression-rank-block">
          <span>{{ t("common.heroLevel") }}</span>
          <strong>{{ state.player.level }}</strong>
          <small>{{
            t("progression.levelCap", { level: state.player.progression.maxLevel })
          }}</small>
        </div>
        <div class="progression-command-copy">
          <div class="section-heading-row">
            <div>
              <span class="eyebrow">{{ t("progression.heroPath") }}</span>
              <h2>{{ state.player.displayName }}</h2>
              <p class="muted">
                {{ t("progression.totalXp", { experience: state.player.experience }) }}
              </p>
            </div>
            <span class="progression-health"
              ><HeartPulse :size="15" /> {{ state.player.maxHealth }}</span
            >
          </div>
          <ExperienceProgress
            :progress="state.player.progression"
            :label="t('progression.heroExperience')"
          />
        </div>
      </section>

      <section class="progression-stat-strip">
        <article>
          <span class="progression-stat-icon campaign"><Map :size="19" /></span>
          <div>
            <small>{{ t("common.campaign") }}</small
            ><strong
              >{{ campaign?.progress.completedCount ?? 0 }} /
              {{ campaign?.progress.totalCount ?? 0 }}</strong
            ><span>{{ t("progression.campaignCleared") }}</span>
          </div>
        </article>
        <article>
          <span class="progression-stat-icon items"><Boxes :size="19" /></span>
          <div>
            <small>{{ t("common.items") }}</small
            ><strong>{{ state.inventory.length }}</strong
            ><span>{{ t("progression.ownedInstances") }}</span>
          </div>
        </article>
        <article>
          <span class="progression-stat-icon level"><TrendingUp :size="19" /></span>
          <div>
            <small>{{ t("progression.highestItem") }}</small
            ><strong>{{ t("common.level") }} {{ highestItemLevel }}</strong
            ><span>{{ t("progression.collectionMaximum") }}</span>
          </div>
        </article>
        <article>
          <span class="progression-stat-icon quality"><Sparkles :size="19" /></span>
          <div>
            <small>{{ t("progression.averageQuality") }}</small
            ><strong>{{ averageQuality }}<em>/100</em></strong
            ><span>{{ t("progression.collectionAverage") }}</span>
          </div>
        </article>
      </section>

      <section class="progression-collection-section">
        <div class="progression-list-heading">
          <div>
            <span class="eyebrow">{{ t("progression.collection") }}</span>
            <h2>{{ t("progression.itemProgress") }}</h2>
            <p class="muted">{{ t("progression.itemProgressDescription") }}</p>
          </div>
          <div class="progression-type-filters" :aria-label="t('progression.filterLabel')">
            <button
              v-for="filter in typeFilters"
              :key="filter.value"
              type="button"
              :class="{ active: typeFilter === filter.value }"
              @click="typeFilter = filter.value"
            >
              {{ t(filter.labelKey) }} <span>{{ filter.count }}</span>
            </button>
          </div>
        </div>

        <p v-if="filteredItems.length === 0" class="progression-empty">
          {{ t("progression.noItems") }}
        </p>
        <div v-else class="progression-item-list">
          <article
            v-for="item in filteredItems"
            :key="item.id"
            :class="['progression-item-row', `rarity-border-${item.rarity}`]"
          >
            <div class="progression-artwork-wrap">
              <ItemArtwork :definition-id="item.definitionId" :kind="item.type" />
              <span :class="['pill', `element-${item.element}`]">{{
                t(`element.${item.element}`)
              }}</span>
            </div>
            <div class="progression-item-copy">
              <div class="card-heading">
                <div>
                  <span class="eyebrow">{{ t(`itemType.${item.type}`) }}</span>
                  <strong>{{ itemName(item.type, item.definitionId, item.label) }}</strong>
                </div>
                <span class="progression-item-level">{{ t("common.level") }} {{ item.level }}</span>
              </div>
              <ExperienceProgress
                :progress="item.progression"
                :label="
                  t('progression.itemExperience', {
                    item: itemName(item.type, item.definitionId, item.label),
                  })
                "
              />
            </div>
            <dl class="progression-item-bonus">
              <div>
                <dt>{{ t("progression.statBonus") }}</dt>
                <dd class="positive">+{{ item.bonusPercent }}%</dd>
              </div>
              <div>
                <dt>{{ t("common.quality") }}</dt>
                <dd>{{ item.quality }}</dd>
              </div>
            </dl>
          </article>
        </div>
      </section>

      <details class="progression-formula-details">
        <summary>
          <span
            ><Calculator :size="18" /> <strong>{{ t("progression.formulaTitle") }}</strong></span
          >
          <span>{{ t("progression.viewFormula") }} <ChevronDown :size="17" /></span>
        </summary>
        <div>
          <p>{{ t("progression.formulaDescription") }}</p>
          <code>{{ t("progression.formulaExpression") }}</code>
        </div>
      </details>
    </template>
  </main>
</template>

<script setup lang="ts">
import {
  ArrowRight,
  Backpack,
  Boxes,
  Calculator,
  ChevronDown,
  HeartPulse,
  Map,
  Sparkles,
  TrendingUp,
} from "@lucide/vue";
import type { CampaignState, PlayerState } from "~/utils/playerState";
import { sectionLinks } from "~/utils/viewData";

const route = useRoute();
const { t } = useI18n();
const contentText = useContentText();
const typeFilter = ref("all");
const [
  { data: state, error: playerError, pending: playerPending },
  { data: campaign, error: campaignError, pending: campaignPending },
] = await Promise.all([
  useFetch<PlayerState>("/api/player"),
  useFetch<CampaignState>("/api/campaign"),
]);

const pending = computed(() => playerPending.value || campaignPending.value);
const error = computed(() => playerError.value || campaignError.value);
const filteredItems = computed(() =>
  (state.value?.inventory ?? []).filter(
    (item) => typeFilter.value === "all" || item.type === typeFilter.value,
  ),
);
const typeFilters = computed(() =>
  [
    { value: "all", labelKey: "common.all" },
    { value: "ring", labelKey: "common.rings" },
    { value: "gem", labelKey: "common.gems" },
    { value: "monster", labelKey: "common.monsters" },
    { value: "spell", labelKey: "common.spells" },
  ].map((filter) => ({
    ...filter,
    count:
      filter.value === "all"
        ? (state.value?.inventory.length ?? 0)
        : (state.value?.inventory.filter((item) => item.type === filter.value).length ?? 0),
  })),
);
const highestItemLevel = computed(() =>
  Math.max(0, ...(state.value?.inventory.map((item) => item.level) ?? [])),
);
const averageQuality = computed(() => {
  const items = state.value?.inventory ?? [];
  return items.length === 0
    ? 0
    : Math.round(items.reduce((total, item) => total + item.quality, 0) / items.length);
});

function itemName(type: string, definitionId: string, fallback: string): string {
  return contentText(`${type}.${definitionId}.name`, fallback);
}
</script>
