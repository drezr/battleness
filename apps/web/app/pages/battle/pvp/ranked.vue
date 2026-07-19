<template>
  <main class="shell pvp-flow-page ranked-match-page">
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
        <h1>{{ t("rankedMatch.title") }}</h1>
        <p class="muted">{{ t("rankedMatch.description") }}</p>
      </div>
      <div class="view-status-stack">
        <span :class="['pvp-live-status', `realtime-${realtimeStatus}`]">
          <Wifi :size="14" /> {{ t(`realtime.${realtimeStatus}`) }}
        </span>
        <span v-if="state" class="pvp-state-pill">{{
          t(`rankedMatch.status.${state.status}`)
        }}</span>
      </div>
    </header>

    <p v-if="errorMessage" class="settings-error">{{ errorMessage }}</p>
    <p v-if="pending && !state" class="panel">{{ t("rankedMatch.loading") }}</p>

    <section v-else-if="state" class="ranked-command-layout">
      <article class="ranked-standing-card">
        <div class="ranked-emblem"><Trophy :size="31" /></div>
        <div class="ranked-standing-copy">
          <span class="eyebrow">{{ t("rankedMatch.ratingLabel") }}</span>
          <h2>{{ rankLabel }}</h2>
        </div>
        <dl v-if="state.rating" class="summary-grid">
          <div>
            <dt>{{ t("rankedMatch.rating") }}</dt>
            <dd>{{ state.rating.value }} ± {{ state.rating.deviation }}</dd>
          </div>
          <div>
            <dt>{{ t("rankedMatch.placements") }}</dt>
            <dd>{{ state.rating.placementMatches }} / {{ state.rating.placementTarget }}</dd>
          </div>
          <div v-if="state.rating.peakRating && state.rating.peakStanding">
            <dt>{{ t("rankedRewards.currentPeak") }}</dt>
            <dd>{{ currentPeakLabel }} · {{ state.rating.peakRating }}</dd>
          </div>
          <div v-if="state.season">
            <dt>{{ t("rankedMatch.seasonEnds") }}</dt>
            <dd>{{ formatDate(state.season.endsAt) }}</dd>
          </div>
        </dl>
      </article>

      <article v-if="state.seasonReset" class="ranked-notice-card">
        <span class="eyebrow">{{ t("rankedMatch.newSeasonLabel") }}</span>
        <h2>{{ t("rankedMatch.newSeasonTitle") }}</h2>
        <p class="muted">
          {{
            t("rankedMatch.softResetSummary", {
              before: state.seasonReset.ratingBefore,
              after: state.seasonReset.ratingAfter,
            })
          }}
        </p>
        <p class="muted">
          {{
            t("rankedMatch.placementsRestarted", {
              count: state.seasonReset.previousPlacementMatches,
            })
          }}
        </p>
      </article>

      <article
        v-if="state.status === 'unavailable'"
        class="pvp-queue-console ranked-console unavailable"
      >
        <span class="eyebrow">{{ t("rankedMatch.seasonLabel") }}</span>
        <h2>{{ t("rankedMatch.noSeason") }}</h2>
        <p class="muted">{{ t("rankedMatch.noSeasonDescription") }}</p>
      </article>

      <article v-else-if="state.status === 'idle'" class="pvp-queue-console ranked-console">
        <div class="pvp-console-icon"><Target :size="31" /></div>
        <div class="pvp-console-copy">
          <span class="eyebrow">{{ t("rankedMatch.loadoutLabel") }}</span>
          <h2>{{ state.activeLoadout?.name || t("rankedMatch.noActiveLoadout") }}</h2>
          <p v-if="state.activeLoadout" class="muted">
            {{
              t(
                state.activeLoadout.ringCount === 1
                  ? "rankedMatch.ringCountOne"
                  : "rankedMatch.ringCount",
                { count: state.activeLoadout.ringCount },
              )
            }}
          </p>
          <p v-else>{{ t("rankedMatch.loadoutRequired") }}</p>
        </div>
        <p v-if="state.discipline.lockedUntil" class="settings-error">
          {{ t("rankedMatch.lockedUntil", { time: formatDateTime(state.discipline.lockedUntil) }) }}
        </p>
        <div class="pvp-command-actions">
          <button
            type="button"
            :disabled="
              mutating ||
              !state.activeLoadout ||
              state.activeLoadout.ringCount === 0 ||
              Boolean(state.discipline.lockedUntil)
            "
            @click="submit('enter')"
          >
            <Swords :size="18" /> {{ t("rankedMatch.enterQueue") }}
          </button>
          <NuxtLink class="button-link secondary-button" to="/inventory/loadouts">
            {{ t("rankedMatch.manageLoadouts") }} <ArrowRight :size="16" />
          </NuxtLink>
        </div>
        <p v-if="state.discipline.missedAcceptances > 0" class="muted">
          {{
            t("rankedMatch.missedAcceptances", {
              count: state.discipline.missedAcceptances,
            })
          }}
        </p>
      </article>

      <article
        v-else-if="state.status === 'searching'"
        class="pvp-search-state ranked-search-state"
      >
        <div class="pvp-search-radar" aria-hidden="true">
          <span></span><span></span><Search :size="29" />
        </div>
        <div>
          <span class="eyebrow">{{ t("rankedMatch.searchingLabel") }}</span>
          <h2>{{ t("rankedMatch.searchingTitle") }}</h2>
          <p class="muted">
            {{
              t(
                state.queue?.ringCount === 1
                  ? "rankedMatch.loadoutLockedOne"
                  : "rankedMatch.loadoutLocked",
                {
                  name: state.queue?.loadoutName || t("rankedMatch.deletedLoadout"),
                  count: state.queue?.ringCount,
                },
              )
            }}
          </p>
          <p class="muted">
            {{
              t("rankedMatch.currentRange", {
                rating: state.queue?.ratingRange,
                level: state.queue?.heroLevelRange,
              })
            }}
          </p>
          <p class="muted">{{ t("rankedMatch.searchTime", { time: queueTimeRemaining }) }}</p>
        </div>
        <div class="pvp-countdown">
          <small>{{ t("rankedMatch.expiresLabel") }}</small>
          <strong>{{ queueTimeRemaining }}</strong>
        </div>
        <button
          type="button"
          class="secondary-button"
          :disabled="mutating"
          @click="submit('cancel')"
        >
          <X :size="17" /> {{ t("rankedMatch.cancelQueue") }}
        </button>
      </article>

      <article v-else-if="state.status === 'accepting' && visibleProposal" class="pvp-accept-state">
        <div class="pvp-match-ready-icon"><UserCheck :size="29" /></div>
        <div>
          <span class="eyebrow">{{ t("rankedMatch.proposalLabel") }}</span>
          <h2>
            {{ t("rankedMatch.proposalTitle", { opponent: visibleProposal.opponent.displayName }) }}
          </h2>
          <p class="muted">
            {{ t("rankedMatch.acceptanceTime", { time: acceptanceTimeRemaining }) }}
          </p>
          <p class="muted">{{ opponentSummary(visibleProposal.opponent) }}</p>
          <p v-if="state.proposal?.accepted" class="muted">
            {{ t("rankedMatch.waitingForOpponent") }}
          </p>
        </div>
        <div class="pvp-command-actions">
          <button
            type="button"
            :disabled="mutating || state.proposal?.accepted"
            @click="submit('accept')"
          >
            <Check :size="17" /> {{ t("rankedMatch.accept") }}
          </button>
          <button
            type="button"
            class="secondary-button"
            :disabled="mutating"
            @click="submit('decline')"
          >
            <X :size="17" /> {{ t("rankedMatch.decline") }}
          </button>
        </div>
      </article>

      <article v-else-if="state.status === 'matched' && visibleMatch" class="pvp-match-found">
        <div class="pvp-match-ready-icon"><Swords :size="29" /></div>
        <div>
          <span class="eyebrow">{{ t("rankedMatch.matchedLabel") }}</span>
          <h2>
            {{ t("rankedMatch.matchedTitle", { opponent: visibleMatch.opponent.displayName }) }}
          </h2>
          <p class="muted">{{ opponentSummary(visibleMatch.opponent) }}</p>
          <p class="muted">{{ t("rankedMatch.redirecting") }}</p>
        </div>
        <NuxtLink class="button-link" :to="`/battle/live/${visibleMatch.battleId}`">
          {{ t("rankedMatch.enterBattle") }} <ArrowRight :size="17" />
        </NuxtLink>
      </article>

      <article v-if="state.recentBattleId" class="pvp-recent-card ranked-recent-card">
        <span class="eyebrow">{{ t("rankedMatch.previousBattle") }}</span>
        <h2>{{ t("rankedMatch.previousBattleTitle") }}</h2>
        <NuxtLink
          class="button-link secondary-button"
          :to="`/battle/result/${state.recentBattleId}`"
        >
          {{ t("rankedMatch.viewResult") }} <ArrowRight :size="15" />
        </NuxtLink>
      </article>
    </section>

    <RankedSeasonRewardList
      v-if="state?.seasonRewards.length"
      :rewards="state.seasonRewards"
      :claiming-reward-id="claimingRewardId"
      @claim="claimSeasonReward"
    />

    <section v-if="leaderboard?.season" class="ranked-leaderboard-layout">
      <article class="panel ranked-leaderboard-panel">
        <div class="ranked-leaderboard-title">
          <div>
            <span class="eyebrow">{{ t("rankedLeaderboard.seasonLabel") }}</span>
            <h2>{{ t("rankedLeaderboard.topTitle") }}</h2>
          </div>
          <span class="pill">{{
            t("rankedLeaderboard.placedPlayers", { count: leaderboard.top.length })
          }}</span>
        </div>
        <div class="ranked-leaderboard-header" aria-hidden="true">
          <span>{{ t("rankedLeaderboard.position") }}</span>
          <span>{{ t("rankedLeaderboard.player") }}</span>
          <span>{{ t("rankedLeaderboard.rank") }}</span>
          <span>{{ t("rankedLeaderboard.rating") }}</span>
          <span>{{ t("rankedLeaderboard.record") }}</span>
        </div>
        <ol v-if="leaderboard.top.length" class="ranked-leaderboard-list">
          <li
            v-for="entry in leaderboard.top"
            :key="entry.playerId"
            :class="{ current: entry.isCurrentPlayer }"
          >
            <strong class="ranked-position">#{{ entry.position }}</strong>
            <NuxtLink
              v-if="entry.username"
              class="ranked-player-name ranked-player-profile-link"
              :to="`/profile/pvp/${entry.playerId}`"
            >
              {{ entry.username }}
              <small v-if="entry.isCurrentPlayer">{{ t("rankedLeaderboard.you") }}</small>
            </NuxtLink>
            <span v-else class="ranked-player-name">
              {{ t("rankedLeaderboard.anonymousPlayer") }}
            </span>
            <span :data-label="t('rankedLeaderboard.rank')">{{ leaderboardRankLabel(entry) }}</span>
            <span :data-label="t('rankedLeaderboard.rating')">
              {{ entry.rating }} ± {{ entry.deviation }}
            </span>
            <span :data-label="t('rankedLeaderboard.record')">
              {{
                t("rankedLeaderboard.recordValue", {
                  wins: entry.wins,
                  losses: entry.losses,
                  draws: entry.draws,
                })
              }}
            </span>
          </li>
        </ol>
        <p v-else class="muted">{{ t("rankedLeaderboard.empty") }}</p>
      </article>

      <article class="panel ranked-leaderboard-panel">
        <div class="ranked-leaderboard-title">
          <div>
            <span class="eyebrow">{{ t("rankedLeaderboard.playerLabel") }}</span>
            <h2>{{ t("rankedLeaderboard.nearbyTitle") }}</h2>
          </div>
          <span v-if="leaderboard.current" class="pill"> #{{ leaderboard.current.position }} </span>
        </div>
        <ol v-if="leaderboard.nearby.length" class="ranked-leaderboard-list nearby">
          <li
            v-for="entry in leaderboard.nearby"
            :key="entry.playerId"
            :class="{ current: entry.isCurrentPlayer }"
          >
            <strong class="ranked-position">#{{ entry.position }}</strong>
            <NuxtLink
              v-if="entry.username"
              class="ranked-player-name ranked-player-profile-link"
              :to="`/profile/pvp/${entry.playerId}`"
            >
              {{ entry.username }}
              <small v-if="entry.isCurrentPlayer">{{ t("rankedLeaderboard.you") }}</small>
            </NuxtLink>
            <span v-else class="ranked-player-name">
              {{ t("rankedLeaderboard.anonymousPlayer") }}
            </span>
            <span :data-label="t('rankedLeaderboard.rank')">{{ leaderboardRankLabel(entry) }}</span>
            <span :data-label="t('rankedLeaderboard.rating')">
              {{ entry.rating }} ± {{ entry.deviation }}
            </span>
            <span :data-label="t('rankedLeaderboard.record')">
              {{
                t("rankedLeaderboard.recordValue", {
                  wins: entry.wins,
                  losses: entry.losses,
                  draws: entry.draws,
                })
              }}
            </span>
          </li>
        </ol>
        <p v-else class="muted">{{ t("rankedLeaderboard.placementsRequired") }}</p>
      </article>
    </section>
  </main>
