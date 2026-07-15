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
        <h1>{{ t("privateMatch.title") }}</h1>
        <p class="muted">{{ t("privateMatch.description") }}</p>
      </div>
      <div class="view-status-stack">
        <span :class="['pill', `realtime-${realtimeStatus}`]">
          {{ t(`realtime.${realtimeStatus}`) }}
        </span>
        <span v-if="state?.match" class="pill">{{
          t(`privateMatch.status.${state.match.status}`)
        }}</span>
      </div>
    </header>

    <p v-if="errorMessage" class="settings-error">{{ errorMessage }}</p>
    <p v-if="pending && !state" class="panel">{{ t("privateMatch.loading") }}</p>

    <section v-else-if="state && !currentMatch" class="private-match-entry">
      <article class="panel">
        <h2>{{ t("privateMatch.createTitle") }}</h2>
        <p class="muted">{{ t("privateMatch.createDescription") }}</p>
        <button type="button" :disabled="mutating" @click="submit({ action: 'create' })">
          {{ t("privateMatch.createAction") }}
        </button>
      </article>
      <article class="panel">
        <h2>{{ t("privateMatch.joinTitle") }}</h2>
        <label>
          {{ t("privateMatch.codeLabel") }}
          <input
            v-model="joinCode"
            maxlength="9"
            autocomplete="off"
            :placeholder="t('privateMatch.codePlaceholder')"
          />
        </label>
        <button
          type="button"
          :disabled="mutating || !joinCode.trim()"
          @click="submit({ action: 'join', code: joinCode })"
        >
          {{ t("privateMatch.joinAction") }}
        </button>
      </article>
    </section>

    <template v-else-if="state && currentMatch">
      <section class="panel private-match-code">
        <div>
          <span class="eyebrow">{{ t("privateMatch.invitationCode") }}</span>
          <strong>{{ currentMatch.code }}</strong>
        </div>
        <button type="button" class="secondary-button" @click="copyCode">
          {{ copied ? t("privateMatch.copied") : t("privateMatch.copy") }}
        </button>
      </section>

      <section class="private-participant-grid">
        <article
          v-for="participant in currentMatch.participants"
          :key="participant.playerId"
          class="card"
        >
          <div class="card-heading">
            <div>
              <span class="eyebrow">{{ t(`privateMatch.slot.${participant.slot}`) }}</span>
              <h2>{{ participant.username }}</h2>
            </div>
            <span :class="['pill', participant.ready ? 'ready-note' : 'muted-pill']">
              {{ t(participant.ready ? "privateMatch.ready" : "privateMatch.notReady") }}
            </span>
          </div>
          <p class="muted">
            {{ participant.loadoutName || t("privateMatch.noLoadout") }}
            <template v-if="participant.loadoutName">
              · {{ t("privateMatch.ringCount", { count: participant.ringCount }) }}
            </template>
          </p>
        </article>
        <article v-if="currentMatch.participants.length < 2" class="card private-empty-slot">
          <span class="eyebrow">{{ t("privateMatch.slot.guest") }}</span>
          <h2>{{ t("privateMatch.waitingForOpponent") }}</h2>
        </article>
      </section>

      <section v-if="currentMatch.status === 'waiting'" class="panel private-ready-panel">
        <label>
          {{ t("privateMatch.loadoutLabel") }}
          <select v-model="selectedLoadoutId" :disabled="ownParticipant?.ready">
            <option value="">{{ t("privateMatch.selectLoadout") }}</option>
            <option v-for="loadout in state.loadouts" :key="loadout.id" :value="loadout.id">
              {{ loadout.name }} ({{ t("privateMatch.ringCount", { count: loadout.ringCount }) }})
            </option>
          </select>
        </label>
        <div class="action-row">
          <button
            type="button"
            :disabled="mutating || (!ownParticipant?.ready && !selectedLoadoutId)"
            @click="toggleReady"
          >
            {{
              t(ownParticipant?.ready ? "privateMatch.cancelReady" : "privateMatch.confirmReady")
            }}
          </button>
          <button
            type="button"
            class="secondary-button"
            :disabled="mutating"
            @click="submit({ action: 'leave' })"
          >
            {{
              t(
                ownParticipant?.slot === "host"
                  ? "privateMatch.cancelMatch"
                  : "privateMatch.leaveMatch",
              )
            }}
          </button>
        </div>
      </section>

      <section v-if="currentMatch.battleId" class="panel private-battle-ready">
        <div>
          <span class="eyebrow">{{ t("privateMatch.battleReady") }}</span>
          <h2>{{ t("privateMatch.enterBattleTitle") }}</h2>
          <p v-if="currentMatch.turnDeadlineAt" class="muted">
            {{ t("privateMatch.turnTimerActive") }}
          </p>
          <p v-else-if="currentMatch.openingDuelDeadlineAt" class="muted">
            {{ t("privateMatch.openingDuelTimerActive") }}
          </p>
        </div>
        <NuxtLink class="button-link" :to="`/battle/live/${currentMatch.battleId}`">
          {{ t("privateMatch.enterBattle") }}
        </NuxtLink>
      </section>
    </template>
  </main>
</template>

<script setup lang="ts">
import type { PrivateMatchState } from "~/utils/playerState";
import { sectionLinks } from "~/utils/viewData";

const { t } = useI18n();
const route = useRoute();
const joinCode = ref("");
const selectedLoadoutId = ref("");
const mutating = ref(false);
const errorMessage = ref("");
const copied = ref(false);
const {
  data: state,
  pending,
  refresh,
} = await useFetch<PrivateMatchState>("/api/pvp/private", {
  key: "private-match-state",
});
const { status: realtimeStatus } = useGameRealtime((event) => {
  if (event.type === "privateMatchChanged" || event.type === "battleChanged") {
    void refresh();
  }
});

const currentMatch = computed(() =>
  state.value?.match && !["cancelled"].includes(state.value.match.status)
    ? state.value.match
    : null,
);
const ownParticipant = computed(() =>
  currentMatch.value?.participants.find((entry) => entry.playerId === state.value?.playerId),
);

watchEffect(() => {
  if (ownParticipant.value?.loadoutId && !selectedLoadoutId.value) {
    selectedLoadoutId.value = ownParticipant.value.loadoutId;
  }
});

async function submit(body: Record<string, unknown>): Promise<void> {
  mutating.value = true;
  errorMessage.value = "";
  try {
    state.value = await $fetch<PrivateMatchState>("/api/pvp/private", { method: "POST", body });
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : t("privateMatch.updateError");
  } finally {
    mutating.value = false;
  }
}

async function toggleReady(): Promise<void> {
  await submit({
    action: "ready",
    loadoutId: selectedLoadoutId.value || ownParticipant.value?.loadoutId,
    ready: !ownParticipant.value?.ready,
  });
}

async function copyCode(): Promise<void> {
  if (!currentMatch.value) return;
  await navigator.clipboard.writeText(currentMatch.value.code);
  copied.value = true;
  window.setTimeout(() => (copied.value = false), 1500);
}

let pollTimer: ReturnType<typeof setInterval> | undefined;
let pollTick = 0;
onMounted(() => {
  pollTimer = setInterval(() => {
    pollTick += 1;
    const fallbackDue = realtimeStatus.value !== "connected" || pollTick % 6 === 0;
    if (
      fallbackDue &&
      !document.hidden &&
      currentMatch.value?.status === "waiting" &&
      !mutating.value
    ) {
      void refresh();
    }
  }, 2500);
});
onUnmounted(() => {
  if (pollTimer) clearInterval(pollTimer);
});
</script>
