<template>
  <main class="shell">
    <nav class="section-nav" :aria-label="t('accessibility.battleNavigation')">
      <NuxtLink v-for="link in sectionLinks.battle" :key="link.to" :to="link.to">
        {{ $t(link.labelKey) }}
      </NuxtLink>
    </nav>

    <header class="view-header">
      <div class="view-title">
        <span class="eyebrow">{{ battle?.mode ?? "Battle" }}</span>
        <h1>{{ t("battle.live.title") }}</h1>
        <p class="muted">{{ statusLabel }}</p>
      </div>
      <div class="view-status-stack">
        <span :class="['pill', `realtime-${realtimeStatus}`]">
          {{ t(`realtime.${realtimeStatus}`) }}
        </span>
        <NuxtLink class="button-link secondary-button" to="/battle">{{
          t("battle.live.leave")
        }}</NuxtLink>
      </div>
    </header>

    <p v-if="pending" class="panel">{{ t("battle.live.loading") }}</p>
    <p v-else-if="error || !battle" class="panel">{{ t("battle.live.notFound") }}</p>

    <template v-else>
      <section class="live-battle-status" :aria-label="t('accessibility.battleStatus')">
        <div>
          <span class="eyebrow">{{ t("battle.live.turn") }}</span>
          <strong>{{ battle.turnCount }}</strong>
        </div>
        <div>
          <span class="eyebrow">{{ t("battle.live.activePlayer") }}</span>
          <strong>{{ activePlayerName }}</strong>
        </div>
        <div>
          <span class="eyebrow">{{ t("stats.actions") }}</span>
          <strong>{{ battle.actionCount }}</strong>
        </div>
        <div>
          <span class="eyebrow">{{ t("battle.live.status") }}</span>
          <strong>{{ battle.status }}</strong>
        </div>
        <div v-if="isPvpBattle && deadlineSecondsRemaining !== null">
          <span class="eyebrow">{{ deadlineLabel }}</span>
          <strong>{{ formattedDeadlineTime }}</strong>
        </div>
      </section>

      <section class="panel live-battlefield opponent-field">
        <div class="live-player-heading">
          <div>
            <span class="eyebrow">{{ t("battle.live.opponent") }}</span>
            <h2>{{ battle.opponent.username }}</h2>
          </div>
          <span class="pill">{{
            t("battle.live.hiddenRings", { count: battle.opponent.ringCount })
          }}</span>
        </div>

        <div class="live-combat-row opponent-row">
          <article class="live-hero">
            <span class="eyebrow">{{
              t("battle.live.level", { level: battle.opponent.level })
            }}</span>
            <strong>{{ battle.opponent.username }}</strong>
            <dl>
              <div>
                <dt>{{ t("stats.health") }}</dt>
                <dd>{{ battle.opponent.hero.health }}/{{ battle.opponent.hero.maxHealth }}</dd>
              </div>
              <div>
                <dt>{{ t("stats.speed") }}</dt>
                <dd>{{ battle.opponent.hero.speed }}</dd>
              </div>
              <div>
                <dt>{{ t("stats.energy") }}</dt>
                <dd>
                  {{ battle.opponent.energy.current }}/{{ battle.opponent.energy.maxForTurn }}
                </dd>
              </div>
            </dl>
          </article>
          <div class="live-monster-grid">
            <article
              v-for="monster in battle.opponent.monsters"
              :key="monster.id"
              :class="['live-monster', `rarity-border-${monster.rarity}`]"
            >
              <ItemArtwork :definition-id="monster.definitionId" kind="monster" />
              <strong>{{
                contentText(`monster.${monster.definitionId}.name`, monster.label)
              }}</strong>
              <small>{{
                t("battle.live.healthValue", {
                  current: monster.health,
                  maximum: monster.maxHealth,
                })
              }}</small>
              <small>{{
                t("battle.live.monsterStats", {
                  damage: monster.damage,
                  current: monster.currentCooldown,
                  maximum: monster.cooldown,
                })
              }}</small>
            </article>
            <div
              v-for="slot in Math.max(0, 3 - battle.opponent.monsters.length)"
              :key="`opponent-empty-${slot}`"
              class="live-monster empty-slot"
              :aria-label="t('accessibility.emptyMonsterSlot')"
            />
          </div>
        </div>
      </section>

      <section class="panel live-battlefield viewer-field">
        <div class="live-combat-row">
          <article class="live-hero">
            <span class="eyebrow">{{
              t("battle.live.level", { level: battle.viewer.level })
            }}</span>
            <strong>{{ battle.viewer.username }}</strong>
            <dl>
              <div>
                <dt>{{ t("stats.health") }}</dt>
                <dd>{{ battle.viewer.hero.health }}/{{ battle.viewer.hero.maxHealth }}</dd>
              </div>
              <div>
                <dt>{{ t("stats.speed") }}</dt>
                <dd>{{ battle.viewer.hero.speed }}</dd>
              </div>
              <div>
                <dt>{{ t("stats.energy") }}</dt>
                <dd>{{ battle.viewer.energy.current }}/{{ battle.viewer.energy.maxForTurn }}</dd>
              </div>
            </dl>
          </article>
          <div class="live-monster-grid">
            <article
              v-for="monster in battle.viewer.monsters"
              :key="monster.id"
              :class="['live-monster', `rarity-border-${monster.rarity}`]"
            >
              <ItemArtwork :definition-id="monster.definitionId" kind="monster" />
              <strong>{{
                contentText(`monster.${monster.definitionId}.name`, monster.label)
              }}</strong>
              <small>{{
                t("battle.live.healthValue", {
                  current: monster.health,
                  maximum: monster.maxHealth,
                })
              }}</small>
              <small>{{
                t("battle.live.monsterStats", {
                  damage: monster.damage,
                  current: monster.currentCooldown,
                  maximum: monster.cooldown,
                })
              }}</small>
              <div class="live-action-controls">
                <select
                  v-model="selectedTargets[monster.id]"
                  :aria-label="
                    t('battle.live.targetFor', {
                      source: contentText(`monster.${monster.definitionId}.name`, monster.label),
                    })
                  "
                  :disabled="!canAct || submitting"
                >
                  <option v-for="target in targets" :key="target.id" :value="target.id">
                    {{ target.label }}
                  </option>
                </select>
                <button
                  type="button"
                  :disabled="!canUseMonster(monster)"
                  @click="useMonster(monster.id)"
                >
                  {{ t("battle.live.attack") }}
                </button>
              </div>
            </article>
            <div
              v-for="slot in Math.max(0, 3 - battle.viewer.monsters.length)"
              :key="`viewer-empty-${slot}`"
              class="live-monster empty-slot"
              :aria-label="t('accessibility.emptyMonsterSlot')"
            />
          </div>
        </div>

        <div class="live-player-heading">
          <div>
            <span class="eyebrow">{{ t("battle.live.activeLoadout") }}</span>
            <h2>{{ t("battle.live.ringCount", { count: battle.viewer.ringCount }) }}</h2>
          </div>
          <span :class="['status-note', isViewerTurn ? 'ready-note' : '']">
            {{ t(isViewerTurn ? "battle.live.yourTurn" : "battle.live.opponentTurn") }}
          </span>
        </div>

        <div class="live-ring-row">
          <article
            v-for="ring in battle.viewer.rings ?? []"
            :key="ring.id"
            :class="['live-ring', `rarity-border-${ring.rarity}`]"
          >
            <ItemArtwork :definition-id="ring.definitionId" kind="ring" />
            <span :class="['pill', `element-${ring.element}`]">{{ ring.element }}</span>
            <strong>{{ contentText(`ring.${ring.definitionId}.name`, ring.label) }}</strong>
            <dl>
              <div>
                <dt>{{ t("stats.damage") }}</dt>
                <dd>{{ ring.damage }}</dd>
              </div>
              <div>
                <dt>{{ t("stats.energy") }}</dt>
                <dd>{{ ring.energyCost }}</dd>
              </div>
              <div>
                <dt>{{ t("stats.cooldown") }}</dt>
                <dd>{{ ring.currentCooldown }}/{{ ring.cooldown }}</dd>
              </div>
            </dl>
            <div class="live-gem-row">
              <ItemArtwork
                v-for="gem in ring.gems"
                :key="gem.id"
                :definition-id="gem.definitionId"
                kind="gem"
                :title="contentText(`gem.${gem.definitionId}.name`, gem.label)"
              />
            </div>
            <div class="live-action-controls">
              <select
                v-model="selectedTargets[ring.id]"
                :aria-label="
                  t('battle.live.targetFor', {
                    source: contentText(`ring.${ring.definitionId}.name`, ring.label),
                  })
                "
                :disabled="!canAct || submitting"
              >
                <option v-for="target in targets" :key="target.id" :value="target.id">
                  {{ target.label }}
                </option>
              </select>
              <button type="button" :disabled="!canUseRing(ring)" @click="useRing(ring.id)">
                {{ t("battle.live.useRing") }}
              </button>
            </div>
          </article>
        </div>
      </section>

      <section v-if="battle.status === 'choosingFirstPlayer'" class="panel live-choice-panel">
        <div>
          <span class="eyebrow">{{ t("battle.live.elementDuel") }}</span>
          <h2>{{ t("battle.live.chooseElement") }}</h2>
          <p class="muted">
            {{ t("battle.live.openingDuelRound", { round: battle.openingDuelRound }) }}
            <template v-if="battle.openingDuelChoiceSubmitted">
              · {{ t("battle.live.openingDuelWaiting") }}
            </template>
          </p>
        </div>
        <div class="segmented-control live-element-choice">
          <button
            v-for="element in elements"
            :key="element"
            type="button"
            :disabled="submitting || battle.openingDuelChoiceSubmitted"
            @click="chooseElement(element)"
          >
            {{ element }}
          </button>
        </div>
      </section>

      <section class="panel live-command-bar" :aria-label="t('accessibility.battleCommands')">
        <div>
          <span class="eyebrow">{{ t("battle.live.serverActions") }}</span>
          <strong>{{ actionFeedback }}</strong>
        </div>
        <div class="live-command-buttons">
          <button type="button" :disabled="!canAct || submitting" @click="endTurn">
            {{ t("battle.live.endTurn") }}
          </button>
          <button
            type="button"
            class="secondary-button"
            :disabled="battle.status === 'finished' || submitting"
            @click="concede"
          >
            {{ t("battle.live.concede") }}
          </button>
        </div>
      </section>

      <BattleResultSummary
        v-if="battle.status === 'finished' && battle.summary"
        :summary="battle.summary"
        :reward="battle.reward"
      />

      <section v-if="battle.status === 'finished' && battle.reward" class="panel reward-preview">
        <div class="card-heading">
          <div>
            <span class="eyebrow">{{ t("battle.live.settlement") }}</span>
            <h2>{{ resultLabel }}</h2>
          </div>
          <span :class="['pill', battle.reward.status === 'claimed' ? 'ready-note' : 'muted-pill']">
            {{ battle.reward.status }}
          </span>
        </div>
        <dl class="summary-grid">
          <div class="stat">
            <dt>{{ t("common.credits") }}</dt>
            <dd>+{{ battle.reward.credits }}</dd>
          </div>
          <div class="stat">
            <dt>{{ t("stats.heroXp") }}</dt>
            <dd>+{{ battle.reward.heroExperience }}</dd>
          </div>
          <div class="stat">
            <dt>{{ t("common.materials") }}</dt>
            <dd>{{ totalRewardMaterials }}</dd>
          </div>
          <div class="stat">
            <dt>{{ t("stats.itemXp") }}</dt>
            <dd>{{ totalRewardItemExperience }}</dd>
          </div>
        </dl>
        <ul v-if="battle.reward.materials.length > 0" class="clean-list reward-detail-list">
          <li v-for="material in battle.reward.materials" :key="material.materialId">
            <span>{{ contentText(`material.${material.materialId}.name`, material.label) }}</span>
            <strong>+{{ material.quantity }}</strong>
          </li>
        </ul>
        <ul v-if="battle.reward.items.length > 0" class="clean-list reward-detail-list">
          <li v-for="item in battle.reward.items" :key="item.inventoryItemId">
            <span>{{ contentText(`${item.type}.${item.definitionId}.name`, item.label) }}</span>
            <strong>{{
              t("battle.live.experienceReward", { experience: item.experience })
            }}</strong>
          </li>
        </ul>
        <div class="control-row">
          <NuxtLink class="button-link secondary-button" :to="`/battle/result/${battle.id}`">
            {{ t("battle.live.resultDetails") }}
          </NuxtLink>
          <button
            v-if="battle.reward.status === 'unclaimed'"
            type="button"
            :disabled="claimingReward"
            @click="claimReward"
          >
            {{ t(claimingReward ? "battle.live.claiming" : "battle.live.claimRewards") }}
          </button>
        </div>
      </section>

      <p v-if="actionError" class="panel live-action-error" role="alert">
        {{ actionError }}
      </p>
    </template>
  </main>