</template>

<script setup lang="ts">
import { ArrowRight, Check, Search, Swords, Target, Trophy, UserCheck, Wifi, X } from "@lucide/vue";
import type {
  RankedLeaderboardEntry,
  RankedLeaderboardState,
  RankedMatchmakingState,
  PvpOpponentIdentity,
} from "~/utils/playerState";
import { visiblePvpOpponent } from "~/utils/pvpPresentation";
import { sectionLinks } from "~/utils/viewData";

const { t, locale } = useI18n();
const route = useRoute();
const mutating = ref(false);
const claimingRewardId = ref("");
const errorMessage = ref("");
const clock = ref(Date.now());
const {
  data: state,
  pending,
  refresh,
} = await useFetch<RankedMatchmakingState>("/api/pvp/ranked", {
  key: "ranked-matchmaking-state",
});
const { data: leaderboard, refresh: refreshLeaderboard } = await useFetch<RankedLeaderboardState>(
  "/api/pvp/ranked/leaderboard",
  {
    key: "ranked-leaderboard-state",
  },
);
const { status: realtimeStatus } = useGameRealtime((event) => {
  if (event.type === "rankedQueueChanged" || event.type === "battleChanged") {
    void refresh();
    void refreshLeaderboard();
  }
});
const visibleProposal = computed(() => {
  const proposal = state.value?.proposal;
  const opponent = visiblePvpOpponent("ranked_pvp", "preCombat", proposal?.opponent);
  return proposal && opponent ? { ...proposal, opponent } : null;
});
const visibleMatch = computed(() => {
  const match = state.value?.match;
  const opponent = visiblePvpOpponent("ranked_pvp", "preCombat", match?.opponent);
  return match && opponent ? { ...match, opponent } : null;
});

