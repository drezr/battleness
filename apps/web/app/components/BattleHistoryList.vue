<template>
  <p v-if="records.length === 0" class="panel muted">{{ t("battle.noCompleted") }}</p>

  <section v-else class="battle-history-list">
    <article v-for="record in records" :key="record.id" class="panel battle-history-card">
      <div class="card-heading">
        <div>
          <span class="eyebrow">{{ battleMode(record.mode) }}</span>
          <h2 :class="`battle-outcome-${record.outcome}`">{{ outcomeLabel(record.outcome) }}</h2>
        </div>
        <span class="pill muted-pill">{{ formatDate(record.createdAt) }}</span>
      </div>

      <dl class="summary-grid">
        <div class="stat">
          <dt>{{ t("stats.turns") }}</dt>
          <dd>{{ record.turnCount }}</dd>
        </div>
        <div class="stat">
          <dt>{{ t("stats.actions") }}</dt>
          <dd>{{ record.actionCount }}</dd>
        </div>
        <div class="stat">
          <dt>{{ t("battle.replay") }}</dt>
          <dd>{{ t(record.replayAvailable ? "battle.verified" : "battle.unavailable") }}</dd>
        </div>
      </dl>

      <section v-if="record.reward" class="reward-preview">
        <div class="card-heading">
          <h3>{{ t("battle.rewards") }}</h3>
          <span :class="['pill', record.reward.status === 'claimed' ? 'ready-note' : 'muted-pill']">
            {{ rewardStatus(record.reward.status) }}
          </span>
        </div>
        <dl class="summary-grid">
          <div class="stat">
            <dt>{{ t("common.credits") }}</dt>
            <dd>+{{ record.reward.credits }}</dd>
          </div>
          <div class="stat">
            <dt>{{ t("stats.heroXp") }}</dt>
            <dd>+{{ record.reward.heroExperience }}</dd>
          </div>
          <div class="stat">
            <dt>{{ t("common.materials") }}</dt>
            <dd>{{ totalMaterials(record.reward) }}</dd>
          </div>
          <div class="stat">
            <dt>{{ t("stats.itemXp") }}</dt>
            <dd>{{ totalItemExperience(record.reward) }}</dd>
          </div>
        </dl>
        <ul v-if="record.reward.materials.length > 0" class="clean-list reward-detail-list">
          <li v-for="material in record.reward.materials" :key="material.materialId">
            <span>{{ contentText(`material.${material.materialId}.name`, material.label) }}</span>
            <strong>+{{ material.quantity }}</strong>
          </li>
        </ul>
        <ul v-if="record.reward.items.length > 0" class="clean-list reward-detail-list">
          <li v-for="item in record.reward.items" :key="item.inventoryItemId">
            <span>{{ contentText(`${item.type}.${item.definitionId}.name`, item.label) }}</span>
            <strong>{{
              t("battle.live.experienceReward", { experience: item.experience })
            }}</strong>
          </li>
        </ul>
      </section>

      <div class="control-row">
        <NuxtLink class="button-link secondary-button" :to="`/battle/result/${record.id}`">
          {{ t("common.details") }}
        </NuxtLink>
        <button
          v-if="record.reward?.status === 'unclaimed'"
          :disabled="claimingRewardId === record.reward.id"
          type="button"
          @click="$emit('claim', record.reward.id)"
        >
          {{
            t(
              claimingRewardId === record.reward.id
                ? "battle.live.claiming"
                : "battle.live.claimRewards",
            )
          }}
        </button>
      </div>
    </article>
  </section>
</template>

<script setup lang="ts">
import type { BattleHistoryRecordView, BattleRewardView } from "~/utils/playerState";

defineProps<{
  records: BattleHistoryRecordView[];
  claimingRewardId?: string;
}>();
const { t, locale } = useI18n();
const contentText = useContentText();

defineEmits<{
  claim: [rewardGrantId: string];
}>();

function totalMaterials(reward: BattleRewardView): number {
  return reward.materials.reduce((total, material) => total + material.quantity, 0);
}

function totalItemExperience(reward: BattleRewardView): number {
  return reward.items.reduce((total, item) => total + item.experience, 0);
}

function formatDate(value: string): string {
  return new Date(value).toLocaleString(locale.value);
}

function outcomeLabel(outcome: string): string {
  return t(`battle.outcome.${outcome}`);
}

function rewardStatus(status: string): string {
  return t(`battle.rewardStatus.${status}`);
}

function battleMode(mode: string): string {
  const key = `battle.mode.${mode.toLowerCase()}`;
  return t(key, mode);
}
</script>
