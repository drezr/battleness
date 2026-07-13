<template>
  <main class="shell">
    <nav class="section-nav" aria-label="Inventory navigation">
      <NuxtLink
        v-for="link in sectionLinks.inventory"
        :key="link.to"
        :class="{ active: route.path === link.to }"
        :to="link.to"
      >
        {{ link.label }}
      </NuxtLink>
    </nav>

    <header class="view-header">
      <div class="view-title">
        <span class="eyebrow">Inventory</span>
        <h1>Materials</h1>
        <p class="muted">Material stock grouped by crafting family, rarity, and real-world metadata.</p>
      </div>
    </header>

    <p v-if="pending" class="panel">Loading materials...</p>
    <p v-else-if="error" class="panel">Unable to load materials.</p>

    <template v-else-if="state">
      <div class="filter-bar">
        <label>
          <span class="field-label">Crafting Family</span>
          <select v-model="familyFilter">
            <option value="all">All</option>
            <option value="ring">Ring</option>
            <option value="gem">Gem</option>
            <option value="monster">Monster</option>
            <option value="spell">Spell</option>
          </select>
        </label>
        <label>
          <span class="field-label">Rarity</span>
          <select v-model="rarityFilter">
            <option value="all">All</option>
            <option value="common">Common</option>
            <option value="refined">Refined</option>
            <option value="rare">Rare</option>
            <option value="epic">Epic</option>
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
                <h3>{{ material.label }}</h3>
                <span :class="['pill', `rarity-${material.rarity}`]">{{ material.rarity }}</span>
              </div>
              <p class="muted">
                {{ material.chemicalSymbol ?? material.realWorldType }} -
                {{ material.craftingFamily }}
              </p>
              <strong>{{ material.quantity }}</strong>
              <div class="control-row">
                <button class="secondary-button" @click="selectedMaterialId = material.id">
                  Inspect
                </button>
              </div>
            </div>
          </article>
        </div>

        <ItemDetailPanel
          :item="selectedMaterial"
          title="Material Detail"
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

