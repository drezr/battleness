<template>
  <main class="shell">
    <nav class="section-nav" :aria-label="t('accessibility.inventoryNavigation')">
      <NuxtLink
        v-for="link in sectionLinks.inventory"
        :key="link.to"
        :class="{ active: route.path === link.to }"
        :to="link.to"
      >
        {{ $t(link.labelKey) }}
      </NuxtLink>
    </nav>

    <header class="view-header">
      <div class="view-title">
        <span class="eyebrow">{{ t("inventory.section") }}</span>
        <h1>{{ t("inventory.materials.title") }}</h1>
        <p class="muted">{{ t("inventory.materials.description") }}</p>
      </div>
    </header>

    <p v-if="pending" class="panel">{{ t("inventory.materials.loading") }}</p>
    <p v-else-if="error" class="panel">{{ t("inventory.materials.loadError") }}</p>

    <template v-else-if="state">
      <div class="filter-bar">
        <label>
          <span class="field-label">{{ t("inventory.materials.craftingFamily") }}</span>
          <select v-model="familyFilter">
            <option value="all">{{ t("common.all") }}</option>
            <option value="ring">{{ t("itemType.ring") }}</option>
            <option value="gem">{{ t("itemType.gem") }}</option>
            <option value="monster">{{ t("itemType.monster") }}</option>
            <option value="spell">{{ t("itemType.spell") }}</option>
          </select>
        </label>
        <label>
          <span class="field-label">{{ t("inventory.materials.rarity") }}</span>
          <select v-model="rarityFilter">
            <option value="all">{{ t("common.all") }}</option>
            <option value="common">{{ t("rarity.common") }}</option>
            <option value="refined">{{ t("rarity.refined") }}</option>
            <option value="rare">{{ t("rarity.rare") }}</option>
            <option value="epic">{{ t("rarity.epic") }}</option>
          </select>
        </label>
      </div>

      <section class="detail-layout">
        <div class="card-grid">
          <article
            v-for="material in filteredMaterials"
            :key="material.id"
            :class="[
              'card',
              'item-card',
              'material-card',
              `rarity-border-${material.rarity}`,
              { selected: selectedMaterial?.id === material.id },
            ]"
          >
            <ItemArtwork :definition-id="material.id" kind="material" />
            <div class="item-card-body">
              <div class="card-heading">
                <h3>{{ contentText(`material.${material.id}.name`, material.label) }}</h3>
                <span :class="['pill', `rarity-${material.rarity}`]">{{
                  t(`rarity.${material.rarity}`)
                }}</span>
              </div>
              <p class="muted">
                {{ material.chemicalSymbol ?? material.realWorldType }} -
                {{ t(`itemType.${material.craftingFamily}`) }}
              </p>
              <strong>{{ material.quantity }}</strong>
              <div class="control-row">
                <button class="secondary-button" @click="selectedMaterialId = material.id">
                  {{ t("common.inspect") }}
                </button>
              </div>
            </div>
          </article>
        </div>

        <ItemDetailPanel
          :item="selectedMaterial"
          :title="t('inventory.materials.detail')"
          @clear="selectedMaterialId = ''"
        />
      </section>
    </template>
  </main>
</template>

<script setup lang="ts">
import type { PlayerState } from "~/utils/playerState";
import { sectionLinks } from "~/utils/viewData";

const route = useRoute();
const { t } = useI18n();
const contentText = useContentText();
const { data: state, error, pending } = await useFetch<PlayerState>("/api/player");
const familyFilter = ref("all");
const rarityFilter = ref("all");
const selectedMaterialId = ref("");

const filteredMaterials = computed(() =>
  (state.value?.materials ?? []).filter((material) => {
    const matchesFamily =
      familyFilter.value === "all" || material.craftingFamily === familyFilter.value;
    const matchesRarity = rarityFilter.value === "all" || material.rarity === rarityFilter.value;
    return matchesFamily && matchesRarity;
  }),
);
const selectedMaterial = computed(
  () => state.value?.materials.find((material) => material.id === selectedMaterialId.value) ?? null,
);

watchEffect(() => {
  if (
    selectedMaterialId.value &&
    !filteredMaterials.value.some((material) => material.id === selectedMaterialId.value)
  ) {
    selectedMaterialId.value = "";
  }
});
</script>
