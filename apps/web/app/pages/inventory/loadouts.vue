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
        <h1>Loadouts</h1>
        <p class="muted">
          Save reusable ring sets and choose the active loadout for future battles.
        </p>
      </div>
    </header>

    <p v-if="pending" class="panel">Loading loadouts...</p>
    <p v-else-if="error" class="panel">Unable to load loadouts.</p>

    <template v-else-if="loadouts">
      <section class="detail-layout">
        <div class="stack">
          <section class="panel">
            <div class="card-heading">
              <div>
                <h2>Current Equipment</h2>
                <p class="muted">Save the currently equipped rings as a persistent loadout.</p>
              </div>
              <span class="pill muted-pill">
                {{ loadouts.currentEquipment.rings.length }} / {{ loadouts.maxLoadoutRings }}
              </span>
            </div>

            <section class="metric-grid equipment-metrics">
              <article class="card">
                <span class="eyebrow">Speed</span>
                <strong>{{ loadouts.currentEquipment.summary.totalSpeed }}</strong>
              </article>
              <article class="card">
                <span class="eyebrow">Damage</span>
                <strong>{{ loadouts.currentEquipment.summary.totalDamage }}</strong>
              </article>
              <article class="card">
                <span class="eyebrow">Avg Energy</span>
                <strong>{{ loadouts.currentEquipment.summary.averageEnergyCost }}</strong>
              </article>
              <article class="card">
                <span class="eyebrow">Avg Cooldown</span>
                <strong>{{ loadouts.currentEquipment.summary.averageCooldown }}</strong>
              </article>
            </section>

            <div v-if="loadouts.currentEquipment.rings.length > 0" class="loadout-ring-strip">
              <article
                v-for="ring in loadouts.currentEquipment.rings"
                :key="ring.id"
                :class="[
                  'mini-ring-card',
                  `rarity-border-${ring.rarity}`,
                  { selected: selectedDetailRing?.id === ring.id },
                ]"
              >
                <ItemArtwork :definition-id="ring.definitionId" kind="ring" />
                <div>
                  <strong>{{ (ring.slotIndex ?? 0) + 1 }}. {{ ring.label }}</strong>
                  <small>
                    {{ ring.element }} - damage {{ ring.damage }} - cooldown
                    {{ ring.cooldown }}
                  </small>
                  <button class="secondary-button" @click="selectedDetailRingId = ring.id">
                    Inspect
                  </button>
                </div>
              </article>
            </div>

            <form class="toolbar" @submit.prevent="saveFromEquipped">
              <label>
                <span class="field-label">Loadout name</span>
                <input v-model="loadoutName" placeholder="Starter fire set" />
              </label>
              <button :disabled="updating || loadouts.currentEquipment.rings.length === 0">
                Save Current
              </button>
            </form>
          </section>

          <p v-if="feedback" class="feedback">{{ feedback }}</p>
          <p v-if="actionError" class="status-note">{{ actionError }}</p>

          <section class="panel">
            <h2>Saved Loadouts</h2>
            <p v-if="loadouts.loadouts.length === 0" class="muted">No saved loadouts yet.</p>

            <div v-else class="loadout-list">
              <article
                v-for="loadout in loadouts.loadouts"
                :key="loadout.id"
                :class="['card', 'loadout-card', { active: loadout.active }]"
              >
                <div class="card-heading">
                  <div>
                    <h3>{{ loadout.name }}</h3>
                    <p class="muted">{{ loadout.ringCount }} rings</p>
                  </div>
                  <span :class="['pill', loadout.active ? 'element-electric' : 'muted-pill']">
                    {{ loadout.active ? "active" : "saved" }}
                  </span>
                </div>

                <dl class="summary-grid">
                  <div class="stat">
                    <dt>Speed</dt>
                    <dd>{{ loadout.summary.totalSpeed }}</dd>
                  </div>
                  <div class="stat">
                    <dt>Damage</dt>
                    <dd>{{ loadout.summary.totalDamage }}</dd>
                  </div>
                  <div class="stat">
                    <dt>Energy</dt>
                    <dd>{{ loadout.summary.averageEnergyCost }}</dd>
                  </div>
                  <div class="stat">
                    <dt>Cooldown</dt>
                    <dd>{{ loadout.summary.averageCooldown }}</dd>
                  </div>
                </dl>

                <div class="loadout-ring-strip">
                  <article
                    v-for="ring in loadout.rings"
                    :key="ring.id"
                    :class="[
                      'mini-ring-card',
                      `rarity-border-${ring.rarity}`,
                      { selected: selectedDetailRing?.id === ring.id },
                    ]"
                  >
                    <ItemArtwork :definition-id="ring.definitionId" kind="ring" />
                    <div>
                      <strong>{{ (ring.slotIndex ?? 0) + 1 }}. {{ ring.label }}</strong>
                      <small>
                        {{ ring.element }} - damage {{ ring.damage }} - cooldown
                        {{ ring.cooldown }}
                      </small>
                      <button class="secondary-button" @click="selectedDetailRingId = ring.id">
                        Inspect
                      </button>
                    </div>
                  </article>
                </div>

                <div class="control-row">
                  <button v-if="!loadout.active" :disabled="updating" @click="activate(loadout.id)">
                    Activate
                  </button>
                  <button
                    class="secondary-button"
                    :disabled="updating"
                    @click="deleteLoadout(loadout.id)"
                  >
                    Delete
                  </button>
                </div>
                <code>{{ loadout.id }}</code>
              </article>
            </div>
          </section>
        </div>

        <ItemDetailPanel
          :item="selectedDetailRing"
          title="Loadout Ring Detail"
          @clear="selectedDetailRingId = ''"
        />
      </section>
    </template>
  </main>
</template>

<script setup lang="ts">
import type { LoadoutState } from "~/utils/playerState";
import { sectionLinks } from "~/utils/viewData";

const route = useRoute();
const feedback = ref("");
const actionError = ref("");
const updating = ref(false);
const loadoutName = ref("Starter Loadout");
const selectedDetailRingId = ref("");
const {
  data: loadouts,
  error,
  pending,
  refresh,
} = await useFetch<LoadoutState>("/api/inventory/loadouts");

const selectedDetailRing = computed(() => {
  const currentRings = loadouts.value?.currentEquipment.rings ?? [];
  const savedRings = (loadouts.value?.loadouts ?? []).flatMap((loadout) => loadout.rings);

  return (
    [...currentRings, ...savedRings].find((ring) => ring.id === selectedDetailRingId.value) ?? null
  );
});

async function saveFromEquipped() {
  await updateLoadouts({
    action: "saveFromEquipped",
    name: loadoutName.value,
  });
  feedback.value = "Loadout saved.";
}

async function activate(loadoutId: string) {
  await updateLoadouts({
    action: "activate",
    loadoutId,
  });
  feedback.value = "Loadout activated.";
}

async function deleteLoadout(loadoutId: string) {
  await updateLoadouts({
    action: "delete",
    loadoutId,
  });
  feedback.value = "Loadout deleted.";
}

async function updateLoadouts(body: { action: string; loadoutId?: string; name?: string }) {
  feedback.value = "";
  actionError.value = "";
  updating.value = true;

  try {
    loadouts.value = await $fetch<LoadoutState>("/api/inventory/loadouts", {
      method: "POST",
      body,
    });
    await refresh();
  } catch (error_) {
    actionError.value = error_ instanceof Error ? error_.message : "Loadout update failed.";
  } finally {
    updating.value = false;
  }
}
</script>
