<template>
  <main class="shell">
    <nav class="section-nav" aria-label="Battle navigation">
      <NuxtLink v-for="link in sectionLinks.battle" :key="link.to" :to="link.to">
        {{ link.label }}
      </NuxtLink>
    </nav>

    <header class="view-header">
      <div class="view-title">
        <span class="eyebrow">Battle Result</span>
        <h1>{{ record ? record.outcome : "Result" }}</h1>
        <p class="muted">Verified battle record and persistent rewards.</p>
      </div>
      <NuxtLink class="button-link secondary-button" to="/battle/history">History</NuxtLink>
    </header>

    <p v-if="pending" class="panel">Loading battle result...</p>
    <p v-else-if="error || !record" class="panel">Battle result not found.</p>

    <template v-else>
      <p v-if="feedback" class="feedback">{{ feedback }}</p>
      <BattleHistoryList
        :records="[record]"
        :claiming-reward-id="claimingRewardId"
        @claim="claimReward"
      />
      <section class="panel battle-record-technical">
        <h2>Record Verification</h2>
        <dl class="summary-grid">
          <div class="stat">
            <dt>Record ID</dt>
            <dd>
              <code>{{ record.id }}</code>
            </dd>
          </div>
          <div class="stat">
            <dt>Seed</dt>
            <dd>
              <code>{{ record.seed }}</code>
            </dd>
          </div>
          <div class="stat">
            <dt>Rules</dt>
            <dd>{{ record.rulesVersion }}</dd>
          </div>
          <div class="stat">
            <dt>Content</dt>
            <dd>{{ record.contentVersion }}</dd>
          </div>
          <div class="stat">
            <dt>Checksum</dt>
            <dd>
              <code>{{ record.finalStateChecksum }}</code>
            </dd>
          </div>
        </dl>
      </section>
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
const battleId = computed(() => String(route.params.battleId));
const record = computed(
  () => state.value?.records.find((entry) => entry.id === battleId.value) ?? null,
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
