<template>
  <main class="shell battle-hub-page">
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

    <header class="view-header battle-hub-header">
      <div class="view-title">
        <span class="eyebrow">{{ t("battle.section") }}</span>
        <h1>{{ t("battle.hub.title") }}</h1>
        <p class="muted">{{ t("battle.hub.description") }}</p>
      </div>
      <NuxtLink
        :class="['battle-readiness', activeLoadout ? 'ready' : 'blocked']"
        to="/inventory/loadouts"
      >
        <span class="readiness-icon">
          <Check v-if="activeLoadout" :size="18" aria-hidden="true" />
          <AlertTriangle v-else :size="18" aria-hidden="true" />
        </span>
        <span>
          <small>{{ t("battle.hub.readiness") }}</small>
          <strong>{{
            activeLoadout ? t("battle.hub.loadoutReady") : t("battle.hub.noActiveLoadout")
          }}</strong>
        </span>
        <ChevronRight :size="17" aria-hidden="true" />
      </NuxtLink>
    </header>

    <p v-if="pending" class="panel">{{ t("battle.hub.loading") }}</p>
    <p v-else-if="error" class="panel">{{ t("battle.hub.loadError") }}</p>

    <template v-else-if="loadouts">
      <section class="battle-mode-grid">
        <article class="battle-mode-card campaign-mode">
          <div class="battle-mode-icon"><Map :size="28" aria-hidden="true" /></div>
          <div class="battle-mode-copy">
            <span class="eyebrow">{{ t("battle.hub.soloMode") }}</span>
            <h2>{{ t("navigation.campaign") }}</h2>
            <p>{{ t("battle.hub.campaignDescription") }}</p>
          </div>
          <div class="battle-mode-meta">
            <span><Swords :size="15" /> {{ t("battle.hub.campaignStatus") }}</span>
          </div>
          <NuxtLink
            :class="['button-link', 'battle-mode-action', { disabled: !activeLoadout }]"
            :aria-disabled="!activeLoadout"
            :to="activeLoadout ? '/battle/campaign' : '/inventory/loadouts'"
          >
            {{ t(activeLoadout ? "battle.hub.openCampaign" : "battle.campaign.selectLoadout") }}
            <ArrowRight :size="17" aria-hidden="true" />
          </NuxtLink>
        </article>

        <article class="battle-mode-card pvp-mode">
          <div class="battle-mode-icon"><Users :size="28" aria-hidden="true" /></div>
          <div class="battle-mode-copy">
            <span class="eyebrow">{{ t("battle.hub.competitiveMode") }}</span>
            <h2>{{ t("navigation.pvp") }}</h2>
            <p>{{ t("battle.hub.pvpDescription") }}</p>
          </div>
          <div class="battle-mode-meta">
            <span><Radio :size="15" /> {{ t("battle.hub.pvpModesAvailable") }}</span>
          </div>
          <NuxtLink
            :class="['button-link', 'battle-mode-action', { disabled: !activeLoadout }]"
            :aria-disabled="!activeLoadout"
            :to="activeLoadout ? '/battle/pvp' : '/inventory/loadouts'"
          >
            {{ t(activeLoadout ? "battle.hub.openPvp" : "battle.campaign.selectLoadout") }}
            <ArrowRight :size="17" aria-hidden="true" />
          </NuxtLink>
        </article>

        <article class="battle-mode-card training-mode">
          <div class="battle-mode-icon"><Dumbbell :size="28" aria-hidden="true" /></div>
          <div class="battle-mode-copy">
            <span class="eyebrow">{{ t("battle.hub.practiceMode") }}</span>
            <h2>{{ t("battle.hub.training") }}</h2>
            <p>{{ t("battle.hub.trainingDescription") }}</p>
          </div>
          <div class="battle-mode-meta">
            <span><Bot :size="15" /> {{ t("battle.hub.trainingOpponent") }}</span>
          </div>
          <button
            class="battle-mode-action secondary-button"
            :disabled="!activeLoadout || creatingBattle"
            type="button"
            @click="startTrainingBattle"
          >
            {{ t(creatingBattle ? "battle.campaign.starting" : "battle.hub.startTraining") }}
            <ArrowRight :size="17" aria-hidden="true" />
          </button>
          <p v-if="battleFeedback" class="feedback">{{ battleFeedback }}</p>
        </article>
      </section>

      <section class="battle-loadout-section">
        <div class="section-heading-row">
          <div>
            <span class="eyebrow">{{ t("battle.hub.combatSetup") }}</span>
            <h2>{{ t("battle.hub.activeLoadout") }}</h2>
          </div>
          <NuxtLink class="text-link" to="/inventory/loadouts">
            {{ t("battle.hub.manageLoadouts") }}
            <ArrowRight :size="16" aria-hidden="true" />
          </NuxtLink>
        </div>

        <div v-if="!activeLoadout" class="battle-empty-loadout">
          <ShieldAlert :size="30" aria-hidden="true" />
          <div>
            <strong>{{ t("battle.hub.noActiveLoadout") }}</strong>
            <p>{{ t("battle.hub.loadoutRequired") }}</p>
          </div>
          <NuxtLink class="button-link" to="/inventory/loadouts">
            {{ t("battle.campaign.selectLoadout") }}
          </NuxtLink>
        </div>

        <template v-else>
          <div class="battle-loadout-summary">
            <div class="loadout-identity">
              <span class="loadout-shield"><Shield :size="25" aria-hidden="true" /></span>
              <span>
                <small>{{ t("battle.hub.selected") }}</small>
                <strong>{{ activeLoadout.name }}</strong>
              </span>
              <span class="pill muted-pill">
                {{ t("battle.hub.ringCount", { count: activeLoadout.ringCount }) }}
              </span>
            </div>
            <dl class="loadout-combat-metrics">
              <div>
                <dt>{{ t("stats.speed") }}</dt>
                <dd>{{ activeLoadout.summary.totalSpeed }}</dd>
              </div>
              <div>
                <dt>{{ t("stats.damage") }}</dt>
                <dd>{{ activeLoadout.summary.totalDamage }}</dd>
              </div>
              <div>
                <dt>{{ t("battle.hub.averageEnergy") }}</dt>
                <dd>{{ activeLoadout.summary.averageEnergyCost }}</dd>
              </div>
              <div>
                <dt>{{ t("battle.hub.averageCooldown") }}</dt>
                <dd>{{ activeLoadout.summary.averageCooldown }}</dd>
              </div>
            </dl>
          </div>

          <div class="battle-ring-dock">
            <button
              v-for="ring in activeLoadout.rings"
              :key="ring.id"
              :class="[
                'battle-ring-tile',
                `rarity-border-${ring.rarity}`,
                { selected: selectedDetailRing?.id === ring.id },
              ]"
              type="button"
              @click="selectedDetailRingId = ring.id"
            >
              <span class="battle-ring-artwork">
                <ItemArtwork :definition-id="ring.definitionId" kind="ring" />
                <span :class="['pill', `element-${ring.element}`]">
                  {{ t(`element.${ring.element}`) }}
                </span>
              </span>
              <strong>{{ ring.label }}</strong>
              <small>{{
                t("battle.hub.compactRingStats", {
                  damage: ring.damage,
                  energy: ring.energyCost,
                  cooldown: ring.cooldown,
                })
              }}</small>
            </button>
          </div>

          <ItemDetailPanel
            v-if="selectedDetailRing"
            :item="selectedDetailRing"
            :title="t('battle.hub.ringDetail')"
            @clear="selectedDetailRingId = ''"
          />
        </template>
      </section>

      <section class="battle-secondary-actions">
        <NuxtLink class="battle-history-link" to="/battle/history">
          <span class="destination-icon"><History :size="22" aria-hidden="true" /></span>
          <span>
            <strong>{{ t("battle.hub.historyTitle") }}</strong>
            <small>{{ t("battle.hub.historyDescription") }}</small>
          </span>
          <ChevronRight :size="18" aria-hidden="true" />
        </NuxtLink>

        <details v-if="isDevelopment" class="battle-development-tools">
          <summary>{{ t("battle.hub.developmentTest") }}</summary>
          <p>{{ t("battle.hub.developmentDescription") }}</p>
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
        </details>
      </section>
    </template>
  </main>
</template>

<script setup lang="ts">
import {
  AlertTriangle,
  ArrowRight,
  Bot,
  Check,
  ChevronRight,
  Dumbbell,
  History,
  Map,
  Radio,
  Shield,
  ShieldAlert,
  Swords,
  Users,
} from "@lucide/vue";
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
  if (!activeLoadout.value) return;
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
  if (!activeLoadout.value) return;
  creatingResult.value = true;
  resultFeedback.value = "";
  try {
    const response = await $fetch<{ recordId: string }>("/api/dev/battle-result", {
      method: "POST",
      body: { outcome, requestId: crypto.randomUUID() },
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