</template>

<script setup lang="ts">
import type {
  LiveBattleActionCommand,
  LiveBattleActionResponse,
  LiveBattleMonsterView,
  LiveBattleRingView,
  LiveBattleState,
} from "~/utils/playerState";
import { sectionLinks } from "~/utils/viewData";

const route = useRoute();
const { t } = useI18n();
const contentText = useContentText();
const battleId = computed(() => String(route.params.battleId));
const {
  data: battle,
  error,
  pending,
  refresh,
} = await useFetch<LiveBattleState>(() => `/api/battle/live/${battleId.value}`);
const isPvpBattle = computed(() =>
  ["private_pvp", "casual_pvp"].includes(battle.value?.mode ?? ""),
);
const { status: realtimeStatus } = useGameRealtime((event) => {
  if (event.type === "battleChanged" && event.battleId === battleId.value) {
    void refresh();
  }
});
const isViewerTurn = computed(() => battle.value?.activePlayerId === battle.value?.viewer.id);
const canAct = computed(
  () => battle.value?.status === "active" && isViewerTurn.value && !submitting.value,
);
const elements = ["electric", "fire", "ice"] as const;
const selectedTargets = reactive<Record<string, string>>({});
const submitting = ref(false);
const claimingReward = ref(false);
const actionError = ref("");
const lastEventTypes = ref<string[]>([]);
const clockNow = ref(Date.now());
const activeDeadlineAt = computed(() =>
  battle.value?.status === "choosingFirstPlayer"
    ? battle.value.openingDuelDeadlineAt
    : battle.value?.turnDeadlineAt,
);
const deadlineSecondsRemaining = computed(() => {
  if (!activeDeadlineAt.value) return null;
  return Math.max(0, Math.ceil((Date.parse(activeDeadlineAt.value) - clockNow.value) / 1000));
});
const formattedDeadlineTime = computed(() => {
  const remaining = deadlineSecondsRemaining.value;
  if (remaining === null) return "";
  const minutes = Math.floor(remaining / 60);
  const seconds = remaining % 60;
  return `${minutes}:${String(seconds).padStart(2, "0")}`;
});
const deadlineLabel = computed(() =>
  t(
    battle.value?.status === "choosingFirstPlayer"
      ? "battle.live.openingDuelDeadline"
      : "battle.live.turnDeadline",
  ),
);
let refreshedExpiredDeadline = "";
watch([activeDeadlineAt, deadlineSecondsRemaining], ([deadline, remaining]) => {
  if (deadline && remaining === 0 && refreshedExpiredDeadline !== deadline && !submitting.value) {
    refreshedExpiredDeadline = deadline;
    void refresh();
  }
});
const targets = computed(() => {
  const currentBattle = battle.value;
  if (!currentBattle) {
    return [];
  }

  return [
    {
      id: currentBattle.opponent.heroTargetId,
      label: `${currentBattle.opponent.username} - ${t("common.hero")}`,
    },
    ...currentBattle.opponent.monsters.map((monster) => ({
      id: monster.id,
      label: `${currentBattle.opponent.username} - ${contentText(`monster.${monster.definitionId}.name`, monster.label)}`,
    })),
    {
      id: currentBattle.viewer.heroTargetId,
      label: `${currentBattle.viewer.username} - ${t("common.hero")}`,
    },
    ...currentBattle.viewer.monsters.map((monster) => ({
      id: monster.id,
      label: `${currentBattle.viewer.username} - ${contentText(`monster.${monster.definitionId}.name`, monster.label)}`,
    })),
  ];
});
const actionFeedback = computed(() => {
  if (submitting.value) {
    return t("battle.live.submitting");
  }
  if (lastEventTypes.value.length > 0) {
    return lastEventTypes.value.join(" - ");
  }
  if (battle.value?.status === "finished") {
    return t("battle.live.finished");
  }
  return t(canAct.value ? "battle.live.chooseAction" : "battle.live.waiting");
});
const resultLabel = computed(() => {
  const result = battle.value?.result;
  if (!result) {
    return t("battle.live.pending");
  }
  if (result.type === "draw") {
    return t("battle.live.draw");
  }
  return t(
    result.winnerId === battle.value?.viewer.id ? "battle.live.victory" : "battle.live.defeat",
  );
});
const totalRewardMaterials = computed(
  () =>
    battle.value?.reward?.materials.reduce((total, material) => total + material.quantity, 0) ?? 0,
);
const totalRewardItemExperience = computed(
  () => battle.value?.reward?.items.reduce((total, item) => total + item.experience, 0) ?? 0,
);
const activePlayerName = computed(() => {
  if (!battle.value?.activePlayerId) {
    return t("battle.live.pending");
  }
  return battle.value.activePlayerId === battle.value.viewer.id
    ? battle.value.viewer.username
    : battle.value.opponent.username;
});
const statusLabel = computed(() => {
  if (!battle.value) {
    return t("battle.live.serverState");
  }
  if (battle.value.status === "choosingFirstPlayer") {
    return t(
      battle.value.openingDuelChoiceSubmitted
        ? "battle.live.openingDuelWaiting"
        : "battle.live.firstPlayerPending",
    );
  }
  if (battle.value.status === "finished") {
    return t("battle.live.finished");
  }
  return t(isViewerTurn.value ? "battle.live.yourTurnStatus" : "battle.live.opponentTurnStatus");
});

