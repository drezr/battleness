<template>
  <main class="shell battle-history-page">
    <nav class="section-nav" :aria-label="t('accessibility.battleNavigation')">
      <NuxtLink
        v-for="link in sectionLinks.battle"
        :key="link.to"
        :class="{ active: route.path === link.to }"
        :to="link.to"
      >
        {{ t(link.labelKey) }}
      </NuxtLink>
    </nav>

    <header class="view-header battle-history-header">
      <div class="view-title">
        <span class="eyebrow">{{ t("battle.section") }}</span>
        <h1>{{ t("battle.history.title") }}</h1>
        <p class="muted">{{ t("battle.history.description") }}</p>
      </div>
      <NuxtLink class="battle-history-new-match" to="/battle">
        <Swords :size="18" /> {{ t("battle.history.newBattle") }} <ArrowRight :size="16" />
      </NuxtLink>
    </header>

    <p v-if="pending" class="panel">{{ t("battle.history.loading") }}</p>
    <p v-else-if="error" class="panel">{{ t("battle.history.loadError") }}</p>

    <template v-else-if="state">
      <p v-if="feedback" class="feedback">{{ feedback }}</p>

      <section class="battle-history-overview" :aria-label="t('battle.history.overview')">
        <div>
          <History :size="20" />
          <span
            ><small>{{ t("battle.history.totalBattles") }}</small
            ><strong>{{ state.records.length }}</strong></span
          >
        </div>
        <div class="wins">
          <Trophy :size="20" />
          <span
            ><small>{{ t("battle.history.victories") }}</small
            ><strong>{{ winCount }}</strong></span
          >
        </div>
        <div>
          <Gauge :size="20" />
          <span
            ><small>{{ t("battle.history.winRate") }}</small
            ><strong>{{ winRate }}%</strong></span
          >
        </div>
        <div :class="{ pending: unclaimedCount > 0 }">
          <Gift :size="20" />
          <span
            ><small>{{ t("battle.history.pendingRewards") }}</small
            ><strong>{{ unclaimedCount }}</strong></span
          >
        </div>
      </section>

      <RankedSeasonRewardList
        :rewards="state.seasonRewards"
        :claiming-reward-id="claimingRewardId"
        @claim="claimReward"
      />

      <section class="battle-history-browser">
        <div class="battle-history-toolbar">
          <div>
            <span class="eyebrow">{{ t("battle.history.archiveLabel") }}</span>
            <h2>{{ t("battle.history.archiveTitle") }}</h2>
          </div>
          <div class="battle-history-filters" :aria-label="t('battle.history.filterLabel')">
            <button
              v-for="filter in filters"
              :key="filter.value"
              type="button"
              :class="{ active: activeFilter === filter.value }"
              @click="activeFilter = filter.value"
            >
              {{ t(filter.labelKey) }}
              <span>{{ filter.count }}</span>
            </button>
          </div>
        </div>
        <BattleHistoryList
          :records="filteredRecords"
          :claiming-reward-id="claimingRewardId"
          @claim="claimReward"
        />
      </section>
    </template>
  </main>
</template>

<script setup lang="ts">
import { ArrowRight, Gauge, Gift, History, Swords, Trophy } from "@lucide/vue";
import type { BattleHistoryRecordView, BattleHistoryState } from "~/utils/playerState";
import { sectionLinks } from "~/utils/viewData";

type HistoryFilter = "all" | BattleHistoryRecordView["outcome"];

const route = useRoute();
const { t } = useI18n();
const { data: state, error, pending } = await useFetch<BattleHistoryState>("/api/battle/history");
const claimingRewardId = ref("");
const feedback = ref("");
const activeFilter = ref<HistoryFilter>("all");

const unclaimedCount = computed(
  () =>
    (state.value?.records.filter((record) => record.reward?.status === "unclaimed").length ?? 0) +
    (state.value?.seasonRewards.filter((entry) => entry.reward.status === "unclaimed").length ?? 0),
);
const winCount = computed(
  () => state.value?.records.filter((record) => record.outcome === "win").length ?? 0,
);
const winRate = computed(() =>
  state.value?.records.length ? Math.round((winCount.value / state.value.records.length) * 100) : 0,
);
const filters = computed(() =>
  (["all", "win", "draw", "loss"] as const).map((value) => ({
    value,
    labelKey: `battle.history.filter.${value}`,
    count:
      value === "all"
        ? (state.value?.records.length ?? 0)
        : (state.value?.records.filter((record) => record.outcome === value).length ?? 0),
  })),
);
const filteredRecords = computed(() =>
  activeFilter.value === "all"
    ? (state.value?.records ?? [])
    : (state.value?.records.filter((record) => record.outcome === activeFilter.value) ?? []),
);

async function claimReward(rewardGrantId: string): Promise<void> {
  claimingRewardId.value = rewardGrantId;
  feedback.value = "";

  try {
    state.value = await $fetch<BattleHistoryState>("/api/battle/rewards/claim", {
      method: "POST",
      body: { rewardGrantId },
    });
    feedback.value = t("profile.history.claimed");
    await refreshNuxtData();
  } catch (claimError) {
    feedback.value =
      claimError instanceof Error ? claimError.message : t("profile.history.claimError");
  } finally {
    claimingRewardId.value = "";
  }
}
</script>
