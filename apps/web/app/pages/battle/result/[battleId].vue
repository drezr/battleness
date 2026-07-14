<template>
  <main class="shell">
    <nav class="section-nav" :aria-label="t('accessibility.battleNavigation')">
      <NuxtLink v-for="link in sectionLinks.battle" :key="link.to" :to="link.to">
        {{ $t(link.labelKey) }}
      </NuxtLink>
    </nav>

    <header class="view-header">
      <div class="view-title">
        <span class="eyebrow">{{ t("battle.result.section") }}</span>
        <h1>{{ record ? t(`battle.outcome.${record.outcome}`) : t("battle.result.title") }}</h1>
        <p class="muted">{{ t("battle.result.description") }}</p>
      </div>
      <NuxtLink class="button-link secondary-button" to="/battle/history">{{
        t("navigation.history")
      }}</NuxtLink>
    </header>

    <p v-if="pending" class="panel">{{ t("battle.result.loading") }}</p>
    <p v-else-if="error || !record" class="panel">{{ t("battle.result.notFound") }}</p>

    <template v-else>
      <p v-if="feedback" class="feedback">{{ feedback }}</p>
      <BattleHistoryList
        :records="[record]"
        :claiming-reward-id="claimingRewardId"
        @claim="claimReward"
      />
      <BattleResultSummary
        v-if="record.summary"
        :summary="record.summary"
        :reward="record.reward"
      />
      <section class="panel battle-record-technical">
        <h2>{{ t("battle.result.verification") }}</h2>
        <dl class="summary-grid">
          <div class="stat">
            <dt>{{ t("battle.result.recordId") }}</dt>
            <dd>
              <code>{{ record.id }}</code>
            </dd>
          </div>
          <div class="stat">
            <dt>{{ t("battle.result.seed") }}</dt>
            <dd>
              <code>{{ record.seed }}</code>
            </dd>
          </div>
          <div class="stat">
            <dt>{{ t("battle.result.rules") }}</dt>
            <dd>{{ record.rulesVersion }}</dd>
          </div>
          <div class="stat">
            <dt>{{ t("battle.result.content") }}</dt>
            <dd>{{ record.contentVersion }}</dd>
          </div>
          <div class="stat">
            <dt>{{ t("battle.result.checksum") }}</dt>
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
const { t } = useI18n();
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