watch(
  [battle, targets],
  () => {
    const defaultTarget = targets.value[0]?.id;
    if (!battle.value || !defaultTarget) {
      return;
    }

    const validTargetIds = new Set(targets.value.map((target) => target.id));
    for (const source of [...(battle.value.viewer.rings ?? []), ...battle.value.viewer.monsters]) {
      if (!selectedTargets[source.id] || !validTargetIds.has(selectedTargets[source.id]!)) {
        selectedTargets[source.id] = defaultTarget;
      }
    }
  },
  { immediate: true },
);

function canUseRing(ring: LiveBattleRingView): boolean {
  return (
    canAct.value &&
    !submitting.value &&
    ring.currentCooldown === 0 &&
    (battle.value?.viewer.energy.current ?? 0) >= ring.energyCost &&
    Boolean(selectedTargets[ring.id])
  );
}

function canUseMonster(monster: LiveBattleMonsterView): boolean {
  return (
    canAct.value &&
    !submitting.value &&
    monster.currentCooldown === 0 &&
    Boolean(selectedTargets[monster.id])
  );
}

async function submitAction(action: LiveBattleActionCommand): Promise<void> {
  if (!battle.value || submitting.value) {
    return;
  }

  submitting.value = true;
  actionError.value = "";
  try {
    const response = await $fetch<LiveBattleActionResponse>(
      `/api/battle/live/${battle.value.id}/actions`,
      {
        method: "POST",
        body: {
          expectedActionCount: battle.value.actionCount,
          action,
        },
      },
    );
    battle.value = response.battle;
    lastEventTypes.value = response.events.map((event) => event.type);
  } catch (error) {
    const fetchError = error as { data?: { statusMessage?: string }; message?: string };
    actionError.value =
      fetchError.data?.statusMessage ?? fetchError.message ?? t("battle.live.actionError");
    await refreshNuxtData();
  } finally {
    submitting.value = false;
  }
}

