<template>
  <main class="shell">
    <nav class="section-nav" aria-label="Forge navigation">
      <NuxtLink
        v-for="link in sectionLinks.forge"
        :key="link.to"
        :class="{ active: route.path === link.to }"
        :to="link.to"
      >
        {{ link.label }}
      </NuxtLink>
    </nav>

    <header class="view-header">
      <div class="view-title">
        <span class="eyebrow">Forge</span>
        <h1>Quality</h1>
        <p class="muted">Spend credits to improve owned item quality by fixed steps.</p>
      </div>
      <p v-if="qualityState" class="status-note">Credits: {{ qualityState.player.credits }}</p>
    </header>

    <p v-if="pending" class="panel">Loading quality state...</p>
    <p v-else-if="error" class="panel">Unable to load quality state.</p>

    <template v-else-if="qualityState">
      <p v-if="feedback" class="feedback">{{ feedback }}</p>
      <p v-if="actionError" class="status-note">{{ actionError }}</p>

      <section class="detail-layout">
        <section class="split-layout quality-layout">
          <section class="panel">
          <div class="card-heading">
            <div>
              <h2>Improvement Detail</h2>
              <p class="muted">
                Quality increases by {{ qualityState.qualityStep }} points, up to 100.
              </p>
            </div>
            <NuxtLink class="button-link" to="/forge/craft">Craft Items</NuxtLink>
          </div>

          <label>
            <span class="field-label">Owned item</span>
            <select v-model="selectedItemId">
              <option value="">Select an item</option>
              <option v-for="item in qualityState.items" :key="item.id" :value="item.id">
                {{ item.label }} - quality {{ item.quality }}
              </option>
            </select>
          </label>

          <p v-if="qualityState.items.length === 0" class="status-note">
            Craft an item before improving quality.
          </p>

          <article
            v-if="selectedItem"
            :class="['card', 'item-card', `rarity-border-${selectedItem.rarity}`]"
          >
            <ItemArtwork :definition-id="selectedItem.definitionId" :kind="selectedItem.type" />
            <div class="item-card-body">
              <div class="card-heading">
                <h3>{{ selectedItem.label }}</h3>
                <span :class="['pill', `element-${selectedItem.element}`]">
                  {{ selectedItem.element }}
                </span>
              </div>
              <dl class="summary-grid">
                <div class="stat">
                  <dt>Type</dt>
                  <dd>{{ selectedItem.type }}</dd>
                </div>
                <div class="stat">
                  <dt>Level</dt>
                  <dd>{{ selectedItem.level }}</dd>
                </div>
                <div class="stat">
                  <dt>Quality</dt>
                  <dd>{{ selectedItem.quality }} -> {{ selectedItem.nextQuality }}</dd>
                </div>
                <div class="stat">
                  <dt>Cost</dt>
                  <dd>{{ selectedItem.cost ?? "max" }}</dd>
                </div>
              </dl>

              <div class="quality-stat-list">
                <article v-for="stat in selectedItem.stats" :key="stat.label" class="quality-stat">
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

              <button :disabled="!selectedItem.canImprove || updating" @click="improveSelectedItem">
                Improve Quality
              </button>
              <small v-if="selectedItem.cost === null"
                >This item is already at maximum quality.</small
              >
              <small v-else-if="!selectedItem.canImprove">Not enough credits.</small>
              <code>{{ selectedItem.id }}</code>
            </div>
          </article>
          </section>

          <section class="panel">
          <h2>Owned Items</h2>
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

          <p v-if="filteredItems.length === 0" class="muted">No items match these filters.</p>

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
                  <h3>{{ item.label }}</h3>
                  <span :class="['pill', `element-${item.element}`]">{{ item.element }}</span>
                </div>
                <p class="muted">
                  {{ item.type }} - quality {{ item.quality }} - cost {{ item.cost ?? "max" }}
                </p>
                <button
                  class="secondary-button"
                  :disabled="updating"
                  @click="selectedItemId = item.id"
                >
                  Select
                </button>
              </div>
            </article>
          </div>
          </section>
        </section>

        <ItemDetailPanel :item="selectedItem" title="Quality Detail" />
      </section>
    </template>
  </main>
</template>

<script setup lang="ts">
import type { QualityState } from "~/utils/playerState";
import { sectionLinks } from "~/utils/viewData";

const route = useRoute();
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
    feedback.value = "Item quality improved.";
    await refresh();
  } catch (error_) {
    actionError.value = error_ instanceof Error ? error_.message : "Quality update failed.";
  } finally {
    updating.value = false;
  }
}
</script>
