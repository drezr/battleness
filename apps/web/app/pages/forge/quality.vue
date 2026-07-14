<template>
  <main class="shell">
    <nav class="section-nav" :aria-label="t('accessibility.forgeNavigation')">
      <NuxtLink
        v-for="link in sectionLinks.forge"
        :key="link.to"
        :class="{ active: route.path === link.to }"
        :to="link.to"
      >
        {{ $t(link.labelKey) }}
      </NuxtLink>
    </nav>

    <header class="view-header">
      <div class="view-title">
        <span class="eyebrow">{{ t("forge.section") }}</span>
        <h1>{{ t("forge.quality.title") }}</h1>
        <p class="muted">{{ t("forge.quality.description") }}</p>
      </div>
      <p v-if="qualityState" class="status-note">
        {{ t("common.creditCount", { count: qualityState.player.credits }) }}
      </p>
    </header>

    <p v-if="pending" class="panel">{{ t("forge.quality.loading") }}</p>
    <p v-else-if="error" class="panel">{{ t("forge.quality.loadError") }}</p>

    <template v-else-if="qualityState">
      <p v-if="feedback" class="feedback">{{ feedback }}</p>
      <p v-if="actionError" class="status-note">{{ actionError }}</p>

      <section class="detail-layout">
        <section class="split-layout quality-layout">
          <section class="panel">
            <div class="card-heading">
              <div>
                <h2>{{ t("forge.quality.improvementDetail") }}</h2>
                <p class="muted">
                  {{ t("forge.quality.stepDescription", { step: qualityState.qualityStep }) }}
                </p>
              </div>
              <NuxtLink class="button-link" to="/forge/craft">{{ t("forge.craftItems") }}</NuxtLink>
            </div>

            <label>
              <span class="field-label">{{ t("forge.quality.ownedItem") }}</span>
              <select v-model="selectedItemId">
                <option value="">{{ t("forge.quality.selectItem") }}</option>
                <option v-for="item in qualityState.items" :key="item.id" :value="item.id">
                  {{ itemName(item) }} - {{ t("common.quality") }} {{ item.quality }}
                </option>
              </select>
            </label>

            <p v-if="qualityState.items.length === 0" class="status-note">
              {{ t("forge.quality.craftFirst") }}
            </p>

            <article
              v-if="selectedItem"
              :class="['card', 'item-card', `rarity-border-${selectedItem.rarity}`]"
            >
              <ItemArtwork :definition-id="selectedItem.definitionId" :kind="selectedItem.type" />
              <div class="item-card-body">
                <div class="card-heading">
                  <h3>{{ itemName(selectedItem) }}</h3>
                  <span :class="['pill', `element-${selectedItem.element}`]">
                    {{ t(`element.${selectedItem.element}`) }}
                  </span>
                </div>
                <dl class="summary-grid">
                  <div class="stat">
                    <dt>{{ t("common.type") }}</dt>
                    <dd>{{ t(`itemType.${selectedItem.type}`) }}</dd>
                  </div>
                  <div class="stat">
                    <dt>{{ t("common.level") }}</dt>
                    <dd>{{ selectedItem.level }}</dd>
                  </div>
                  <div class="stat">
                    <dt>{{ t("common.quality") }}</dt>
                    <dd>{{ selectedItem.quality }} -> {{ selectedItem.nextQuality }}</dd>
                  </div>
                  <div class="stat">
                    <dt>{{ t("common.cost") }}</dt>
                    <dd>{{ selectedItem.cost ?? t("common.maximum") }}</dd>
                  </div>
                </dl>

                <div class="quality-stat-list">
                  <article
                    v-for="stat in selectedItem.stats"
                    :key="stat.label"
                    class="quality-stat"
                  >
                    <span>{{ stat.label }}</span>
                    <strong>
                      {{ stat.current }}
                      <template v-if="stat.next > stat.current">
                        -> <span class="positive">{{ stat.next }}</span>
                      </template>
                      <template v-else>-> {{ stat.next }}</template>
                    </strong>
                  </article>
                </div>

                <button
                  :disabled="!selectedItem.canImprove || updating"
                  @click="improveSelectedItem"
                >
                  {{ t("forge.quality.improve") }}
                </button>
                <small v-if="selectedItem.cost === null">{{ t("forge.quality.maximum") }}</small>
                <small v-else-if="!selectedItem.canImprove">{{
                  t("forge.notEnoughCredits")
                }}</small>
                <code>{{ selectedItem.id }}</code>
              </div>
            </article>
          </section>

          <section class="panel">
            <h2>{{ t("forge.quality.ownedItems") }}</h2>
            <div class="filter-bar">
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
              <label>
                <span class="field-label">{{ t("common.element") }}</span>
                <select v-model="elementFilter">
                  <option value="all">{{ t("common.all") }}</option>
                  <option value="electric">{{ t("element.electric") }}</option>
                  <option value="fire">{{ t("element.fire") }}</option>
                  <option value="ice">{{ t("element.ice") }}</option>
                </select>
              </label>
            </div>

            <p v-if="filteredItems.length === 0" class="muted">
              {{ t("forge.quality.noMatches") }}
            </p>

            <div v-else class="item-grid">
              <article
                v-for="item in filteredItems"
                :key="item.id"
                :class="[
                  'card',
                  'item-card',
                  `rarity-border-${item.rarity}`,
                  {
                    'muted-card': item.quality >= 100,
                    selected: selectedItem?.id === item.id,
                  },
                ]"
              >
                <ItemArtwork :definition-id="item.definitionId" :kind="item.type" />
                <div class="item-card-body">
                  <div class="card-heading">
                    <h3>{{ itemName(item) }}</h3>
                    <span :class="['pill', `element-${item.element}`]">{{
                      t(`element.${item.element}`)
                    }}</span>
                  </div>
                  <p class="muted">
                    {{
                      t("forge.quality.itemSummary", {
                        type: t(`itemType.${item.type}`),
                        quality: item.quality,
                        cost: item.cost ?? t("common.maximum"),
                      })
                    }}
                  </p>
                  <button
                    class="secondary-button"
                    :disabled="updating"
                    @click="selectedItemId = item.id"
                  >
                    {{ t("common.select") }}
                  </button>
                </div>
              </article>
            </div>
          </section>
        </section>

        <ItemDetailPanel :item="selectedItem" :title="t('forge.quality.detail')" />
      </section>
    </template>
  </main>
