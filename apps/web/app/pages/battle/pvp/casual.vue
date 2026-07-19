<template>
  <main class="shell pvp-flow-page casual-match-page">
    <nav class="section-nav" :aria-label="t('accessibility.pvpNavigation')">
      <NuxtLink
        v-for="link in sectionLinks.pvp"
        :key="link.to"
        :class="{ active: route.path === link.to }"
        :to="link.to"
      >
        {{ t(link.labelKey) }}
      </NuxtLink>
    </nav>

    <header class="view-header pvp-view-header">
      <div class="view-title">
        <span class="eyebrow">{{ t("navigation.pvp") }}</span>
        <h1>{{ t("casualMatch.title") }}</h1>
        <p class="muted">{{ t("casualMatch.description") }}</p>
      </div>
      <div class="view-status-stack">
        <span :class="['pvp-live-status', `realtime-${realtimeStatus}`]">
          <Wifi :size="14" /> {{ t(`realtime.${realtimeStatus}`) }}
        </span>
        <span v-if="state" class="pvp-state-pill">{{
          t(`casualMatch.status.${state.status}`)
        }}</span>
      </div>
    </header>

    <p v-if="errorMessage" class="settings-error">{{ errorMessage }}</p>
    <p v-if="pending && !state" class="panel">{{ t("casualMatch.loading") }}</p>

    <section v-else-if="state?.status === 'idle'" class="pvp-matchmaking-layout">
      <article class="pvp-queue-console casual-console">
        <div class="pvp-console-icon"><Search :size="31" /></div>
        <div class="pvp-console-copy">
          <span class="eyebrow">{{ t("casualMatch.queueLabel") }}</span>
          <h2>{{ t("casualMatch.readyTitle") }}</h2>
          <p>{{ t("casualMatch.readyDescription") }}</p>
        </div>
        <button
          type="button"
          class="pvp-primary-command"
          :disabled="mutating || !state.activeLoadout || state.activeLoadout.ringCount === 0"
          @click="submit('enter')"
        >
          <Swords :size="18" /> {{ t("casualMatch.enterQueue") }}
        </button>
        <div class="pvp-queue-rules">
          <span><Shield :size="15" /> {{ t("casualMatch.noRankImpact") }}</span>
          <span><Clock3 :size="15" /> {{ t("casualMatch.fiveMinuteSearch") }}</span>
          <span><RefreshCw :size="15" /> {{ t("casualMatch.reconnectable") }}</span>
        </div>
      </article>

      <aside class="pvp-side-stack">
        <article :class="['pvp-loadout-card', { blocked: !state.activeLoadout }]">
          <div class="pvp-card-heading">
            <div class="pvp-small-icon"><ShieldCheck :size="19" /></div>
            <span class="eyebrow">{{ t("casualMatch.loadoutLabel") }}</span>
          </div>
          <h2>{{ state.activeLoadout?.name || t("casualMatch.noActiveLoadout") }}</h2>
          <p v-if="state.activeLoadout">
            {{ t("casualMatch.ringCount", { count: state.activeLoadout.ringCount }) }}
          </p>
          <p v-else>{{ t("casualMatch.loadoutRequired") }}</p>
          <NuxtLink class="pvp-text-link" to="/inventory/loadouts">
            {{ t("casualMatch.manageLoadouts") }} <ArrowRight :size="15" />
          </NuxtLink>
        </article>

        <article v-if="state.recentBattleId" class="pvp-recent-card">
          <div class="pvp-card-heading">
            <div class="pvp-small-icon"><History :size="19" /></div>
            <span class="eyebrow">{{ t("casualMatch.previousBattle") }}</span>
          </div>
          <h2>{{ t("casualMatch.previousBattleTitle") }}</h2>
          <NuxtLink class="pvp-text-link" :to="`/battle/result/${state.recentBattleId}`">
            {{ t("casualMatch.viewResult") }} <ArrowRight :size="15" />
          </NuxtLink>
        </article>
      </aside>
    </section>

    <section v-else-if="state?.status === 'searching'" class="pvp-search-state">
      <div class="pvp-search-radar" aria-hidden="true">
        <span></span><span></span><Search :size="29" />
      </div>
      <div class="pvp-search-copy">
        <span class="eyebrow">{{ t("casualMatch.searchingLabel") }}</span>
        <h2>{{ t("casualMatch.searchingTitle") }}</h2>
        <p>
          {{
            t("casualMatch.loadoutLocked", {
              name: state.queue?.loadoutName || t("casualMatch.deletedLoadout"),
              count: state.queue?.ringCount,
            })
          }}
        </p>
      </div>
      <div class="pvp-countdown">
        <small>{{ t("casualMatch.expiresLabel") }}</small>
        <strong>{{ queueTimeRemaining }}</strong>
      </div>
      <button type="button" class="secondary-button" :disabled="mutating" @click="submit('cancel')">
        <X :size="17" /> {{ t("casualMatch.cancelQueue") }}
      </button>
    </section>

    <section v-else-if="state?.status === 'matched' && visibleMatch" class="pvp-match-found">
      <div class="pvp-match-ready-icon"><Swords :size="29" /></div>
      <div>
        <span class="eyebrow">{{ t("casualMatch.matchedLabel") }}</span>
        <h2>
          {{ t("casualMatch.matchedTitle", { opponent: visibleMatch.opponent.displayName }) }}
        </h2>
        <p>{{ opponentSummary(visibleMatch.opponent) }}</p>
      </div>
      <NuxtLink class="button-link" :to="`/battle/live/${visibleMatch.battleId}`">
        {{ t("casualMatch.enterBattle") }} <ArrowRight :size="17" />
      </NuxtLink>
    </section>
  </main>
