<template>
  <main class="shell pvp-flow-page private-match-page">
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
        <h1>{{ t("privateMatch.title") }}</h1>
        <p class="muted">{{ t("privateMatch.description") }}</p>
      </div>
      <div class="view-status-stack">
        <span :class="['pvp-live-status', `realtime-${realtimeStatus}`]">
          <Wifi :size="14" /> {{ t(`realtime.${realtimeStatus}`) }}
        </span>
        <span v-if="state?.match" class="pvp-state-pill">
          {{ t(`privateMatch.status.${state.match.status}`) }}
        </span>
      </div>
    </header>

    <p v-if="errorMessage" class="settings-error">{{ errorMessage }}</p>
    <p v-if="pending && !state" class="panel">{{ t("privateMatch.loading") }}</p>

    <section v-else-if="state && !currentMatch" class="pvp-entry-grid">
      <article class="pvp-entry-card create-private-card">
        <div class="pvp-entry-icon"><Plus :size="25" /></div>
        <div>
          <span class="eyebrow">{{ t("privateMatch.hostLabel") }}</span>
          <h2>{{ t("privateMatch.createTitle") }}</h2>
          <p>{{ t("privateMatch.createDescription") }}</p>
        </div>
        <button type="button" :disabled="mutating" @click="submit({ action: 'create' })">
          {{ t("privateMatch.createAction") }} <ArrowRight :size="17" />
        </button>
      </article>

      <article class="pvp-entry-card join-private-card">
        <div class="pvp-entry-icon"><LogIn :size="25" /></div>
        <div>
          <span class="eyebrow">{{ t("privateMatch.guestLabel") }}</span>
          <h2>{{ t("privateMatch.joinTitle") }}</h2>
          <p>{{ t("privateMatch.joinDescription") }}</p>
        </div>
        <label class="pvp-code-field">
          <span>{{ t("privateMatch.codeLabel") }}</span>
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
          {{ t("privateMatch.joinAction") }} <ArrowRight :size="17" />
        </button>
      </article>
    </section>

    <template v-else-if="state && currentMatch">
      <section class="private-lobby-banner">
        <div>
          <span class="eyebrow">{{ t("privateMatch.invitationCode") }}</span>
          <strong>{{ currentMatch.code }}</strong>
          <small>{{ t("privateMatch.shareCode") }}</small>
        </div>
        <button type="button" class="secondary-button" @click="copyCode">
          <Check v-if="copied" :size="17" />
          <Copy v-else :size="17" />
          {{ copied ? t("privateMatch.copied") : t("privateMatch.copy") }}
        </button>
      </section>

      <section class="private-lobby-grid">
        <article
          v-for="participant in currentMatch.participants"
          :key="participant.slot"
          :class="['private-player-slot', { ready: participant.ready }]"
        >
          <div class="private-player-avatar"><UserRound :size="28" /></div>
          <div class="private-player-copy">
            <span class="eyebrow">{{ t(`privateMatch.slot.${participant.slot}`) }}</span>
            <h2>{{ participant.displayName }}</h2>
            <p class="muted">
              {{
                t("privateMatch.opponentSummary", {
                  level: participant.level,
                  rank: visibleRankLabel(participant.rank),
                })
              }}
            </p>
            <p
              v-if="
                canShowPvpParticipantLoadout(
                  'private_pvp',
                  'preCombat',
                  participant.isCurrentPlayer,
                )
              "
            >
              {{ participant.loadoutName || t("privateMatch.noLoadout") }}
              <template v-if="participant.loadoutName">
                - {{ t("privateMatch.ringCount", { count: participant.ringCount }) }}
              </template>
            </p>
          </div>
          <span :class="['private-ready-state', { ready: participant.ready }]">
            <CheckCircle2 v-if="participant.ready" :size="16" />
            <CircleDashed v-else :size="16" />
            {{ t(participant.ready ? "privateMatch.ready" : "privateMatch.notReady") }}
          </span>
        </article>

        <article v-if="currentMatch.participants.length < 2" class="private-player-slot empty">
          <div class="private-player-avatar"><UserPlus :size="28" /></div>
          <div class="private-player-copy">
            <span class="eyebrow">{{ t("privateMatch.slot.guest") }}</span>
            <h2>{{ t("privateMatch.waitingForOpponent") }}</h2>
            <p>{{ t("privateMatch.waitingHint") }}</p>
          </div>
          <LoaderCircle class="pvp-spin" :size="18" />
        </article>
      </section>

      <section v-if="currentMatch.status === 'waiting'" class="pvp-command-bar">
        <label class="pvp-loadout-select">
          <span>{{ t("privateMatch.loadoutLabel") }}</span>
          <select v-model="selectedLoadoutId" :disabled="ownParticipant?.ready">
            <option value="">{{ t("privateMatch.selectLoadout") }}</option>
            <option v-for="loadout in state.loadouts" :key="loadout.id" :value="loadout.id">
              {{ loadout.name }} ({{ t("privateMatch.ringCount", { count: loadout.ringCount }) }})
            </option>
          </select>
        </label>
        <div class="pvp-command-actions">
          <button
            type="button"
            :disabled="mutating || (!ownParticipant?.ready && !selectedLoadoutId)"
            @click="toggleReady"
          >
            <LockKeyhole :size="17" />
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
            <LogOut :size="17" />
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

      <section v-if="currentMatch.battleId" class="pvp-match-ready">
        <div class="pvp-match-ready-icon"><Swords :size="27" /></div>
        <div>
          <span class="eyebrow">{{ t("privateMatch.battleReady") }}</span>
          <h2>{{ t("privateMatch.enterBattleTitle") }}</h2>
          <p v-if="currentMatch.turnDeadlineAt">
            {{ t("privateMatch.turnTimerActive") }}
          </p>
          <p v-else-if="currentMatch.openingDuelDeadlineAt">
            {{ t("privateMatch.openingDuelTimerActive") }}
          </p>
        </div>
        <NuxtLink class="button-link" :to="`/battle/live/${currentMatch.battleId}`">
          {{ t("privateMatch.enterBattle") }} <ArrowRight :size="17" />
        </NuxtLink>
      </section>
    </template>
  </main>
</template>

<script setup lang="ts">
import {
  ArrowRight,
  Check,
  CheckCircle2,
  CircleDashed,
  Copy,
  LoaderCircle,
  LockKeyhole,
  LogIn,
  LogOut,
  Plus,
  Swords,
  UserPlus,
  UserRound,
  Wifi,
} from "@lucide/vue";
import type { PrivateMatchState, PvpVisibleRank } from "~/utils/playerState";
import { canShowPvpParticipantLoadout } from "~/utils/pvpPresentation";
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
  currentMatch.value?.participants.find((entry) => entry.isCurrentPlayer),
);

function visibleRankLabel(rank: PvpVisibleRank): string {
  if (!rank) return t("rankedMatch.unranked");
  const tier = t(`rankedMatch.tiers.${rank.tier}`);
  return rank.division ? t("rankedMatch.rankName", { tier, division: rank.division }) : tier;
}

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
