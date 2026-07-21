<template>
  <main class="shell battle-result-page">
    <nav class="section-nav" :aria-label="t('accessibility.battleNavigation')">
      <NuxtLink v-for="link in sectionLinks.battle" :key="link.to" :to="link.to">
        {{ t(link.labelKey) }}
      </NuxtLink>
    </nav>

    <p v-if="pending" class="panel">{{ t("battle.result.loading") }}</p>
    <p v-else-if="error || !record" class="panel">{{ t("battle.result.notFound") }}</p>

    <template v-else>
      <section :class="['battle-result-hero', `outcome-${record.outcome}`]">
        <div class="battle-result-emblem">
          <Trophy v-if="record.outcome === 'win'" :size="35" />
          <Scale v-else-if="record.outcome === 'draw'" :size="35" />
          <ShieldX v-else :size="35" />
        </div>
        <div class="battle-result-title">
          <span class="eyebrow">{{ battleMode(record.mode) }}</span>
          <h1>{{ t(`battle.outcome.${record.outcome}`) }}</h1>
          <p>{{ formatDate(record.createdAt) }}</p>
        </div>
        <dl class="battle-result-hero-metrics">
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
            <dd>
              <BadgeCheck v-if="record.replayAvailable" :size="15" />{{
                t(record.replayAvailable ? "battle.verified" : "battle.unavailable")
              }}
            </dd>
          </div>
        </dl>
        <NuxtLink class="battle-result-back" to="/battle/history">
          <ArrowLeft :size="16" /> {{ t("battle.result.backToHistory") }}
        </NuxtLink>
      </section>

      <p v-if="feedback" class="feedback">{{ feedback }}</p>

      <section v-if="record.reward" class="battle-result-reward-banner">
        <div class="battle-result-reward-icon"><Gift :size="25" /></div>
        <div>
          <span class="eyebrow">{{ t("battle.rewards") }}</span>
          <h2>{{ t(`battle.rewardStatus.${record.reward.status}`) }}</h2>
          <p>
            {{
              t("battle.result.rewardSummary", {
                credits: record.reward.credits,
                experience: record.reward.heroExperience,
              })
            }}
          </p>
        </div>
        <button
          v-if="record.reward.status === 'unclaimed'"
          type="button"
          :disabled="claimingRewardId === record.reward.id"
          @click="claimReward(record.reward.id)"
        >
          <Gift :size="17" />
          {{
            t(
              claimingRewardId === record.reward.id
                ? "battle.live.claiming"
                : "battle.live.claimRewards",
            )
          }}
        </button>
        <span v-else class="battle-result-reward-claimed"
          ><Check :size="16" /> {{ t("battle.result.rewardSecured") }}</span
        >
      </section>

      <BattleResultSummary
        v-if="record.summary"
        :mode="record.mode"
        :summary="record.summary"
        :reward="record.reward"
      />

      <details class="battle-record-technical">
        <summary>
          <span><ShieldCheck :size="18" /> {{ t("battle.result.verification") }}</span>
          <ChevronDown :size="17" />
        </summary>
        <dl class="battle-record-grid">
          <div>
            <dt>{{ t("battle.result.recordId") }}</dt>
            <dd>
              <code>{{ record.id }}</code>
            </dd>
          </div>
          <div>
            <dt>{{ t("battle.result.seed") }}</dt>
            <dd>
              <code>{{ record.seed }}</code>
            </dd>
          </div>
          <div>
            <dt>{{ t("battle.result.rules") }}</dt>
            <dd>{{ record.rulesVersion }}</dd>
          </div>
          <div>
            <dt>{{ t("battle.result.content") }}</dt>
            <dd>{{ record.contentVersion }}</dd>
          </div>
          <div class="checksum">
            <dt>{{ t("battle.result.checksum") }}</dt>
            <dd>
              <code>{{ record.finalStateChecksum }}</code>
            </dd>
          </div>
        </dl>
      </details>
    </template>
  </main>
</template>

<script setup lang="ts">
import {
  ArrowLeft,
  BadgeCheck,
  Check,
  ChevronDown,
  Gift,
  Scale,
  ShieldCheck,
  ShieldX,
  Trophy,
} from "@lucide/vue";
import type { BattleHistoryState } from "~/utils/playerState";
import { sectionLinks } from "~/utils/viewData";

const route = useRoute();
const { t, locale } = useI18n();
const { formatDateTime: formatLocalizedDateTime } = useDateTimeFormatter();
const { data: state, error, pending } = await useFetch<BattleHistoryState>("/api/battle/history");
const claimingRewardId = ref("");
const feedback = ref("");
const battleId = computed(() => String(route.params.battleId));
const record = computed(
  () => state.value?.records.find((entry) => entry.id === battleId.value) ?? null,
);

function formatDate(value: string): string {
  return formatLocalizedDateTime(value, { dateStyle: "long", timeStyle: "short" });
}

function battleMode(mode: string): string {
  return t(`battle.mode.${mode.toLowerCase()}`, mode);
}

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
