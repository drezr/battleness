<template>
  <section v-if="rewards.length" class="ranked-season-rewards">
    <header class="ranked-leaderboard-title">
      <div>
        <span class="eyebrow">{{ t("rankedRewards.sectionLabel") }}</span>
        <h2>{{ t("rankedRewards.title") }}</h2>
      </div>
      <span class="pill">{{ t("rankedRewards.rewardCount", { count: rewards.length }) }}</span>
    </header>

    <div class="ranked-reward-grid">
      <article v-for="entry in rewards" :key="entry.seasonId" class="panel ranked-reward-panel">
        <div class="ranked-leaderboard-title">
          <div>
            <span class="eyebrow">{{ t("rankedRewards.seasonResult") }}</span>
            <h3>{{ tierLabel(entry.tier) }}</h3>
          </div>
          <span :class="['pill', entry.reward.status === 'claimed' ? 'ready-note' : 'muted-pill']">
            {{ t(`battle.rewardStatus.${entry.reward.status}`) }}
          </span>
        </div>

        <dl class="summary-grid compact-summary">
          <div>
            <dt>{{ t("rankedRewards.peakRating") }}</dt>
            <dd>{{ entry.peakRating }}</dd>
          </div>
          <div>
            <dt>{{ t("rankedRewards.credits") }}</dt>
            <dd>+{{ entry.reward.credits }}</dd>
          </div>
          <div>
            <dt>{{ t("rankedRewards.materials") }}</dt>
            <dd>{{ entry.reward.materials.length }}</dd>
          </div>
        </dl>

        <ul class="clean-list reward-detail-list">
          <li v-for="material in entry.reward.materials" :key="material.materialId">
            <span>{{ material.label }}</span>
            <strong>+{{ material.quantity }}</strong>
          </li>
          <li>
            <span>{{ t("rankedRewards.badge") }}</span>
            <strong>{{ t("rankedRewards.badgeName", { tier: tierLabel(entry.tier) }) }}</strong>
          </li>
          <li>
            <span>{{ t("rankedRewards.profileTitle") }}</span>
            <strong>{{ t("rankedRewards.titleName", { tier: tierLabel(entry.tier) }) }}</strong>
          </li>
        </ul>

        <button
          v-if="entry.reward.status === 'unclaimed'"
          type="button"
          :disabled="claimingRewardId === entry.reward.id"
          @click="$emit('claim', entry.reward.id)"
        >
          {{
            t(claimingRewardId === entry.reward.id ? "battle.live.claiming" : "rankedRewards.claim")
          }}
        </button>
      </article>
    </div>
  </section>
</template>

<script setup lang="ts">
import type { RankedSeasonRewardView } from "~/utils/playerState";

defineProps<{
  rewards: RankedSeasonRewardView[];
  claimingRewardId?: string;
}>();

defineEmits<{
  claim: [rewardGrantId: string];
}>();

const { t } = useI18n();

function tierLabel(tier: RankedSeasonRewardView["tier"]): string {
  return t(`rankedMatch.tiers.${tier}`);
}
</script>
