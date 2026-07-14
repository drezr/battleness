<template>
  <main class="shell">
    <nav class="section-nav" :aria-label="t('accessibility.profileNavigation')">
      <NuxtLink
        v-for="link in sectionLinks.profile"
        :key="link.to"
        :class="{ active: route.path === link.to }"
        :to="link.to"
      >
        {{ $t(link.labelKey) }}
      </NuxtLink>
    </nav>

    <header class="view-header">
      <div class="view-title">
        <span class="eyebrow">{{ t("profile.section") }}</span>
        <h1>{{ t("profile.history.title") }}</h1>
        <p class="muted">{{ t("profile.history.description") }}</p>
      </div>
      <dl v-if="state" class="summary-grid compact-summary">
        <div class="stat">
          <dt>{{ t("profile.history.heroXp") }}</dt>
          <dd>{{ state.player.experience }}</dd>
        </div>
        <div class="stat">
          <dt>{{ t("common.level") }}</dt>
          <dd>{{ state.player.level }}</dd>
        </div>
      </dl>
    </header>

    <p v-if="pending" class="panel">{{ t("profile.history.loading") }}</p>
    <p v-else-if="error" class="panel">{{ t("profile.history.loadError") }}</p>

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
const { t } = useI18n();
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