const rankLabel = computed(() => {
  const standing = state.value?.rating?.standing;
  if (!standing) return t("rankedMatch.unranked");
  const tier = t(`rankedMatch.tiers.${standing.tier}`);
  return standing.division
    ? t("rankedMatch.rankName", { tier, division: standing.division })
    : tier;
});
const currentPeakLabel = computed(() => {
  const standing = state.value?.rating?.peakStanding;
  if (!standing) return "";
  const tier = t(`rankedMatch.tiers.${standing.tier}`);
  return standing.division
    ? t("rankedMatch.rankName", { tier, division: standing.division })
    : tier;
});
const queueTimeRemaining = computed(() => countdown(state.value?.queue?.expiresAt));
const acceptanceTimeRemaining = computed(() =>
  countdown(state.value?.proposal?.acceptanceDeadlineAt),
);

function opponentSummary(opponent: PvpOpponentIdentity): string {
  const tier = opponent.rank ? t(`rankedMatch.tiers.${opponent.rank.tier}`) : null;
  const rank = opponent.rank
    ? opponent.rank.division
      ? t("rankedMatch.rankName", { tier, division: opponent.rank.division })
      : tier!
    : t("rankedMatch.unranked");
  return t("rankedMatch.opponentSummary", {
    level: opponent.level,
    rank,
    ready: t(opponent.ready ? "privateMatch.ready" : "privateMatch.notReady"),
  });
}

