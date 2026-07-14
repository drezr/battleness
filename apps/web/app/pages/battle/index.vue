<template>
  <main class="shell">
    <nav class="section-nav" :aria-label="t('accessibility.battleNavigation')">
      <NuxtLink
        v-for="link in sectionLinks.battle"
        :key="link.to"
        :class="{ active: route.path === link.to }"
        :to="link.to"
      >
        {{ $t(link.labelKey) }}
      </NuxtLink>
    </nav>

    <header class="view-header">
      <div class="view-title">
        <span class="eyebrow">{{ t("battle.section") }}</span>
        <h1>{{ t("battle.hub.title") }}</h1>
        <p class="muted">{{ t("battle.hub.description") }}</p>
      </div>
      <p :class="['status-note', activeLoadout ? 'ready-note' : '']">
        {{ activeLoadout ? t("battle.hub.loadoutReady") : t("battle.hub.noActiveLoadout") }}
      </p>
    </header>

    <p v-if="pending" class="panel">{{ t("battle.hub.loading") }}</p>
    <p v-else-if="error" class="panel">{{ t("battle.hub.loadError") }}</p>

    <template v-else-if="loadouts">
      <section class="detail-layout">
        <section class="panel">
          <div class="card-heading">
            <div>
              <h2>{{ t("battle.hub.activeLoadout") }}</h2>
              <p class="muted">
                {{ t("battle.hub.activeLoadoutDescription") }}
              </p>
            </div>
            <NuxtLink class="button-link" to="/inventory/loadouts">{{
              t("battle.hub.manageLoadouts")
            }}</NuxtLink>
          </div>

          <p v-if="!activeLoadout" class="status-note">
            {{ t("battle.hub.loadoutRequired") }}
          </p>

          <template v-else>
            <div class="active-loadout-heading">
              <div>
                <span class="eyebrow">{{ t("battle.hub.selected") }}</span>
                <h3>{{ activeLoadout.name }}</h3>
              </div>
              <span class="pill element-electric">{{
                t("battle.hub.ringCount", { count: activeLoadout.ringCount })
              }}</span>
            </div>

            <section class="metric-grid equipment-metrics">
              <article class="card">
                <span class="eyebrow">{{ t("stats.speed") }}</span>
                <strong>{{ activeLoadout.summary.totalSpeed }}</strong>
              </article>
              <article class="card">
                <span class="eyebrow">{{ t("stats.damage") }}</span>
                <strong>{{ activeLoadout.summary.totalDamage }}</strong>
              </article>
              <article class="card">
                <span class="eyebrow">{{ t("battle.hub.averageEnergy") }}</span>
                <strong>{{ activeLoadout.summary.averageEnergyCost }}</strong>
              </article>
              <article class="card">
                <span class="eyebrow">{{ t("battle.hub.averageCooldown") }}</span>
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
                    {{
                      t("battle.hub.ringStats", {
                        element: t(`element.${ring.element}`),
                        damage: ring.damage,
                        energy: ring.energyCost,
                        cooldown: ring.cooldown,
                      })
                    }}
                  </small>
                  <button class="secondary-button" @click="selectedDetailRingId = ring.id">
                    {{ t("common.inspect") }}
                  </button>
                </div>
              </article>
            </div>
          </template>
        </section>

        <ItemDetailPanel
          :item="selectedDetailRing"
          :title="t('battle.hub.ringDetail')"
          @clear="selectedDetailRingId = ''"
        />
      </section>

      <section class="dashboard-grid">
        <article class="panel">
          <h2>{{ t("battle.hub.training") }}</h2>
          <p class="muted">{{ t("battle.hub.trainingDescription") }}</p>
          <p class="status-note">{{ t("battle.hub.trainingOpponent") }}</p>
          <button
            :disabled="!activeLoadout || creatingBattle"
            type="button"
            @click="startTrainingBattle"
          >
            {{ t(creatingBattle ? "battle.campaign.starting" : "battle.campaign.start") }}
          </button>
          <p v-if="battleFeedback" class="feedback">{{ battleFeedback }}</p>
        </article>

        <article class="panel">
          <h2>{{ t("navigation.campaign") }}</h2>
          <p class="muted">{{ t("battle.hub.campaignDescription") }}</p>
          <p class="status-note">{{ t("battle.hub.campaignStatus") }}</p>
          <NuxtLink
            :class="['button-link', { disabled: !activeLoadout }]"
            :aria-disabled="!activeLoadout"
            :to="activeLoadout ? '/battle/campaign' : '/inventory/loadouts'"
          >
            {{ t(activeLoadout ? "battle.hub.openCampaign" : "battle.campaign.selectLoadout") }}
          </NuxtLink>
        </article>

        <article class="panel">
          <h2>{{ t("navigation.pvp") }}</h2>
          <p class="muted">{{ t("battle.hub.pvpDescription") }}</p>
          <p class="status-note">{{ t("battle.hub.pvpStatus") }}</p>
          <NuxtLink
            :class="['button-link', { disabled: !activeLoadout }]"
            :aria-disabled="!activeLoadout"
            :to="activeLoadout ? '/battle/pvp' : '/inventory/loadouts'"
          >
            {{ t(activeLoadout ? "battle.hub.openPvp" : "battle.campaign.selectLoadout") }}
          </NuxtLink>
        </article>

        <article class="panel">
          <h2>{{ t("battle.hub.historyTitle") }}</h2>
          <p class="muted">{{ t("battle.hub.historyDescription") }}</p>
          <p class="status-note">{{ t("battle.hub.historyStatus") }}</p>
          <NuxtLink class="button-link" to="/battle/history">{{
            t("battle.hub.openHistory")
          }}</NuxtLink>
        </article>

        <article v-if="isDevelopment" class="panel">
          <h2>{{ t("battle.hub.developmentTest") }}</h2>
          <p class="muted">
            {{ t("battle.hub.developmentDescription") }}
          </p>
          <div class="control-row">
            <button
              :disabled="!activeLoadout || creatingResult"
              type="button"
              @click="createTestResult('win')"
            >
              {{ t("battle.hub.testVictory") }}
            </button>
            <button
              class="secondary-button"
              :disabled="!activeLoadout || creatingResult"
              type="button"
              @click="createTestResult('loss')"
            >
              {{ t("battle.hub.testDefeat") }}
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
const { t } = useI18n();
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
      battleError instanceof Error ? battleError.message : t("battle.hub.creationError");
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
      resultError instanceof Error ? resultError.message : t("battle.hub.resultCreationError");
  } finally {
    creatingResult.value = false;
  }
}
</script>
