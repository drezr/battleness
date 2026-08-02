<template>
  <main class="shell inventory-items-page">
    <header class="view-header">
      <div class="view-title">
        <SectionBackLink
          to="/inventory"
          :label="t('navigation.backToHub', { section: t('navigation.inventory') })"
        />
        <div class="view-title-heading">
          <h1>{{ t("inventory.items.title") }}</h1>
          <ViewHelpButton
            :title="t('inventory.items.title')"
            :description="t('inventory.items.description')"
          />
        </div>
      </div>
    </header>

    <p v-if="pending" class="panel">{{ t("inventory.items.loading") }}</p>
    <p v-else-if="error" class="panel">{{ t("inventory.items.loadError") }}</p>

    <template v-else-if="state">
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

      <section class="detail-layout">
        <div>
          <p v-if="filteredItems.length === 0" class="panel">
            {{ t("inventory.items.noMatches") }}
          </p>

          <section v-else class="item-grid">
            <article
              v-for="item in filteredItems"
              :key="item.id"
              :class="[
                'card',
                'item-card',
                `rarity-border-${item.rarity}`,
                { selected: selectedDetailItem?.id === item.id },
              ]"
            >
              <ItemArtwork :definition-id="item.definitionId" :kind="item.type" />
              <div class="item-card-body">
                <div class="card-heading">
                  <h3>{{ itemName(item.type, item.definitionId, item.label) }}</h3>
                  <span :class="['pill', `element-${item.element}`]">{{
                    t(`element.${item.element}`)
                  }}</span>
                </div>
                <dl class="summary-grid">
                  <div class="stat">
                    <dt>{{ t("common.type") }}</dt>
                    <dd>{{ t(`itemType.${item.type}`) }}</dd>
                  </div>
                  <div class="stat">
                    <dt>{{ t("common.quality") }}</dt>
                    <dd>{{ item.quality }}</dd>
                  </div>
                  <div class="stat">
                    <dt>{{ t("common.level") }}</dt>
                    <dd>{{ item.level }}</dd>
                  </div>
                  <div v-if="item.socketCount" class="stat">
                    <dt>{{ t("stats.sockets") }}</dt>
                    <dd>{{ item.socketCount }}</dd>
                  </div>
                </dl>
                <ExperienceProgress
                  :progress="item.progression"
                  :label="
                    t('progression.itemExperience', {
                      item: itemName(item.type, item.definitionId, item.label),
                    })
                  "
                />
                <small>{{
                  t("inventory.items.bonusSummary", {
                    quality: item.quality,
                    bonus: item.bonusPercent,
                  })
                }}</small>
                <div class="control-row">
                  <button
                    class="secondary-button"
                    :aria-label="
                      t('common.inspectItem', {
                        item: itemName(item.type, item.definitionId, item.label),
                      })
                    "
                    @click="selectedDetailItemId = item.id"
                  >
                    {{ t("common.inspect") }}
                  </button>
                </div>
                <code>{{ item.id }}</code>
              </div>
            </article>
          </section>
        </div>

        <ItemDetailPanel
          :item="selectedDetailItem"
          :title="t('inventory.items.detail')"
          :manage-to="selectedDetailManageTo"
          @clear="selectedDetailItemId = ''"
        />
      </section>
    </template>
  </main>
</template>

<script setup lang="ts">
import type { PlayerState } from "~/utils/playerState";
const { t } = useI18n();
const contentText = useContentText();
const { data: state, error, pending } = await useFetch<PlayerState>("/api/player");
const typeFilter = ref("all");
const elementFilter = ref("all");
const selectedDetailItemId = ref("");

const filteredItems = computed(() =>
  (state.value?.inventory ?? []).filter((item) => {
    const matchesType = typeFilter.value === "all" || item.type === typeFilter.value;
    const matchesElement = elementFilter.value === "all" || item.element === elementFilter.value;
    return matchesType && matchesElement;
  }),
);
const selectedDetailItem = computed(
  () => state.value?.inventory.find((item) => item.id === selectedDetailItemId.value) ?? null,
);
const selectedDetailManageTo = computed(() => {
  const item = selectedDetailItem.value;
  if (!item) return undefined;
  if (item.type === "ring") return `/forge/socket?ringId=${encodeURIComponent(item.id)}`;
  if (item.type === "gem") return `/forge/enchant?gemId=${encodeURIComponent(item.id)}`;
  if (item.type === "spell" || item.type === "monster") {
    return `/forge/enchant?targetId=${encodeURIComponent(item.id)}`;
  }
  return undefined;
});

function itemName(type: string, definitionId: string, fallback: string): string {
  return contentText(`${type}.${definitionId}.name`, fallback);
}

watchEffect(() => {
  if (
    selectedDetailItemId.value &&
    !filteredItems.value.some((item) => item.id === selectedDetailItemId.value)
  ) {
    selectedDetailItemId.value = "";
  }
});
</script>