watch(
  () => state.value?.match?.battleId,
  (battleId) => {
    if (battleId && import.meta.client) void navigateTo(`/battle/live/${battleId}`);
  },
  { immediate: true },
);

async function submit(action: "enter" | "cancel" | "accept" | "decline"): Promise<void> {
  mutating.value = true;
  errorMessage.value = "";
  try {
    state.value = await $fetch<RankedMatchmakingState>("/api/pvp/ranked", {
      method: "POST",
      body: { action },
    });
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : t("rankedMatch.updateError");
  } finally {
    mutating.value = false;
  }
}

async function claimSeasonReward(rewardGrantId: string): Promise<void> {
  claimingRewardId.value = rewardGrantId;
  errorMessage.value = "";
  try {
    await $fetch("/api/battle/rewards/claim", {
      method: "POST",
      body: { rewardGrantId },
    });
    await refresh();
    await refreshNuxtData();
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : t("rankedRewards.claimError");
  } finally {
    claimingRewardId.value = "";
  }
}

function countdown(value?: string): string {
  const seconds = value
    ? Math.max(0, Math.ceil((new Date(value).getTime() - clock.value) / 1_000))
    : 0;
  const minutes = Math.floor(seconds / 60);
  return t("rankedMatch.duration", {
    minutes,
    seconds: String(seconds % 60).padStart(2, "0"),
  });
}

