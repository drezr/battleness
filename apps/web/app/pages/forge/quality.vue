<template>
  <main class="shell forge-quality-page">
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

    <header class="view-header forge-view-header">
      <div class="view-title">
        <span class="eyebrow">{{ t("forge.section") }}</span>
        <h1>{{ t("forge.quality.title") }}</h1>
        <p class="muted">{{ t("forge.quality.description") }}</p>
      </div>
      <span v-if="qualityState" class="forge-credit-balance"
        ><Coins :size="17" aria-hidden="true" />{{
          t("common.creditCount", { count: qualityState.player.credits })
        }}</span
      >
    </header>

    <p v-if="pending" class="panel">{{ t("forge.quality.loading") }}</p>
    <p v-else-if="error" class="panel">{{ t("forge.quality.loadError") }}</p>

    <template v-else-if="qualityState">
      <p v-if="feedback" class="feedback">{{ feedback }}</p>
      <p v-if="actionError" class="status-note">{{ actionError }}</p>

      <section class="detail-layout forge-detail-layout">
        <div class="stack forge-main-workspace">
          <section class="quality-workspace">
            <aside class="quality-item-library">
              <div class="section-heading-row">
                <div>
                  <span class="eyebrow">{{ t("forge.quality.collection") }}</span>
                  <h2>{{ t("forge.quality.ownedItems") }}</h2>
                </div>
                <span class="pill muted-pill">{{ filteredItems.length }}</span>
              </div>
              <div class="quality-filters">
                <label
                  ><span class="field-label">{{ t("common.type") }}</span
                  ><select v-model="typeFilter">
                    <option value="all">{{ t("common.all") }}</option>
                    <option value="ring">{{ t("common.rings") }}</option>
                    <option value="gem">{{ t("common.gems") }}</option>
                    <option value="monster">{{ t("common.monsters") }}</option>
                    <option value="spell">{{ t("common.spells") }}</option>
                  </select></label
                >
                <label
                  ><span class="field-label">{{ t("common.element") }}</span
                  ><select v-model="elementFilter">
                    <option value="all">{{ t("common.all") }}</option>
                    <option value="electric">{{ t("element.electric") }}</option>
                    <option value="fire">{{ t("element.fire") }}</option>
                    <option value="ice">{{ t("element.ice") }}</option>
                  </select></label
                >
              </div>
              <div v-if="filteredItems.length === 0" class="forge-empty-state">
                <PackageOpen :size="25" />
                <p>{{ t("forge.quality.noMatches") }}</p>
              </div>
              <div v-else class="quality-item-list">
                <button
                  v-for="item in filteredItems"
                  :key="item.id"
                  :class="[
                    `rarity-border-${item.rarity}`,
                    { active: selectedItem?.id === item.id, maximum: item.quality >= 100 },
                  ]"
                  type="button"
                  @click="selectedItemId = item.id"
                >
                  <ItemArtwork :definition-id="item.definitionId" :kind="item.type" />
                  <span
                    ><strong>{{ itemName(item) }}</strong
                    ><small
                      >{{ t(`itemType.${item.type}`) }} · {{ t("common.level") }}
                      {{ item.level }}</small
                    ></span
                  >
                  <span class="quality-list-value"
                    ><small>{{ t("common.quality") }}</small
                    ><strong>{{ item.quality }}</strong></span
                  >
                </button>
              </div>
            </aside>

            <section class="quality-station">
              <div class="quality-station-heading">
                <span class="quality-station-icon"><Sparkles :size="24" aria-hidden="true" /></span>
                <div>
                  <span class="eyebrow">{{ t("forge.quality.improvementStation") }}</span>
                  <h2>{{ t("forge.quality.improvementDetail") }}</h2>
                  <p>
                    {{ t("forge.quality.stepDescription", { step: qualityState.qualityStep }) }}
                  </p>
                </div>
              </div>

              <div v-if="!selectedItem" class="forge-empty-state">
                <CircleDashed :size="26" />
                <p>{{ t("forge.quality.craftFirst") }}</p>
                <NuxtLink class="text-link" to="/forge/craft">{{ t("forge.craftItems") }}</NuxtLink>
              </div>
              <template v-else>
                <div class="quality-selected-item">
                  <div :class="['quality-item-art', `rarity-border-${selectedItem.rarity}`]">
                    <ItemArtwork
                      :definition-id="selectedItem.definitionId"
                      :kind="selectedItem.type"
                    />
                  </div>
                  <div>
                    <div class="card-heading">
                      <div>
                        <span class="eyebrow">{{ t(`itemType.${selectedItem.type}`) }}</span>
                        <h3>{{ itemName(selectedItem) }}</h3>
                      </div>
                      <span :class="['pill', `element-${selectedItem.element}`]">{{
                        t(`element.${selectedItem.element}`)
                      }}</span>
                    </div>
                    <dl>
                      <div>
                        <dt>{{ t("common.level") }}</dt>
                        <dd>{{ selectedItem.level }}</dd>
                      </div>
                      <div>
                        <dt>{{ t("common.quality") }}</dt>
                        <dd>{{ selectedItem.quality }}</dd>
                      </div>
                      <div>
                        <dt>{{ t("common.cost") }}</dt>
                        <dd>{{ selectedItem.cost ?? t("common.maximum") }}</dd>
                      </div>
                    </dl>
                  </div>
                </div>

                <div class="quality-progress-block">
                  <div>
                    <span>{{ t("forge.quality.currentQuality") }}</span
                    ><strong>{{ selectedItem.quality }} / 100</strong>
                  </div>
                  <progress :value="selectedItem.quality" max="100">
                    {{ selectedItem.quality }}%
                  </progress>
                  <div class="quality-next-marker">
                    <ArrowRight :size="15" /><span>{{ t("forge.quality.nextQuality") }}</span
                    ><strong>{{ selectedItem.nextQuality }}</strong>
                  </div>
                </div>

                <div class="quality-comparison">
                  <div class="quality-comparison-heading">
                    <span>{{ t("forge.quality.statChanges") }}</span
                    ><small>{{ t("forge.quality.previewHint") }}</small>
                  </div>
                  <div
                    v-for="stat in selectedItem.stats"
                    :key="stat.label"
                    class="quality-comparison-row"
                  >
                    <span>{{ stat.label }}</span
                    ><strong>{{ stat.current }}</strong
                    ><ArrowRight :size="15" aria-hidden="true" /><strong
                      :class="{ positive: stat.next > stat.current }"
                      >{{ stat.next }}</strong
                    ><span v-if="stat.next > stat.current" class="quality-gain"
                      >+{{ stat.next - stat.current }}</span
                    >
                  </div>
                </div>

                <div class="quality-action-bar">
                  <div>
                    <small>{{ t("forge.quality.upgradeCost") }}</small>
                    <strong v-if="selectedItem.cost !== null"
                      ><Coins :size="16" />{{ selectedItem.cost }}</strong
                    >
                    <strong v-else>{{ t("common.maximum") }}</strong>
                  </div>
                  <button
                    :disabled="!selectedItem.canImprove || updating"
                    type="button"
                    @click="improveSelectedItem"
                  >
                    <Sparkles :size="17" />{{ t("forge.quality.improve") }}
                  </button>
                </div>
                <p v-if="selectedItem.cost === null" class="quality-status maximum">
                  <BadgeCheck :size="16" />{{ t("forge.quality.maximum") }}
                </p>
                <p v-else-if="!selectedItem.canImprove" class="quality-status blocked">
                  <AlertTriangle :size="16" />{{ t("forge.notEnoughCredits") }}
                </p>
              </template>
            </section>
          </section>
        </div>
      </section>
    </template>
  </main>
</template>

<script setup lang="ts">
import {
  AlertTriangle,
  ArrowRight,
  BadgeCheck,
  CircleDashed,
  Coins,
  PackageOpen,
  Sparkles,
} from "@lucide/vue";
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
  (qualityState.value?.items ?? []).filter(
    (item) =>
      (typeFilter.value === "all" || item.type === typeFilter.value) &&
      (elementFilter.value === "all" || item.element === elementFilter.value),
  ),
);
function itemName(item: { type: string; definitionId: string; label: string }): string {
  return contentText(`${item.type}.${item.definitionId}.name`, item.label);
}
watchEffect(() => {
  if (!selectedItemId.value && qualityState.value?.items[0])
    selectedItemId.value = qualityState.value.items[0].id;
  if (selectedItemId.value && !filteredItems.value.some((item) => item.id === selectedItemId.value))
    selectedItemId.value = filteredItems.value[0]?.id ?? "";
});

async function improveSelectedItem() {
  if (!selectedItem.value) return;
  feedback.value = "";
  actionError.value = "";
  updating.value = true;
  try {
    qualityState.value = await $fetch<QualityState>("/api/forge/quality", {
      method: "POST",
      body: { action: "improveQuality", itemId: selectedItem.value.id },
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
