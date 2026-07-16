<template>
  <div v-if="records.length === 0" class="battle-history-empty">
    <Inbox :size="26" />
    <strong>{{ t("battle.noCompleted") }}</strong>
  </div>

  <section v-else class="battle-history-list">
    <article
      v-for="record in records"
      :key="record.id"
      :class="['battle-history-card', `outcome-${record.outcome}`]"
    >
      <div class="battle-history-outcome">
        <Trophy v-if="record.outcome === 'win'" :size="22" />
        <Scale v-else-if="record.outcome === 'draw'" :size="22" />
        <ShieldX v-else :size="22" />
      </div>

      <div class="battle-history-identity">
        <span class="eyebrow">{{ battleMode(record.mode) }}</span>
        <h2>{{ outcomeLabel(record.outcome) }}</h2>
        <span class="battle-history-date"
          ><CalendarDays :size="13" /> {{ formatDate(record.createdAt) }}</span
        >
      </div>

      <dl class="battle-history-metrics">
        <div>
          <dt>{{ t("stats.turns") }}</dt>
          <dd>{{ record.turnCount }}</dd>
        </div>
        <div>
          <dt>{{ t("stats.actions") }}</dt>
          <dd>{{ record.actionCount }}</dd>
        </div>
        <div>
          <dt>{{ t("battle.replay") }}</dt>
          <dd :class="{ verified: record.replayAvailable }">
            <BadgeCheck v-if="record.replayAvailable" :size="14" />
            {{ t(record.replayAvailable ? "battle.verified" : "battle.unavailable") }}
          </dd>
        </div>
      </dl>

      <div v-if="record.reward" class="battle-history-reward">
        <span :class="['battle-reward-state', record.reward.status]">
          <Gift :size="14" /> {{ rewardStatus(record.reward.status) }}
        </span>
        <div class="battle-reward-totals">
          <span v-if="record.reward.credits"
            ><Coins :size="14" /> +{{ record.reward.credits }}</span
          >
          <span v-if="record.reward.heroExperience"
            ><Zap :size="14" />
            {{
              t("battle.live.experienceReward", { experience: record.reward.heroExperience })
            }}</span
          >
          <span v-if="totalMaterials(record.reward)"
            ><Package :size="14" /> +{{ totalMaterials(record.reward) }}</span
          >
          <span v-if="totalItemExperience(record.reward)"
            ><Sparkles :size="14" />
            {{
              t("battle.live.experienceReward", { experience: totalItemExperience(record.reward) })
            }}</span
          >
        </div>
      </div>
      <div v-else class="battle-history-reward empty">
        <span>{{ t("battle.history.noReward") }}</span>
      </div>

      <div class="battle-history-actions">
        <NuxtLink class="button-link secondary-button" :to="`/battle/result/${record.id}`">
          {{ t("common.details") }} <ArrowRight :size="16" />
        </NuxtLink>
        <button
          v-if="record.reward?.status === 'unclaimed'"
          :disabled="claimingRewardId === record.reward.id"
          type="button"
          @click="$emit('claim', record.reward.id)"
        >
          <Gift :size="16" />
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
import {
  ArrowRight,
  BadgeCheck,
  CalendarDays,
  Coins,
  Gift,
  Inbox,
  Package,
  Scale,
  ShieldX,
  Sparkles,
  Trophy,
  Zap,
} from "@lucide/vue";
import type { BattleHistoryRecordView, BattleRewardView } from "~/utils/playerState";

defineProps<{
  records: BattleHistoryRecordView[];
  claimingRewardId?: string;
}>();
const { t, locale } = useI18n();

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
  return new Intl.DateTimeFormat(locale.value, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
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