function formatDate(value: string): string {
  return new Intl.DateTimeFormat(locale.value, { dateStyle: "medium" }).format(new Date(value));
}

function formatDateTime(value: string): string {
  return new Intl.DateTimeFormat(locale.value, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function leaderboardRankLabel(entry: RankedLeaderboardEntry): string {
  const tier = t(`rankedMatch.tiers.${entry.standing.tier}`);
  return entry.standing.division
    ? t("rankedMatch.rankName", { tier, division: entry.standing.division })
    : tier;
}

let pollTimer: ReturnType<typeof setInterval> | undefined;
let clockTimer: ReturnType<typeof setInterval> | undefined;
let pollTick = 0;
onMounted(() => {
  clockTimer = setInterval(() => (clock.value = Date.now()), 1_000);
  pollTimer = setInterval(() => {
    pollTick += 1;
    const fallbackDue = realtimeStatus.value !== "connected" || pollTick % 6 === 0;
    if (
      fallbackDue &&
      !document.hidden &&
      (state.value?.status === "searching" || state.value?.status === "accepting") &&
      !mutating.value
    ) {
      void refresh();
    }
  }, 2_500);
});
onUnmounted(() => {
  if (pollTimer) clearInterval(pollTimer);
  if (clockTimer) clearInterval(clockTimer);
});
</script>
