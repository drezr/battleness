<template>
  <main class="shell">
    <nav class="section-nav" aria-label="Profile navigation">
      <NuxtLink
        v-for="link in sectionLinks.profile"
        :key="link.to"
        :class="{ active: route.path === link.to }"
        :to="link.to"
      >
        {{ link.label }}
      </NuxtLink>
    </nav>

    <header class="view-header">
      <div class="view-title">
        <span class="eyebrow">Profile</span>
        <h1>Match And Reward History</h1>
        <p class="muted">Review progression earned from completed battles.</p>
      </div>
      <dl v-if="state" class="summary-grid compact-summary">
        <div class="stat">
          <dt>Hero XP</dt>
          <dd>{{ state.player.experience }}</dd>
        </div>
        <div class="stat">
          <dt>Level</dt>
          <dd>{{ state.player.level }}</dd>
        </div>
      </dl>
    </header>

    <p v-if="pending" class="panel">Loading profile history...</p>
    <p v-else-if="error" class="panel">Unable to load profile history.</p>

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