</template>

<script setup lang="ts">
import {
  ArrowRight,
  Clock3,
  History,
  RefreshCw,
  Search,
  Shield,
  ShieldCheck,
  Swords,
  Wifi,
  X,
} from "@lucide/vue";
import type { CasualMatchmakingState, PvpOpponentIdentity } from "~/utils/playerState";
import { visiblePvpOpponent } from "~/utils/pvpPresentation";
import { sectionLinks } from "~/utils/viewData";

const { t } = useI18n();
const route = useRoute();
const mutating = ref(false);
const errorMessage = ref("");
const clock = ref(Date.now());

function opponentSummary(opponent: PvpOpponentIdentity): string {
  const tier = opponent.rank ? t(`rankedMatch.tiers.${opponent.rank.tier}`) : null;
  const rank = opponent.rank
    ? opponent.rank.division
      ? t("rankedMatch.rankName", { tier, division: opponent.rank.division })
      : tier!
    : t("rankedMatch.unranked");
  return t("casualMatch.opponentSummary", { level: opponent.level, rank });
}
const {
  data: state,
  pending,
  refresh,
} = await useFetch<CasualMatchmakingState>("/api/pvp/casual", {
  key: "casual-matchmaking-state",
});
const { status: realtimeStatus } = useGameRealtime((event) => {
  if (event.type === "casualQueueChanged" || event.type === "battleChanged") {
    void refresh();
  }
});
const visibleMatch = computed(() => {
  const match = state.value?.match;
  const opponent = visiblePvpOpponent("casual_pvp", "preCombat", match?.opponent);
  return match && opponent ? { ...match, opponent } : null;
});

const queueTimeRemaining = computed(() => {
  const expiresAt = state.value?.queue?.expiresAt;
  const seconds = expiresAt
    ? Math.max(0, Math.ceil((new Date(expiresAt).getTime() - clock.value) / 1_000))
    : 0;
  const minutes = Math.floor(seconds / 60);
  return t("casualMatch.duration", { minutes, seconds: String(seconds % 60).padStart(2, "0") });
});

watch(
  () => state.value?.match?.battleId,
  (battleId) => {
    if (battleId && import.meta.client) {
      void navigateTo(`/battle/live/${battleId}`);
    }
  },
  { immediate: true },
);

async function submit(action: "enter" | "cancel"): Promise<void> {
  mutating.value = true;
  errorMessage.value = "";
  try {
    state.value = await $fetch<CasualMatchmakingState>("/api/pvp/casual", {
      method: "POST",
      body: { action },
    });
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : t("casualMatch.updateError");
  } finally {
    mutating.value = false;
  }
}

let pollTimer: ReturnType<typeof setInterval> | undefined;
let clockTimer: ReturnType<typeof setInterval> | undefined;
let pollTick = 0;
onMounted(() => {
  clockTimer = setInterval(() => (clock.value = Date.now()), 1_000);
  pollTimer = setInterval(() => {
    pollTick += 1;
    const fallbackDue = realtimeStatus.value !== "connected" || pollTick % 6 === 0;
    if (fallbackDue && !document.hidden && state.value?.status === "searching" && !mutating.value) {
      void refresh();
    }
  }, 2_500);
});
onUnmounted(() => {
  if (pollTimer) clearInterval(pollTimer);
  if (clockTimer) clearInterval(clockTimer);
});
</script>