function useRing(ringInstanceId: string): Promise<void> {
  return submitAction({
    type: "useRing",
    ringInstanceId,
    targetId: selectedTargets[ringInstanceId]!,
  });
}

function useMonster(monsterInstanceId: string): Promise<void> {
  return submitAction({
    type: "useMonster",
    monsterInstanceId,
    targetId: selectedTargets[monsterInstanceId]!,
  });
}

function chooseElement(element: (typeof elements)[number]): Promise<void> {
  return submitAction({ type: "chooseElement", element });
}

function endTurn(): Promise<void> {
  return submitAction({ type: "endTurn" });
}

function concede(): Promise<void> {
  return submitAction({ type: "concede" });
}

async function claimReward(): Promise<void> {
  const rewardGrantId = battle.value?.reward?.id;
  if (!rewardGrantId || claimingReward.value) {
    return;
  }

  claimingReward.value = true;
  actionError.value = "";
  try {
    await $fetch("/api/battle/rewards/claim", {
      method: "POST",
      body: { rewardGrantId },
    });
    await refresh();
    await refreshNuxtData();
  } catch (error) {
    actionError.value = error instanceof Error ? error.message : t("battle.live.rewardError");
  } finally {
    claimingReward.value = false;
  }
}

let privateBattlePoll: ReturnType<typeof setInterval> | undefined;
let battleClock: ReturnType<typeof setInterval> | undefined;
let privateBattlePollTick = 0;
onMounted(() => {
  battleClock = setInterval(() => {
    clockNow.value = Date.now();
  }, 1000);
  privateBattlePoll = setInterval(() => {
    privateBattlePollTick += 1;
    const fallbackDue = realtimeStatus.value !== "connected" || privateBattlePollTick % 5 === 0;
    if (
      fallbackDue &&
      isPvpBattle.value &&
      battle.value?.status !== "finished" &&
      !submitting.value &&
      !document.hidden
    ) {
      void refresh();
    }
  }, 2000);
});
onUnmounted(() => {
  if (battleClock) clearInterval(battleClock);
  if (privateBattlePoll) clearInterval(privateBattlePoll);
});
</script>
