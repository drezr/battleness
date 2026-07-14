<template>
  <article class="card campaign-reward-card">
    <h3>{{ title }}</h3>
    <dl class="summary-grid">
      <div class="stat">
        <dt>{{ t("common.credits") }}</dt>
        <dd>{{ reward.credits }}</dd>
      </div>
      <div class="stat">
        <dt>{{ t("stats.heroXp") }}</dt>
        <dd>{{ reward.heroExperience }}</dd>
      </div>
    </dl>
    <ul class="clean-list">
      <li v-for="material in reward.materials" :key="material.materialId" class="row-list-item">
        <span>{{ contentText(`material.${material.materialId}.name`, material.label) }}</span>
        <strong>{{ t("common.multiplier", { count: material.quantity }) }}</strong>
      </li>
    </ul>
  </article>
</template>

<script setup lang="ts">
import type { CampaignRewardPreview } from "~/utils/playerState";

defineProps<{
  title: string;
  reward: CampaignRewardPreview;
}>();
const { t } = useI18n();
const contentText = useContentText();
</script>
