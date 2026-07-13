<template>
  <main class="shell">
    <nav class="section-nav" aria-label="Battle navigation">
      <NuxtLink
        v-for="link in sectionLinks.battle"
        :key="link.to"
        :class="{ active: route.path === link.to }"
        :to="link.to"
      >
        {{ link.label }}
      </NuxtLink>
    </nav>

    <header class="view-header">
      <div class="view-title">
        <span class="eyebrow">Battle</span>
        <h1>Battle Hub</h1>
        <p class="muted">Choose a combat mode and verify that the active loadout is ready.</p>
      </div>
      <p :class="['status-note', activeLoadout ? 'ready-note' : '']">
        {{ activeLoadout ? "Active loadout ready." : "No active loadout selected." }}
      </p>
    </header>

    <p v-if="pending" class="panel">Loading battle readiness...</p>
    <p v-else-if="error" class="panel">Unable to load battle readiness.</p>

    <template v-else-if="loadouts">
      <section class="detail-layout">
        <section class="panel">
          <div class="card-heading">
            <div>
              <h2>Active Loadout</h2>
              <p class="muted">
                This ring set will be used when Game App battles are generated from the database.
              </p>
            </div>
            <NuxtLink class="button-link" to="/inventory/loadouts"> Manage Loadouts </NuxtLink>
          </div>

          <p v-if="!activeLoadout" class="status-note">
            Save and activate a loadout before starting campaign or PvP battles.
          </p>

          <template v-else>
            <div class="active-loadout-heading">
              <div>
                <span class="eyebrow">Selected</span>
                <h3>{{ activeLoadout.name }}</h3>
              </div>
              <span class="pill element-electric">{{ activeLoadout.ringCount }} rings</span>
            </div>

            <section class="metric-grid equipment-metrics">
              <article class="card">
                <span class="eyebrow">Speed</span>
                <strong>{{ activeLoadout.summary.totalSpeed }}</strong>
              </article>
              <article class="card">
                <span class="eyebrow">Damage</span>
                <strong>{{ activeLoadout.summary.totalDamage }}</strong>
              </article>
              <article class="card">
                <span class="eyebrow">Avg Energy</span>
                <strong>{{ activeLoadout.summary.averageEnergyCost }}</strong>
              </article>
              <article class="card">
                <span class="eyebrow">Avg Cooldown</span>
                <strong>{{ activeLoadout.summary.averageCooldown }}</strong>
              </article>
            </section>

            <div class="loadout-ring-strip">
              <article
                v-for="ring in activeLoadout.rings"
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
                    {{ ring.element }} - damage {{ ring.damage }} - energy {{ ring.energyCost }} -
                    cooldown {{ ring.cooldown }}
                  </small>
                  <button class="secondary-button" @click="selectedDetailRingId = ring.id">
                    Inspect
                  </button>
                </div>
              </article>
            </div>
          </template>
        </section>

        <ItemDetailPanel
          :item="selectedDetailRing"
          title="Battle Ring Detail"
          @clear="selectedDetailRingId = ''"
        />
      </section>

      <section class="dashboard-grid">
        <article class="panel">
          <h2>Training Battle</h2>
          <p class="muted">Live server state using the active database loadout.</p>
          <p class="status-note">Opponent: Player Two training fixture.</p>
          <button
            :disabled="!activeLoadout || creatingBattle"
            type="button"
            @click="startTrainingBattle"
          >
            {{ creatingBattle ? "Starting..." : "Start Battle" }}
          </button>
          <p v-if="battleFeedback" class="feedback">{{ battleFeedback }}</p>
        </article>

        <article class="panel">
          <h2>Campaign</h2>
          <p class="muted">Solo battles against game-owned opponents.</p>
          <p class="status-note">Next major gameplay mode.</p>
          <NuxtLink
            :class="['button-link', { disabled: !activeLoadout }]"
            :aria-disabled="!activeLoadout"
            :to="activeLoadout ? '/battle/campaign' : '/inventory/loadouts'"
          >
            {{ activeLoadout ? "Open Campaign" : "Select Loadout" }}
          </NuxtLink>
        </article>

        <article class="panel">
          <h2>PvP</h2>
          <p class="muted">Private, casual, and ranked multiplayer entry points.</p>
          <p class="status-note">Requires authoritative server work.</p>
          <NuxtLink
            :class="['button-link', { disabled: !activeLoadout }]"
            :aria-disabled="!activeLoadout"
            :to="activeLoadout ? '/battle/pvp' : '/inventory/loadouts'"
          >
            {{ activeLoadout ? "Open PvP" : "Select Loadout" }}
          </NuxtLink>
        </article>

        <article class="panel">
          <h2>Battle History</h2>
          <p class="muted">Review completed matches and replay records.</p>
          <p class="status-note">Persistent records and reward claims are available.</p>
          <NuxtLink class="button-link" to="/battle/history"> Open History </NuxtLink>
        </article>

        <article v-if="isDevelopment" class="panel">
          <h2>Development Result Test</h2>
          <p class="muted">
            Generate a verified finished record until campaign and PvP provide live results.
          </p>
          <div class="control-row">
            <button
              :disabled="!activeLoadout || creatingResult"
              type="button"
              @click="createTestResult('win')"
            >
              Test Victory
            </button>
            <button
              class="secondary-button"
              :disabled="!activeLoadout || creatingResult"
              type="button"
              @click="createTestResult('loss')"
            >
              Test Defeat
            </button>
          </div>
          <p v-if="resultFeedback" class="feedback">{{ resultFeedback }}</p>
        </article>
      </section>
    </template>
  </main>
</template>

<script setup lang="ts">
import type { LoadoutState } from "~/utils/playerState";
import { sectionLinks } from "~/utils/viewData";

const route = useRoute();
const { data: loadouts, error, pending } = await useFetch<LoadoutState>("/api/inventory/loadouts");
const selectedDetailRingId = ref("");
const creatingBattle = ref(false);
const creatingResult = ref(false);
const battleFeedback = ref("");
const resultFeedback = ref("");
const isDevelopment = import.meta.dev;

const activeLoadout = computed(
  () => loadouts.value?.loadouts.find((loadout) => loadout.active) ?? null,
);
const selectedDetailRing = computed(
  () => activeLoadout.value?.rings.find((ring) => ring.id === selectedDetailRingId.value) ?? null,
);

async function startTrainingBattle(): Promise<void> {
  if (!activeLoadout.value) {
    return;
  }

  creatingBattle.value = true;
  battleFeedback.value = "";

  try {
    const battle = await $fetch<{ id: string }>("/api/battle/start", {
      method: "POST",
      body: { requestId: crypto.randomUUID() },
    });
    await navigateTo(`/battle/live/${battle.id}`);
  } catch (battleError) {
    battleFeedback.value =
      battleError instanceof Error ? battleError.message : "Battle creation failed.";
  } finally {
    creatingBattle.value = false;
  }
}

async function createTestResult(outcome: "win" | "loss"): Promise<void> {
  if (!activeLoadout.value) {
    return;
  }

  creatingResult.value = true;
  resultFeedback.value = "";

  try {
    const response = await $fetch<{ recordId: string }>("/api/dev/battle-result", {
      method: "POST",
      body: {
        outcome,
        requestId: crypto.randomUUID(),
      },
    });
    await navigateTo(`/battle/result/${response.recordId}`);
  } catch (resultError) {
    resultFeedback.value =
      resultError instanceof Error ? resultError.message : "Battle result creation failed.";
  } finally {
    creatingResult.value = false;
  }
}
</script>
