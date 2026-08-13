<template>
  <main class="shell battle-hub-page">
    <header class="view-header battle-hub-header">
      <div class="view-title">
        <div class="view-title-heading">
          <h1>{{ t("battle.hub.title") }}</h1>
          <ViewHelpButton
            :title="t('battle.hub.title')"
            :description="t('battle.hub.description')"
          />
        </div>
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
      <section class="battle-hub-stage">
        <section class="battle-mode-grid">
          <NuxtLink
            class="battle-mode-card hub-link-card campaign-mode"
            :aria-label="
              t(activeLoadout ? 'battle.hub.openCampaign' : 'battle.campaign.selectLoadout')
            "
            :to="activeLoadout ? '/battle/campaign' : '/inventory/loadouts'"
          >
            <div class="battle-mode-copy">
              <div class="battle-mode-icon"><Map :size="28" aria-hidden="true" /></div>
              <div>
                <span class="eyebrow">{{ t("battle.hub.soloMode") }}</span>
                <h2>{{ t("navigation.campaign") }}</h2>
              </div>
              <p>{{ t("battle.hub.campaignDescription") }}</p>
            </div>
            <div class="battle-mode-meta">
              <span><Swords :size="15" /> {{ t("battle.hub.campaignStatus") }}</span>
            </div>
          </NuxtLink>

          <NuxtLink
            class="battle-mode-card hub-link-card pvp-mode"
            :aria-label="t(activeLoadout ? 'battle.hub.openPvp' : 'battle.campaign.selectLoadout')"
            :to="activeLoadout ? '/battle/pvp' : '/inventory/loadouts'"
          >
            <div class="battle-mode-copy">
              <div class="battle-mode-icon"><Users :size="28" aria-hidden="true" /></div>
              <div>
                <span class="eyebrow">{{ t("battle.hub.competitiveMode") }}</span>
                <h2>{{ t("navigation.pvp") }}</h2>
              </div>
              <p>{{ t("battle.hub.pvpDescription") }}</p>
            </div>
            <div class="battle-mode-meta">
              <span><Radio :size="15" /> {{ t("battle.hub.pvpModesAvailable") }}</span>
            </div>
          </NuxtLink>

          <button
            class="battle-mode-card hub-link-card training-mode"
            :aria-label="
              t(creatingBattle ? 'battle.campaign.starting' : 'battle.hub.startTraining')
            "
            :disabled="!activeLoadout || creatingBattle"
            type="button"
            @click="startTrainingBattle"
          >
            <div class="battle-mode-copy">
              <div class="battle-mode-icon"><Dumbbell :size="28" aria-hidden="true" /></div>
              <div>
                <span class="eyebrow">{{ t("battle.hub.practiceMode") }}</span>
                <h2>{{ t("battle.hub.training") }}</h2>
              </div>
              <p>{{ t("battle.hub.trainingDescription") }}</p>
            </div>
            <div class="battle-mode-meta">
              <span><Bot :size="15" /> {{ t("battle.hub.trainingOpponent") }}</span>
            </div>
          </button>
        </section>
        <p v-if="battleFeedback" class="feedback">{{ battleFeedback }}</p>

        <section
          class="hub-stat-strip battle-hub-stats"
          :aria-label="t('battle.hub.accountOverview')"
        >
          <NuxtLink to="/battle/campaign">
            <span class="hub-stat-icon campaign"><Map :size="19" /></span>
            <span>
              <small>{{ t("navigation.campaign") }}</small>
              <strong
                >{{ campaign?.progress.completedCount ?? 0 }} /
                {{ campaign?.progress.totalCount ?? 0 }}</strong
              >
              <em>{{ t("battle.hub.opponentsDefeated") }}</em>
            </span>
          </NuxtLink>
          <NuxtLink to="/battle/history">
            <span class="hub-stat-icon history"><History :size="19" /></span>
            <span>
              <small>{{ t("battle.history.totalBattles") }}</small>
              <strong>{{ history?.records.length ?? 0 }}</strong>
              <em>{{ t("battle.hub.verifiedRecords") }}</em>
            </span>
          </NuxtLink>
          <NuxtLink to="/battle/history">
            <span class="hub-stat-icon victories"><Trophy :size="19" /></span>
            <span>
              <small>{{ t("battle.history.winRate") }}</small>
              <strong>{{ winRate }}%</strong>
              <em>{{ t("battle.hub.combatPerformance") }}</em>
            </span>
          </NuxtLink>
          <NuxtLink :class="{ attention: unclaimedRewardCount > 0 }" to="/profile/history">
            <span class="hub-stat-icon rewards"><Gift :size="19" /></span>
            <span>
              <small>{{ t("battle.history.pendingRewards") }}</small>
              <strong>{{ unclaimedRewardCount }}</strong>
              <em>{{ t("battle.hub.rewardClaims") }}</em>
            </span>
          </NuxtLink>
        </section>
      </section>

      <section class="battle-loadout-section hub-info-panel">
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
  Gift,
  History,
  Map,
  Radio,
  Shield,
  ShieldAlert,
  Swords,
  Trophy,
  Users,
} from "@lucide/vue";
import type { BattleHistoryState, CampaignState, LoadoutState } from "~/utils/playerState";
const { t } = useI18n();
const [loadoutRequest, campaignRequest, historyRequest] = await Promise.all([
  useFetch<LoadoutState>("/api/inventory/loadouts"),
  useFetch<CampaignState>("/api/campaign", { key: "battle-hub-campaign" }),
  useFetch<BattleHistoryState>("/api/battle/history", { key: "battle-hub-history" }),
]);
const loadouts = loadoutRequest.data;
const campaign = campaignRequest.data;
const history = historyRequest.data;
const pending = computed(
  () =>
    loadoutRequest.pending.value || campaignRequest.pending.value || historyRequest.pending.value,
);
const error = computed(
  () => loadoutRequest.error.value || campaignRequest.error.value || historyRequest.error.value,
);
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
const winCount = computed(
  () => history.value?.records.filter((record) => record.outcome === "win").length ?? 0,
);
const winRate = computed(() =>
  history.value?.records.length
    ? Math.round((winCount.value / history.value.records.length) * 100)
    : 0,
);
const unclaimedRewardCount = computed(
  () =>
    history.value?.seasonRewards.filter((entry) => entry.reward.status === "unclaimed").length ?? 0,
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
