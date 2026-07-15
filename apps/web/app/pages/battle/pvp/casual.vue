<template>
  <main class="shell">
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

    <header class="view-header">
      <div class="view-title">
        <span class="eyebrow">{{ t("navigation.pvp") }}</span>
        <h1>{{ t("casualMatch.title") }}</h1>
        <p class="muted">{{ t("casualMatch.description") }}</p>
      </div>
      <div class="view-status-stack">
        <span :class="['pill', `realtime-${realtimeStatus}`]">
          {{ t(`realtime.${realtimeStatus}`) }}
        </span>
        <span v-if="state" class="pill">{{ t(`casualMatch.status.${state.status}`) }}</span>
      </div>
    </header>

    <p v-if="errorMessage" class="settings-error">{{ errorMessage }}</p>
    <p v-if="pending && !state" class="panel">{{ t("casualMatch.loading") }}</p>

    <section v-else-if="state?.status === 'idle'" class="private-match-entry">
      <article class="panel">
        <span class="eyebrow">{{ t("casualMatch.loadoutLabel") }}</span>
        <h2>{{ state.activeLoadout?.name || t("casualMatch.noActiveLoadout") }}</h2>
        <p v-if="state.activeLoadout" class="muted">
          {{ t("casualMatch.ringCount", { count: state.activeLoadout.ringCount }) }}
        </p>
        <p v-else class="muted">{{ t("casualMatch.loadoutRequired") }}</p>
        <div class="action-row">
          <button
            type="button"
            :disabled="mutating || !state.activeLoadout || state.activeLoadout.ringCount === 0"
            @click="submit('enter')"
          >
            {{ t("casualMatch.enterQueue") }}
          </button>
          <NuxtLink class="button-link secondary-button" to="/inventory/loadouts">
            {{ t("casualMatch.manageLoadouts") }}
          </NuxtLink>
        </div>
      </article>

      <article v-if="state.recentBattleId" class="panel">
        <span class="eyebrow">{{ t("casualMatch.previousBattle") }}</span>
        <h2>{{ t("casualMatch.previousBattleTitle") }}</h2>
        <NuxtLink
          class="button-link secondary-button"
          :to="`/battle/result/${state.recentBattleId}`"
        >
          {{ t("casualMatch.viewResult") }}
        </NuxtLink>
      </article>
    </section>

    <section v-else-if="state?.status === 'searching'" class="panel private-ready-panel">
      <div>
        <span class="eyebrow">{{ t("casualMatch.searchingLabel") }}</span>
        <h2>{{ t("casualMatch.searchingTitle") }}</h2>
        <p class="muted">
          {{
            t("casualMatch.loadoutLocked", {
              name: state.queue?.loadoutName || t("casualMatch.deletedLoadout"),
              count: state.queue?.ringCount,
            })
          }}
        </p>
        <p class="muted">{{ t("casualMatch.timeRemaining", { time: queueTimeRemaining }) }}</p>
      </div>
      <button type="button" class="secondary-button" :disabled="mutating" @click="submit('cancel')">
        {{ t("casualMatch.cancelQueue") }}
      </button>
    </section>

    <section
      v-else-if="state?.status === 'matched' && state.match"
      class="panel private-battle-ready"
    >
      <div>
        <span class="eyebrow">{{ t("casualMatch.matchedLabel") }}</span>
        <h2>{{ t("casualMatch.matchedTitle", { opponent: state.match.opponent.username }) }}</h2>
        <p class="muted">{{ t("casualMatch.redirecting") }}</p>
      </div>
      <NuxtLink class="button-link" :to="`/battle/live/${state.match.battleId}`">
        {{ t("casualMatch.enterBattle") }}
      </NuxtLink>
    </section>
  </main>
</template>

<script setup lang="ts">
import type { CasualMatchmakingState } from "~/utils/playerState";
import { sectionLinks } from "~/utils/viewData";

const { t } = useI18n();
const route = useRoute();
const mutating = ref(false);
const errorMessage = ref("");
const clock = ref(Date.now());
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