</template>

<script setup lang="ts">
import type { QualityState } from "~/utils/playerState";
import { sectionLinks } from "~/utils/viewData";

const route = useRoute();
const { t } = useI18n();
const contentText = useContentText();
const feedback = ref("");
const actionError = ref("");
const updating = ref(false);
const selectedItemId = ref("");
const typeFilter = ref("all");
const elementFilter = ref("all");
const {
  data: qualityState,
  error,
  pending,
  refresh,
} = await useFetch<QualityState>("/api/forge/quality");

const selectedItem = computed(
  () => qualityState.value?.items.find((item) => item.id === selectedItemId.value) ?? null,
);
const filteredItems = computed(() =>
  (qualityState.value?.items ?? []).filter((item) => {
    const matchesType = typeFilter.value === "all" || item.type === typeFilter.value;
    const matchesElement = elementFilter.value === "all" || item.element === elementFilter.value;
    return matchesType && matchesElement;
  }),
);

function itemName(item: { type: string; definitionId: string; label: string }): string {
  return contentText(`${item.type}.${item.definitionId}.name`, item.label);
}

watchEffect(() => {
  if (!selectedItemId.value && qualityState.value?.items[0]) {
    selectedItemId.value = qualityState.value.items[0].id;
  }
});

async function improveSelectedItem() {
  if (!selectedItem.value) {
    return;
  }

  feedback.value = "";
  actionError.value = "";
  updating.value = true;

  try {
    qualityState.value = await $fetch<QualityState>("/api/forge/quality", {
      method: "POST",
      body: {
        action: "improveQuality",
        itemId: selectedItem.value.id,
      },
    });
    feedback.value = t("forge.quality.success");
    await refresh();
  } catch (error_) {
    actionError.value = error_ instanceof Error ? error_.message : t("forge.quality.actionError");
  } finally {
    updating.value = false;
  }
}
</script>
