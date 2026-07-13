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
        <h1>Items</h1>
        <p class="muted">Owned rings, gems, monsters, and spells from the local SQLite store.</p>
      </div>
    </header>

    <p v-if="pending" class="panel">Loading inventory...</p>
    <p v-else-if="error" class="panel">Unable to load inventory.</p>

    <template v-else-if="state">
      <div class="filter-bar">
        <label>
          <span class="field-label">Type</span>
          <select v-model="typeFilter">
            <option value="all">All</option>
            <option value="ring">Rings</option>
            <option value="gem">Gems</option>
            <option value="monster">Monsters</option>
            <option value="spell">Spells</option>
          </select>
        </label>
        <label>
          <span class="field-label">Element</span>
          <select v-model="elementFilter">
            <option value="all">All</option>
            <option value="electric">Electric</option>
            <option value="fire">Fire</option>
            <option value="ice">Ice</option>
          </select>
        </label>
      </div>

      <section class="detail-layout">
        <div>
          <p v-if="filteredItems.length === 0" class="panel">
            No items match these filters. Craft items from the forge to populate this view.
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
                  <h3>{{ item.label }}</h3>
                  <span :class="['pill', `element-${item.element}`]">{{ item.element }}</span>
                </div>
                <dl class="summary-grid">
                  <div class="stat">
                    <dt>Type</dt>
                    <dd>{{ item.type }}</dd>
                  </div>
                  <div class="stat">
                    <dt>Quality</dt>
                    <dd>{{ item.quality }}</dd>
                  </div>
                  <div class="stat">
                    <dt>XP</dt>
                    <dd>{{ item.experience }}</dd>
                  </div>
                  <div v-if="item.socketCount" class="stat">
                    <dt>Sockets</dt>
                    <dd>{{ item.socketCount }}</dd>
                  </div>
                </dl>
                <div class="control-row">
                  <button class="secondary-button" @click="selectedDetailItemId = item.id">
                    Inspect
                  </button>
                </div>
                <code>{{ item.id }}</code>
              </div>
            </article>
          </section>
        </div>

        <ItemDetailPanel
          :item="selectedDetailItem"
          title="Item Detail"
          @clear="selectedDetailItemId = ''"
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

watchEffect(() => {
  if (
    selectedDetailItemId.value &&
    !filteredItems.value.some((item) => item.id === selectedDetailItemId.value)
  ) {
    selectedDetailItemId.value = "";
  }
});
</script>
