<template>
  <main class="shell">
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

    <header class="view-header">
      <div class="view-title">
        <span class="eyebrow">{{ t("profile.section") }}</span>
        <h1>{{ t("progression.title") }}</h1>
        <p class="muted">{{ t("progression.description") }}</p>
      </div>
    </header>

    <p v-if="pending" class="panel">{{ t("progression.loading") }}</p>
    <p v-else-if="error || !state" class="panel">{{ t("progression.loadError") }}</p>

    <template v-else>
      <section class="progression-hero panel">
        <div class="progression-level-badge">
          <span>{{ t("common.heroLevel") }}</span>
          <strong>{{ state.player.level }}</strong>
        </div>
        <div class="stack">
          <div class="card-heading">
            <div>
              <h2>{{ state.player.displayName }}</h2>
              <p class="muted">
                {{ t("progression.totalXp", { experience: state.player.experience }) }}
              </p>
            </div>
            <span class="pill muted-pill">{{
              t("progression.health", { health: state.player.maxHealth })
            }}</span>
          </div>
          <ExperienceProgress
            :progress="state.player.progression"
            :label="t('progression.heroExperience')"
          />
        </div>
      </section>

      <section class="metric-grid progression-metrics">
        <article class="card">
          <span class="eyebrow">{{ t("common.campaign") }}</span>
          <strong
            >{{ campaign?.progress.completedCount ?? 0 }} /
            {{ campaign?.progress.totalCount ?? 0 }}</strong
          >
          <small>{{ t("progression.campaignCleared") }}</small>
        </article>
        <article class="card">
          <span class="eyebrow">{{ t("common.items") }}</span>
          <strong>{{ state.inventory.length }}</strong>
          <small>{{ t("progression.ownedInstances") }}</small>
        </article>
        <article class="card">
          <span class="eyebrow">{{ t("progression.highestItem") }}</span>
          <strong>{{ t("common.level") }} {{ highestItemLevel }}</strong>
          <small>{{ t("progression.collectionMaximum") }}</small>
        </article>
        <article class="card">
          <span class="eyebrow">{{ t("progression.averageQuality") }}</span>
          <strong>{{ averageQuality }}</strong>
          <small>{{ t("progression.outOf", { maximum: 100 }) }}</small>
        </article>
      </section>

      <section class="panel progression-formula">
        <div>
          <span class="eyebrow">{{ t("progression.formulaSection") }}</span>
          <h2>{{ t("progression.formulaTitle") }}</h2>
        </div>
        <p class="muted">{{ t("progression.formulaDescription") }}</p>
        <code>{{ t("progression.formulaExpression") }}</code>
      </section>

      <section class="panel">
        <div class="card-heading progression-list-heading">
          <div>
            <span class="eyebrow">{{ t("progression.collection") }}</span>
            <h2>{{ t("progression.itemProgress") }}</h2>
          </div>
          <label>
            <span class="field-label">{{ t("common.type") }}</span>
            <select v-model="typeFilter">
              <option value="all">{{ t("common.all") }}</option>
              <option value="ring">{{ t("common.rings") }}</option>
              <option value="gem">{{ t("common.gems") }}</option>
              <option value="monster">{{ t("common.monsters") }}</option>
              <option value="spell">{{ t("common.spells") }}</option>
            </select>
          </label>
        </div>

        <p v-if="filteredItems.length === 0" class="muted">
          {{ t("progression.noItems") }}
        </p>
        <div v-else class="progression-item-list">
          <article v-for="item in filteredItems" :key="item.id" class="progression-item-row">
            <ItemArtwork :definition-id="item.definitionId" :kind="item.type" />
            <div>
              <div class="card-heading">
                <strong>{{ itemName(item.type, item.definitionId, item.label) }}</strong>
                <span>{{ t("common.level") }} {{ item.level }}</span>
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
            <div class="progression-item-bonus">
              <strong class="positive">+{{ item.bonusPercent }}%</strong>
              <small>{{ t("common.quality") }} {{ item.quality }}</small>
            </div>
          </article>
        </div>
      </section>
    </template>
  </main>
</template>

<script setup lang="ts">
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
