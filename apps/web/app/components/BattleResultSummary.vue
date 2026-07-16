<template>
  <section class="battle-result-summary">
    <header class="battle-summary-header">
      <div>
        <span class="eyebrow">{{ t("battle.summary.verifiedLog") }}</span>
        <h2>{{ t("battle.summary.title") }}</h2>
      </div>
      <span v-if="reward" :class="['battle-reward-state', reward.status]">
        <Gift :size="14" /> {{ rewardStatus(reward.status) }}
      </span>
    </header>

    <section class="battle-summary-kpis">
      <div>
        <Clock3 :size="19" /><span
          ><small>{{ t("stats.turns") }}</small
          ><strong>{{ summary.turnCount }}</strong></span
        >
      </div>
      <div>
        <MousePointerClick :size="19" /><span
          ><small>{{ t("stats.actions") }}</small
          ><strong>{{ summary.actionCount }}</strong></span
        >
      </div>
      <div>
        <Flame :size="19" /><span
          ><small>{{ t("stats.totalDamage") }}</small
          ><strong>{{ totalDamage }}</strong></span
        >
      </div>
      <div>
        <Sparkles :size="19" /><span
          ><small>{{ t("stats.itemXp") }}</small
          ><strong>{{ totalItemExperience }}</strong></span
        >
      </div>
    </section>

    <section class="battle-contribution-section">
      <div class="battle-summary-section-title">
        <Users :size="18" />
        <h3>{{ t("battle.summary.playerContribution") }}</h3>
      </div>
      <div class="battle-contribution-grid">
        <article v-for="(player, index) in summary.players" :key="player.playerId">
          <div class="battle-player-index">
            {{ t("battle.summary.playerIndex", { index: index + 1 }) }}
          </div>
          <strong>{{ player.username }}</strong>
          <dl>
            <div>
              <dt>{{ t("stats.totalDamage") }}</dt>
              <dd>{{ player.damage }}</dd>
            </div>
            <div>
              <dt>{{ t("stats.actions") }}</dt>
              <dd>{{ player.actionCount }}</dd>
            </div>
          </dl>
        </article>
      </div>
    </section>

    <section class="battle-activity-section">
      <div class="battle-summary-section-title">
        <Activity :size="18" />
        <h3>{{ t("battle.summary.activityTitle") }}</h3>
      </div>
      <div class="battle-summary-activity-grid">
        <section v-for="group in activityGroups" :key="group.label" class="battle-activity-group">
          <h4>{{ group.label }}</h4>
          <p v-if="group.entries.length === 0">{{ t("battle.summary.none") }}</p>
          <ul v-else>
            <li v-for="entry in group.entries" :key="`${entry.playerId}:${entry.id}`">
              <span
                ><strong>{{ entry.label }}</strong
                ><small>{{ playerName(entry.playerId) }}</small></span
              >
              <strong>{{ t("common.multiplier", { count: entry.count }) }}</strong>
            </li>
          </ul>
        </section>
      </div>
    </section>

    <section v-if="reward" class="battle-earned-section">
      <div class="battle-summary-section-title">
        <Gift :size="18" />
        <h3>{{ t("battle.summary.earnedRewards") }}</h3>
      </div>
      <div class="battle-earned-grid">
        <div>
          <Coins :size="18" /><span
            ><small>{{ t("common.credits") }}</small
            ><strong>+{{ reward.credits }}</strong></span
          >
        </div>
        <div>
          <Zap :size="18" /><span
            ><small>{{ t("stats.heroXp") }}</small
            ><strong>+{{ reward.heroExperience }}</strong></span
          >
        </div>
        <div>
          <Package :size="18" /><span
            ><small>{{ t("common.materials") }}</small
            ><strong>+{{ totalMaterials }}</strong></span
          >
        </div>
        <div>
          <Sparkles :size="18" /><span
            ><small>{{ t("stats.itemXp") }}</small
            ><strong>+{{ totalItemExperience }}</strong></span
          >
        </div>
      </div>
      <div v-if="reward.materials.length || reward.items.length" class="battle-earned-details">
        <ul v-if="reward.materials.length">
          <li v-for="material in reward.materials" :key="material.materialId">
            <span>{{ contentText(`material.${material.materialId}.name`, material.label) }}</span>
            <strong>+{{ material.quantity }}</strong>
          </li>
        </ul>
        <ul v-if="reward.items.length">
          <li v-for="item in reward.items" :key="item.inventoryItemId">
            <span>{{ contentText(`${item.type}.${item.definitionId}.name`, item.label) }}</span>
            <strong>{{
              t("battle.live.experienceReward", { experience: item.experience })
            }}</strong>
          </li>
        </ul>
      </div>
    </section>
  </section>
</template>

<script setup lang="ts">
import {
  Activity,
  Clock3,
  Coins,
  Flame,
  Gift,
  MousePointerClick,
  Package,
  Sparkles,
  Users,
  Zap,
} from "@lucide/vue";
import type {
  BattleResultSummaryActivityView,
  BattleResultSummaryView,
  BattleRewardView,
} from "~/utils/playerState";

const props = defineProps<{
  summary: BattleResultSummaryView;
  reward?: BattleRewardView | null;
}>();
const { t } = useI18n();
const contentText = useContentText();

const totalDamage = computed(() =>
  props.summary.players.reduce((total, player) => total + player.damage, 0),
);
const totalItemExperience = computed(
  () => props.reward?.items.reduce((total, item) => total + item.experience, 0) ?? 0,
);
const totalMaterials = computed(
  () => props.reward?.materials.reduce((total, item) => total + item.quantity, 0) ?? 0,
);
const activityGroups = computed<{ label: string; entries: BattleResultSummaryActivityView[] }[]>(
  () => [
    { label: t("battle.summary.ringsUsed"), entries: props.summary.ringsUsed },
    { label: t("battle.summary.spellsCast"), entries: props.summary.spellsCast },
    { label: t("battle.summary.monstersSummoned"), entries: props.summary.monstersSummoned },
    { label: t("battle.summary.monsterAttacks"), entries: props.summary.monstersUsed },
  ],
);

function playerName(playerId: string): string {
  return props.summary.players.find((player) => player.playerId === playerId)?.username ?? playerId;
}

function rewardStatus(status: string): string {
  return t(`battle.rewardStatus.${status}`);
}
</script>
