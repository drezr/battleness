<template>
  <section class="panel battle-result-summary">
    <div class="card-heading">
      <div>
        <span class="eyebrow">{{ t("battle.summary.verifiedLog") }}</span>
        <h2>{{ t("battle.summary.title") }}</h2>
      </div>
      <span
        v-if="reward"
        :class="['pill', reward.status === 'claimed' ? 'ready-note' : 'muted-pill']"
      >
        {{ t("battle.summary.rewardStatus", { status: rewardStatus(reward.status) }) }}
      </span>
    </div>

    <dl class="summary-grid">
      <div class="stat">
        <dt>{{ t("stats.turns") }}</dt>
        <dd>{{ summary.turnCount }}</dd>
      </div>
      <div class="stat">
        <dt>{{ t("stats.actions") }}</dt>
        <dd>{{ summary.actionCount }}</dd>
      </div>
      <div class="stat">
        <dt>{{ t("stats.totalDamage") }}</dt>
        <dd>{{ totalDamage }}</dd>
      </div>
      <div class="stat">
        <dt>{{ t("stats.itemXp") }}</dt>
        <dd>{{ totalItemExperience }}</dd>
      </div>
    </dl>

    <section class="battle-summary-section">
      <h3>{{ t("battle.summary.playerContribution") }}</h3>
      <div class="battle-summary-table">
        <div v-for="player in summary.players" :key="player.playerId">
          <strong>{{ player.username }}</strong>
          <span>{{ t("battle.summary.damageValue", { count: player.damage }) }}</span>
          <span>{{ t("battle.summary.actionCount", { count: player.actionCount }) }}</span>
        </div>
      </div>
    </section>

    <div class="battle-summary-activity-grid">
      <section v-for="group in activityGroups" :key="group.label" class="battle-summary-section">
        <h3>{{ group.label }}</h3>
        <p v-if="group.entries.length === 0" class="muted">{{ t("battle.summary.none") }}</p>
        <ul v-else class="clean-list battle-summary-activity-list">
          <li v-for="entry in group.entries" :key="`${entry.playerId}:${entry.id}`">
            <span>
              <strong>{{ entry.label }}</strong>
              <small>{{ playerName(entry.playerId) }}</small>
            </span>
            <strong>{{ t("common.multiplier", { count: entry.count }) }}</strong>
          </li>
        </ul>
      </section>
    </div>
  </section>
</template>

<script setup lang="ts">
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

const totalDamage = computed(() =>
  props.summary.players.reduce((total, player) => total + player.damage, 0),
);
const totalItemExperience = computed(
  () => props.reward?.items.reduce((total, item) => total + item.experience, 0) ?? 0,
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
