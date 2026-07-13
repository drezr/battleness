<template>
  <p v-if="records.length === 0" class="panel muted">No completed battles yet.</p>

  <section v-else class="battle-history-list">
    <article v-for="record in records" :key="record.id" class="panel battle-history-card">
      <div class="card-heading">
        <div>
          <span class="eyebrow">{{ record.mode }}</span>
          <h2 :class="`battle-outcome-${record.outcome}`">{{ record.outcome }}</h2>
        </div>
        <span class="pill muted-pill">{{ formatDate(record.createdAt) }}</span>
      </div>

      <dl class="summary-grid">
        <div class="stat">
          <dt>Turns</dt>
          <dd>{{ record.turnCount }}</dd>
        </div>
        <div class="stat">
          <dt>Actions</dt>
          <dd>{{ record.actionCount }}</dd>
        </div>
        <div class="stat">
          <dt>Replay</dt>
          <dd>{{ record.replayAvailable ? "Verified" : "Unavailable" }}</dd>
        </div>
      </dl>

      <section v-if="record.reward" class="reward-preview">
        <div class="card-heading">
          <h3>Rewards</h3>
          <span :class="['pill', record.reward.status === 'claimed' ? 'ready-note' : 'muted-pill']">
            {{ record.reward.status }}
          </span>
        </div>
        <dl class="summary-grid">
          <div class="stat">
            <dt>Credits</dt>
            <dd>+{{ record.reward.credits }}</dd>
          </div>
          <div class="stat">
            <dt>Hero XP</dt>
            <dd>+{{ record.reward.heroExperience }}</dd>
          </div>
          <div class="stat">
            <dt>Materials</dt>
            <dd>{{ totalMaterials(record.reward) }}</dd>
          </div>
          <div class="stat">
            <dt>Item XP</dt>
            <dd>{{ totalItemExperience(record.reward) }}</dd>
          </div>
        </dl>
        <ul v-if="record.reward.materials.length > 0" class="clean-list reward-detail-list">
          <li v-for="material in record.reward.materials" :key="material.materialId">
            <span>{{ material.label }}</span>
            <strong>+{{ material.quantity }}</strong>
          </li>
        </ul>
        <ul v-if="record.reward.items.length > 0" class="clean-list reward-detail-list">
          <li v-for="item in record.reward.items" :key="item.inventoryItemId">
            <span>{{ item.label }}</span>
            <strong>+{{ item.experience }} XP</strong>
          </li>
        </ul>
      </section>

      <div class="control-row">
        <NuxtLink class="button-link secondary-button" :to="`/battle/result/${record.id}`">
          Details
        </NuxtLink>
        <button
          v-if="record.reward?.status === 'unclaimed'"
          :disabled="claimingRewardId === record.reward.id"
          type="button"
          @click="$emit('claim', record.reward.id)"
        >
          {{ claimingRewardId === record.reward.id ? "Claiming" : "Claim Rewards" }}
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
  return new Date(value).toLocaleString();
}
</script>
