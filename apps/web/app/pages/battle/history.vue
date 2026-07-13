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
        <h1>Battle History</h1>
        <p class="muted">Completed matches, deterministic records, and reward claims.</p>
      </div>
      <p v-if="state" class="status-note">
        {{ state.records.length }} records - {{ unclaimedCount }} rewards pending
      </p>
    </header>

    <p v-if="pending" class="panel">Loading battle history...</p>
    <p v-else-if="error" class="panel">Unable to load battle history.</p>

    <template v-else-if="state">
      <p v-if="feedback" class="feedback">{{ feedback }}</p>
      <BattleHistoryList
        :records="state.records"
        :claiming-reward-id="claimingRewardId"
        @claim="claimReward"
      />
    </template>
  </main>
</template>

<script setup lang="ts">
import type { BattleHistoryState } from "~/utils/playerState";
import { sectionLinks } from "~/utils/viewData";

const route = useRoute();
const { data: state, error, pending } = await useFetch<BattleHistoryState>("/api/battle/history");
const claimingRewardId = ref("");
const feedback = ref("");

const unclaimedCount = computed(
  () => state.value?.records.filter((record) => record.reward?.status === "unclaimed").length ?? 0,
);

async function claimReward(rewardGrantId: string): Promise<void> {
  claimingRewardId.value = rewardGrantId;
  feedback.value = "";

  try {
    state.value = await $fetch<BattleHistoryState>("/api/battle/rewards/claim", {
      method: "POST",
      body: { rewardGrantId },
    });
    feedback.value = "Battle rewards claimed.";
    await refreshNuxtData();
  } catch (claimError) {
    feedback.value = claimError instanceof Error ? claimError.message : "Reward claim failed.";
  } finally {
    claimingRewardId.value = "";
  }
}
</script>
