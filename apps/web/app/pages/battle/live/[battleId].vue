<template>
  <main class="shell live-battle-page">
    <nav class="section-nav" :aria-label="t('accessibility.battleNavigation')">
      <NuxtLink v-for="link in sectionLinks.battle" :key="link.to" :to="link.to">
        {{ $t(link.labelKey) }}
      </NuxtLink>
    </nav>

    <header class="view-header live-view-header">
      <div class="view-title">
        <span class="eyebrow">{{ battle?.mode ?? t("battle.section") }}</span>
        <h1>{{ t("battle.live.title") }}</h1>
        <p class="muted">{{ statusLabel }}</p>
      </div>
      <div class="view-status-stack">
        <span :class="['pill', `realtime-${realtimeStatus}`]">
          {{ t(`realtime.${realtimeStatus}`) }}
        </span>
        <NuxtLink class="button-link secondary-button" to="/battle">
          {{ t("battle.live.leave") }}
        </NuxtLink>
      </div>
    </header>

    <p v-if="pending" class="panel">{{ t("battle.live.loading") }}</p>
    <p v-else-if="error || !battle" class="panel">{{ t("battle.live.notFound") }}</p>

    <template v-else>
      <section class="live-match-strip" :aria-label="t('accessibility.battleStatus')">
        <div>
          <span class="eyebrow">{{ t("battle.live.turn") }}</span>
          <strong>{{ battle.turnCount }}</strong>
        </div>
        <div class="live-turn-owner">
          <span class="eyebrow">{{ t("battle.live.activePlayer") }}</span>
          <strong>{{ activePlayerName }}</strong>
        </div>
        <div v-if="isPvpBattle && deadlineSecondsRemaining !== null">
          <span class="eyebrow">{{ deadlineLabel }}</span>
          <strong>{{ formattedDeadlineTime }}</strong>
        </div>
      </section>

      <section class="live-arena" :aria-label="t('battle.live.arena')">
        <div class="live-energy-rail opponent-energy">
          <span>{{ t("stats.energy") }}</span>
          <div class="live-energy-slots" aria-hidden="true">
            <i
              v-for="slot in 8"
              :key="`opponent-energy-${slot}`"
              :class="{
                filled: slot <= battle.opponent.energy.current,
                unlocked: slot <= battle.opponent.energy.maxForTurn,
              }"
            />
          </div>
          <strong
            >{{ battle.opponent.energy.current }}/{{ battle.opponent.energy.maxForTurn }}</strong
          >
        </div>

        <div class="live-side-heading opponent-side-heading">
          <div>
            <span class="eyebrow">{{ t("battle.live.opponent") }}</span>
            <strong>{{ battle.opponent.username }}</strong>
          </div>
          <span class="pill">{{
            t("battle.live.hiddenRings", { count: battle.opponent.ringCount })
          }}</span>
        </div>

        <div class="live-side-zone opponent-zone">
          <article
            :class="targetCardClasses(battle.opponent.heroTargetId, 'live-hero')"
            :data-target-id="battle.opponent.heroTargetId"
            :role="canSelectTarget(battle.opponent.heroTargetId) ? 'button' : undefined"
            :tabindex="canSelectTarget(battle.opponent.heroTargetId) ? 0 : -1"
            :aria-label="targetInteractionLabel(battle.opponent.heroTargetId)"
            @click="executeTarget(battle.opponent.heroTargetId)"
            @keydown.enter.prevent="executeTarget(battle.opponent.heroTargetId)"
            @keydown.space.prevent="executeTarget(battle.opponent.heroTargetId)"
          >
            <span
              v-if="resolutionEffect(battle.opponent.heroTargetId)?.damage"
              :key="`opponent-hero-damage-${resolutionSequence}`"
              class="live-damage-pop"
              >-{{ resolutionEffect(battle.opponent.heroTargetId)?.damage }}</span
            >
            <div class="live-card-heading">
              <span class="eyebrow">{{ t("common.hero") }}</span>
              <strong>{{ battle.opponent.username }}</strong>
            </div>
            <div class="live-health-line">
              <meter
                :value="battle.opponent.hero.health"
                :max="battle.opponent.hero.maxHealth"
                :aria-label="t('stats.health')"
              />
              <strong
                >{{ battle.opponent.hero.health }}/{{ battle.opponent.hero.maxHealth }}</strong
              >
            </div>
            <dl class="live-inline-stats">
              <div>
                <dt>{{ t("common.level") }}</dt>
                <dd>{{ battle.opponent.level }}</dd>
              </div>
              <div>
                <dt>{{ t("stats.speed") }}</dt>
                <dd>{{ battle.opponent.hero.speed }}</dd>
              </div>
            </dl>
            <small
              v-if="targetState(battle.opponent.heroTargetId)?.firstTurnProtected"
              class="live-protection-note"
            >
              {{ t("battle.live.firstTurnProtected") }}
            </small>
          </article>

          <div class="live-monster-grid">
            <article
              v-for="monster in battle.opponent.monsters"
              :key="monster.id"
              :class="targetCardClasses(monster.id, 'live-monster', monster.rarity)"
              :data-target-id="monster.id"
              :role="canSelectTarget(monster.id) ? 'button' : undefined"
              :tabindex="canSelectTarget(monster.id) ? 0 : -1"
              :aria-label="targetInteractionLabel(monster.id)"
              @click="executeTarget(monster.id)"
              @keydown.enter.prevent="executeTarget(monster.id)"
              @keydown.space.prevent="executeTarget(monster.id)"
            >
              <span
                v-if="resolutionEffect(monster.id)?.damage"
                :key="`${monster.id}-damage-${resolutionSequence}`"
                class="live-damage-pop"
                >-{{ resolutionEffect(monster.id)?.damage }}</span
              >
              <span
                v-if="resolutionEffect(monster.id)?.statuses.length"
                :key="`${monster.id}-status-${resolutionSequence}`"
                class="live-status-pop"
                >{{ resolutionStatusLabel(monster.id) }}</span
              >
              <div class="live-artwork-wrap">
                <ItemArtwork :definition-id="monster.definitionId" kind="monster" />
                <span :class="['pill', `element-${monster.element}`]">{{
                  t(`element.${monster.element}`)
                }}</span>
              </div>
              <strong>{{ monsterName(monster) }}</strong>
              <div class="live-health-line">
                <meter
                  :value="monster.health"
                  :max="monster.maxHealth"
                  :aria-label="t('stats.health')"
                />
                <strong>{{ monster.health }}/{{ monster.maxHealth }}</strong>
              </div>
              <dl class="live-inline-stats">
                <div>
                  <dt>{{ t("stats.damage") }}</dt>
                  <dd>{{ monster.damage }}</dd>
                </div>
                <div>
                  <dt>{{ t("stats.cooldown") }}</dt>
                  <dd>{{ monster.currentCooldown }}/{{ monster.cooldown }}</dd>
                </div>
              </dl>
              <div
                v-if="monster.skill || monster.shieldActive || monster.rageActive"
                class="live-status-badges"
              >
                <span v-if="monster.skill" class="pill muted-pill">{{
                  skillLabel(monster.skill)
                }}</span>
                <span v-if="monster.shieldActive" class="pill element-ice">{{
                  t("battle.live.shieldActive")
                }}</span>
                <span v-if="monster.rageActive" class="pill element-fire">{{
                  t("battle.live.rageActive")
                }}</span>
              </div>
            </article>
            <div
              v-for="slot in Math.max(0, 3 - battle.opponent.monsters.length)"
              :key="`opponent-empty-${slot}`"
              class="live-monster empty-slot"
              :aria-label="t('accessibility.emptyMonsterSlot')"
            />
          </div>
        </div>

        <div class="live-arena-divider">
          <span>{{ t(isViewerTurn ? "battle.live.yourTurn" : "battle.live.opponentTurn") }}</span>
        </div>

        <div class="live-side-zone viewer-zone">
          <article
            :class="targetCardClasses(battle.viewer.heroTargetId, 'live-hero')"
            :data-target-id="battle.viewer.heroTargetId"
            :role="canSelectTarget(battle.viewer.heroTargetId) ? 'button' : undefined"
            :tabindex="canSelectTarget(battle.viewer.heroTargetId) ? 0 : -1"
            :aria-label="targetInteractionLabel(battle.viewer.heroTargetId)"
            @click="executeTarget(battle.viewer.heroTargetId)"
            @keydown.enter.prevent="executeTarget(battle.viewer.heroTargetId)"
            @keydown.space.prevent="executeTarget(battle.viewer.heroTargetId)"
          >
            <span
              v-if="resolutionEffect(battle.viewer.heroTargetId)?.damage"
              :key="`viewer-hero-damage-${resolutionSequence}`"
              class="live-damage-pop"
              >-{{ resolutionEffect(battle.viewer.heroTargetId)?.damage }}</span
            >
            <div class="live-card-heading">
              <span class="eyebrow">{{ t("common.hero") }}</span>
              <strong>{{ battle.viewer.username }}</strong>
            </div>
            <div class="live-health-line">
              <meter
                :value="battle.viewer.hero.health"
                :max="battle.viewer.hero.maxHealth"
                :aria-label="t('stats.health')"
              />
              <strong>{{ battle.viewer.hero.health }}/{{ battle.viewer.hero.maxHealth }}</strong>
            </div>
            <dl class="live-inline-stats">
              <div>
                <dt>{{ t("common.level") }}</dt>
                <dd>{{ battle.viewer.level }}</dd>
              </div>
              <div>
                <dt>{{ t("stats.speed") }}</dt>
                <dd>{{ battle.viewer.hero.speed }}</dd>
              </div>
            </dl>
          </article>

          <div class="live-monster-grid">
            <article
              v-for="monster in battle.viewer.monsters"
              :key="monster.id"
              :class="[
                ...targetCardClasses(monster.id, 'live-monster', monster.rarity),
                {
                  'source-selected': selectedSource?.id === monster.id,
                  'source-available': canPrepareSource(monsterSource(monster)),
                },
              ]"
              :data-target-id="monster.id"
              :role="canInteractWithViewerMonster(monster) ? 'button' : undefined"
              :tabindex="canInteractWithViewerMonster(monster) ? 0 : -1"
              :aria-label="viewerMonsterInteractionLabel(monster)"
              @click="handleViewerMonsterInteraction(monster)"
              @keydown.enter.prevent="handleViewerMonsterInteraction(monster)"
              @keydown.space.prevent="handleViewerMonsterInteraction(monster)"
            >
              <span
                v-if="resolutionEffect(monster.id)?.damage"
                :key="`${monster.id}-damage-${resolutionSequence}`"
                class="live-damage-pop"
                >-{{ resolutionEffect(monster.id)?.damage }}</span
              >
              <span
                v-if="resolutionEffect(monster.id)?.statuses.length"
                :key="`${monster.id}-status-${resolutionSequence}`"
                class="live-status-pop"
                >{{ resolutionStatusLabel(monster.id) }}</span
              >
              <div class="live-artwork-wrap">
                <ItemArtwork :definition-id="monster.definitionId" kind="monster" />
                <span :class="['pill', `element-${monster.element}`]">{{
                  t(`element.${monster.element}`)
                }}</span>
              </div>
              <strong>{{ monsterName(monster) }}</strong>
              <div class="live-health-line">
                <meter
                  :value="monster.health"
                  :max="monster.maxHealth"
                  :aria-label="t('stats.health')"
                />
                <strong>{{ monster.health }}/{{ monster.maxHealth }}</strong>
              </div>
              <dl class="live-inline-stats">
                <div>
                  <dt>{{ t("stats.damage") }}</dt>
                  <dd>{{ monster.damage }}</dd>
                </div>
                <div>
                  <dt>{{ t("stats.cooldown") }}</dt>
                  <dd>{{ monster.currentCooldown }}/{{ monster.cooldown }}</dd>
                </div>
              </dl>
              <div
                v-if="monster.skill || monster.shieldActive || monster.rageActive"
                class="live-status-badges"
              >
                <span v-if="monster.skill" class="pill muted-pill">{{
                  skillLabel(monster.skill)
                }}</span>
                <span v-if="monster.shieldActive" class="pill element-ice">{{
                  t("battle.live.shieldActive")
                }}</span>
                <span v-if="monster.rageActive" class="pill element-fire">{{
                  t("battle.live.rageActive")
                }}</span>
              </div>
              <small v-if="!sourceAvailability(monsterSource(monster)).available" class="muted">
                {{ availabilityLabel(monsterSource(monster)) }}
              </small>
            </article>
            <div
              v-for="slot in Math.max(0, 3 - battle.viewer.monsters.length)"
              :key="`viewer-empty-${slot}`"
              class="live-monster empty-slot"
              :aria-label="t('accessibility.emptyMonsterSlot')"
            />
          </div>
        </div>

        <div class="live-loadout-heading">
          <div>
            <span class="eyebrow">{{ t("battle.live.activeLoadout") }}</span>
            <strong>{{ t("battle.live.ringCount", { count: battle.viewer.ringCount }) }}</strong>
          </div>
        </div>

        <div class="live-ring-dock">
          <article
            v-for="ring in battle.viewer.rings ?? []"
            :key="ring.id"
            :class="[
              'live-ring',
              `rarity-border-${ring.rarity}`,
              {
                'source-selected': selectedSource?.id === ring.id,
                'source-available': canPrepareSource(ringSource(ring)),
                'resolution-source': resolutionSourceIds.has(ring.id),
              },
            ]"
            :data-source-id="ring.id"
            :role="canPrepareSource(ringSource(ring)) ? 'button' : undefined"
            :tabindex="canPrepareSource(ringSource(ring)) ? 0 : -1"
            :aria-label="sourceInteractionLabel(ringSource(ring))"
            @click="prepareSource(ringSource(ring))"
            @keydown.enter.prevent="prepareSource(ringSource(ring))"
            @keydown.space.prevent="prepareSource(ringSource(ring))"
          >
            <div class="live-artwork-wrap">
              <ItemArtwork :definition-id="ring.definitionId" kind="ring" />
              <span :class="['pill', `element-${ring.element}`]">{{
                t(`element.${ring.element}`)
              }}</span>
            </div>
            <strong>{{ ringName(ring) }}</strong>
            <dl class="live-inline-stats">
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
              <span v-if="ring.gems.length === 0" class="muted">{{ t("battle.live.noGems") }}</span>
            </div>
            <small v-if="!sourceAvailability(ringSource(ring)).available" class="muted">
              {{ availabilityLabel(ringSource(ring)) }}
            </small>
          </article>
        </div>

        <div class="live-energy-rail viewer-energy">
          <span>{{ t("stats.energy") }}</span>
          <div class="live-energy-slots" aria-hidden="true">
            <i
              v-for="slot in 8"
              :key="`viewer-energy-${slot}`"
              :class="{
                filled: slot <= battle.viewer.energy.current,
                unlocked: slot <= battle.viewer.energy.maxForTurn,
              }"
            />
          </div>
          <strong>{{ battle.viewer.energy.current }}/{{ battle.viewer.energy.maxForTurn }}</strong>
        </div>
      </section>

      <section v-if="battle.status === 'choosingFirstPlayer'" class="panel live-choice-panel">
        <div>
          <span class="eyebrow">{{ t("battle.live.elementDuel") }}</span>
          <h2>{{ t("battle.live.chooseElement") }}</h2>
          <p class="muted">
            {{ t("battle.live.openingDuelRound", { round: battle.openingDuelRound }) }}
            <template v-if="battle.openingDuelChoiceSubmitted">
              {{ t("battle.live.openingDuelWaitingSuffix") }}
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
            {{ t(`element.${element}`) }}
          </button>
        </div>
      </section>

      <section class="live-command-tray" :aria-label="t('accessibility.battleCommands')">
        <div class="live-command-selection">
          <span class="eyebrow">{{ t("battle.live.preparedAction") }}</span>
          <strong>{{ selectedSourceLabel }}</strong>
          <small class="muted">{{ selectedTargetLabel }}</small>
        </div>
        <div class="live-command-buttons">
          <button
            type="button"
            class="secondary-button"
            :disabled="!selectedSource"
            @click="clearPreparedAction"
          >
            {{ t("battle.live.cancelAction") }}
          </button>
          <button
            type="button"
            class="secondary-button"
            :disabled="!canAct || submitting"
            @click="endTurn"
          >
            {{ t("battle.live.endTurn") }}
          </button>
          <button
            type="button"
            class="secondary-button danger-button"
            :disabled="battle.status === 'finished' || submitting"
            @click="concede"
          >
            {{ t("battle.live.concede") }}
          </button>
        </div>
      </section>

      <p v-if="actionError" class="panel live-action-error" role="alert">{{ actionError }}</p>
      <section
        v-else-if="presentedEvents.length > 0"
        class="live-resolution-feed"
        aria-live="polite"
        aria-atomic="true"
      >
        <div class="live-resolution-heading">
          <span class="eyebrow">{{ t("battle.live.lastResolution") }}</span>
          <strong>{{ t("battle.live.resolutionComplete") }}</strong>
        </div>
        <ol>
          <li
            v-for="(event, index) in presentedEvents"
            :key="`${resolutionSequence}-${index}-${event.key}`"
            :class="`event-${event.tone}`"
          >
            {{ t(event.key, localizedEventParams(event.params)) }}
          </li>
        </ol>
      </section>

      <details class="live-diagnostics">
        <summary>{{ t("battle.live.diagnostics") }}</summary>
        <dl class="summary-grid">
          <div class="stat">
            <dt>{{ t("stats.actions") }}</dt>
            <dd>{{ battle.actionCount }}</dd>
          </div>
          <div class="stat">
            <dt>{{ t("battle.live.status") }}</dt>
            <dd>{{ battle.status }}</dd>
          </div>
          <div class="stat">
            <dt>{{ t("battle.replay.rules") }}</dt>
            <dd>{{ battle.rulesVersion }}</dd>
          </div>
          <div class="stat">
            <dt>{{ t("battle.replay.content") }}</dt>
            <dd>{{ battle.contentVersion }}</dd>
          </div>
        </dl>
        <p v-if="lastEvents.length > 0" class="muted live-raw-events">
          {{ lastEvents.map((event) => event.type).join(" - ") }}
        </p>
      </details>

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
          <span
            :class="['pill', battle.reward.status === 'claimed' ? 'ready-note' : 'muted-pill']"
            >{{ battle.reward.status }}</span
          >
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
            <span>{{ contentText(`material.${material.materialId}.name`, material.label) }}</span
            ><strong>+{{ material.quantity }}</strong>
          </li>
        </ul>
        <ul v-if="battle.reward.items.length > 0" class="clean-list reward-detail-list">
          <li v-for="item in battle.reward.items" :key="item.inventoryItemId">
            <span>{{ contentText(`${item.type}.${item.definitionId}.name`, item.label) }}</span
            ><strong>{{
              t("battle.live.experienceReward", { experience: item.experience })
            }}</strong>
          </li>
        </ul>
        <div class="control-row">
          <NuxtLink class="button-link secondary-button" :to="`/battle/result/${battle.id}`">{{
            t("battle.live.resultDetails")
          }}</NuxtLink>
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
import {
  actionAvailability,
  battleResolutionEffects,
  battleTargets,
  presentBattleEvent,
  type LiveBattleActionSource,
  type LiveBattleEventPresentation,
  type LiveBattleResolutionEffects,
} from "~/utils/liveBattlePresentation";
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
  ["private_pvp", "casual_pvp", "ranked_pvp"].includes(battle.value?.mode ?? ""),
);
const { status: realtimeStatus } = useGameRealtime((event) => {
  if (event.type === "battleChanged" && event.battleId === battleId.value) void refresh();
});
const isViewerTurn = computed(() => battle.value?.activePlayerId === battle.value?.viewer.id);
const canAct = computed(
  () => battle.value?.status === "active" && isViewerTurn.value && !submitting.value,
);
const elements = ["electric", "fire", "ice"] as const;
const selectedSource = ref<LiveBattleActionSource | null>(null);
const selectedTargetId = ref<string | null>(null);
const submitting = ref(false);
const claimingReward = ref(false);
const actionError = ref("");
const lastEvents = ref<LiveBattleActionResponse["events"]>([]);
const eventLabels = ref<Record<string, string>>({});
const resolutionEffects = ref<LiveBattleResolutionEffects>({ sourceIds: [], targets: [] });
const resolutionSequence = ref(0);
const clockNow = ref(Date.now());

const targetStates = computed(
  () =>
    new Map((battle.value ? battleTargets(battle.value) : []).map((target) => [target.id, target])),
);
const selectedSourceLabel = computed(() => {
  if (!selectedSource.value) return t("battle.live.selectSource");
  return selectedSource.value.kind === "ring"
    ? ringName(selectedSource.value.item)
    : monsterName(selectedSource.value.item);
});
const selectedTargetLabel = computed(() => {
  if (!selectedSource.value) return t("battle.live.selectSourceHint");
  return t("battle.live.directTargetHint");
});
const presentedEvents = computed(() =>
  lastEvents.value.map((event) => presentBattleEvent(event, eventLabel)),
);
const resolutionSourceIds = computed(() => new Set(resolutionEffects.value.sourceIds));

const activeDeadlineAt = computed(() =>
  battle.value?.status === "choosingFirstPlayer"
    ? battle.value.openingDuelDeadlineAt
    : battle.value?.turnDeadlineAt,
);
const deadlineSecondsRemaining = computed(() =>
  activeDeadlineAt.value
    ? Math.max(0, Math.ceil((Date.parse(activeDeadlineAt.value) - clockNow.value) / 1000))
    : null,
);
const formattedDeadlineTime = computed(() => {
  const remaining = deadlineSecondsRemaining.value;
  return remaining === null
    ? ""
    : `${Math.floor(remaining / 60)}:${String(remaining % 60).padStart(2, "0")}`;
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

const resultLabel = computed(() => {
  const result = battle.value?.result;
  if (!result) return t("battle.live.pending");
  if (result.type === "draw") return t("battle.live.draw");
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
  if (!battle.value?.activePlayerId) return t("battle.live.pending");
  return battle.value.activePlayerId === battle.value.viewer.id
    ? battle.value.viewer.username
    : battle.value.opponent.username;
});
const statusLabel = computed(() => {
  if (!battle.value) return t("battle.live.serverState");
  if (battle.value.status === "choosingFirstPlayer")
    return t(
      battle.value.openingDuelChoiceSubmitted
        ? "battle.live.openingDuelWaiting"
        : "battle.live.firstPlayerPending",
    );
  if (battle.value.status === "finished") return t("battle.live.finished");
  return t(isViewerTurn.value ? "battle.live.yourTurnStatus" : "battle.live.opponentTurnStatus");
});

watch(
  () => battle.value?.actionCount,
  () => clearPreparedAction(),
);

function ringSource(ring: LiveBattleRingView): LiveBattleActionSource {
  return { kind: "ring", id: ring.id, item: ring };
}
function monsterSource(monster: LiveBattleMonsterView): LiveBattleActionSource {
  return { kind: "monster", id: monster.id, item: monster };
}
function sourceAvailability(source: LiveBattleActionSource) {
  return battle.value
    ? actionAvailability(battle.value, source)
    : { available: false, reason: "battleInactive" as const };
}
function availabilityLabel(source: LiveBattleActionSource): string {
  return t(`battle.live.availability.${sourceAvailability(source).reason}`);
}
function ringName(ring: LiveBattleRingView): string {
  return contentText(`ring.${ring.definitionId}.name`, ring.label);
}
function monsterName(monster: LiveBattleMonsterView): string {
  return contentText(`monster.${monster.definitionId}.name`, monster.label);
}
function skillLabel(skill: string): string {
  return t(`battle.live.skill.${skill}`);
}
function targetState(targetId: string) {
  return targetStates.value.get(targetId);
}
function targetLabel(targetId: string): string {
  const currentBattle = battle.value;
  const target = targetState(targetId);
  if (!currentBattle || !target) return "";
  const player = target.side === "viewer" ? currentBattle.viewer : currentBattle.opponent;
  if (target.kind === "hero") return `${player.username} - ${t("common.hero")}`;
  const monster = player.monsters.find((candidate) => candidate.id === targetId);
  return monster ? `${player.username} - ${monsterName(monster)}` : player.username;
}
function canSelectTarget(targetId: string): boolean {
  const target = targetState(targetId);
  return Boolean(
    selectedSource.value &&
    sourceAvailability(selectedSource.value).available &&
    target &&
    !target.blockedByTaunt &&
    !submitting.value,
  );
}
function targetInteractionLabel(targetId: string): string {
  const target = targetState(targetId);
  if (target?.blockedByTaunt) return t("battle.live.blockedByTaunt");
  return canSelectTarget(targetId)
    ? t("battle.live.attackTarget", { target: targetLabel(targetId) })
    : targetLabel(targetId);
}
function targetCardClasses(targetId: string, base: string, rarity?: string) {
  const target = targetState(targetId);
  return [
    base,
    rarity ? `rarity-border-${rarity}` : "",
    {
      "target-selected": selectedTargetId.value === targetId,
      "target-blocked": Boolean(selectedSource.value && target?.blockedByTaunt),
      "target-available": canSelectTarget(targetId),
      "resolution-source": resolutionSourceIds.value.has(targetId),
      "resolution-impact": Boolean(resolutionEffect(targetId)),
    },
  ];
}
function resolutionEffect(targetId: string) {
  return resolutionEffects.value.targets.find((effect) => effect.id === targetId);
}
function resolutionStatusLabel(targetId: string): string {
  const status = resolutionEffect(targetId)?.statuses[0];
  return status ? t(`battle.live.effects.${status}`) : "";
}
function eventLabel(id: string): string {
  if (id === "draw") return t("battle.live.draw");
  return eventLabels.value[id] ?? id;
}
function localizedEventParams(
  params: LiveBattleEventPresentation["params"],
): Record<string, string | number> {
  if (typeof params.element !== "string" || !elements.includes(params.element as never)) {
    return params;
  }
  return { ...params, element: t(`element.${params.element}`) };
}
function collectBattleLabels(state: LiveBattleState): Record<string, string> {
  const labels: Record<string, string> = {};
  for (const player of [state.viewer, state.opponent]) {
    labels[player.id] = player.username;
    labels[player.heroTargetId] = `${player.username} - ${t("common.hero")}`;
    for (const monster of player.monsters) labels[monster.id] = monsterName(monster);
    for (const ring of player.rings ?? []) {
      labels[ring.id] = ringName(ring);
      for (const gem of ring.gems) {
        labels[gem.id] = contentText(`gem.${gem.definitionId}.name`, gem.label);
      }
    }
  }
  return labels;
}
function showResolution(
  events: LiveBattleActionResponse["events"],
  previousBattle: LiveBattleState,
  nextBattle: LiveBattleState,
): void {
  const labels = { ...collectBattleLabels(previousBattle), ...collectBattleLabels(nextBattle) };
  for (const event of events) {
    if (event.type === "spellCast") {
      labels[event.spellId] = contentText(`spell.${event.spellId}.name`, event.spellId);
    }
    if (event.type === "monsterSummoned" && !labels[event.monsterInstanceId]) {
      labels[event.monsterInstanceId] = contentText(
        `monster.${event.monsterId}.name`,
        event.monsterId,
      );
    }
  }
  eventLabels.value = labels;
  lastEvents.value = events;
  resolutionEffects.value = battleResolutionEffects(events);
  resolutionSequence.value += 1;
  if (resolutionTimer) clearTimeout(resolutionTimer);
  resolutionTimer = setTimeout(() => {
    resolutionEffects.value = { sourceIds: [], targets: [] };
  }, 1400);
}
function prepareSource(source: LiveBattleActionSource): void {
  if (!canPrepareSource(source)) return;
  selectedSource.value = source;
  selectedTargetId.value = null;
  actionError.value = "";
}
function canPrepareSource(source: LiveBattleActionSource): boolean {
  return sourceAvailability(source).available && !submitting.value;
}
function sourceInteractionLabel(source: LiveBattleActionSource): string {
  const label = source.kind === "ring" ? ringName(source.item) : monsterName(source.item);
  return selectedSource.value?.id === source.id
    ? t("battle.live.sourceSelected", { source: label })
    : t("battle.live.selectAttacker", { source: label });
}
function canInteractWithViewerMonster(monster: LiveBattleMonsterView): boolean {
  return selectedSource.value
    ? canSelectTarget(monster.id)
    : canPrepareSource(monsterSource(monster));
}
function viewerMonsterInteractionLabel(monster: LiveBattleMonsterView): string {
  return selectedSource.value
    ? targetInteractionLabel(monster.id)
    : sourceInteractionLabel(monsterSource(monster));
}
function handleViewerMonsterInteraction(monster: LiveBattleMonsterView): void {
  if (selectedSource.value) {
    void executeTarget(monster.id);
    return;
  }
  prepareSource(monsterSource(monster));
}
function clearPreparedAction(): void {
  selectedSource.value = null;
  selectedTargetId.value = null;
}

async function submitAction(action: LiveBattleActionCommand): Promise<void> {
  if (!battle.value || submitting.value) return;
  const previousBattle = battle.value;
  submitting.value = true;
  actionError.value = "";
  try {
    const response = await $fetch<LiveBattleActionResponse>(
      `/api/battle/live/${battle.value.id}/actions`,
      {
        method: "POST",
        body: { expectedActionCount: battle.value.actionCount, action },
      },
    );
    battle.value = response.battle;
    showResolution(response.events, previousBattle, response.battle);
  } catch (error) {
    const fetchError = error as { data?: { statusMessage?: string }; message?: string };
    actionError.value =
      fetchError.data?.statusMessage ?? fetchError.message ?? t("battle.live.actionError");
    await refreshNuxtData();
  } finally {
    submitting.value = false;
  }
}
async function executeTarget(targetId: string): Promise<void> {
  if (!canSelectTarget(targetId) || !selectedSource.value) return;
  const source = selectedSource.value;
  selectedTargetId.value = targetId;
  const action: LiveBattleActionCommand =
    source.kind === "ring"
      ? { type: "useRing", ringInstanceId: source.id, targetId }
      : { type: "useMonster", monsterInstanceId: source.id, targetId };
  await submitAction(action);
  if (selectedSource.value?.id === source.id) selectedTargetId.value = null;
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
  if (!rewardGrantId || claimingReward.value) return;
  claimingReward.value = true;
  actionError.value = "";
  try {
    await $fetch("/api/battle/rewards/claim", { method: "POST", body: { rewardGrantId } });
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
let resolutionTimer: ReturnType<typeof setTimeout> | undefined;
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
    )
      void refresh();
  }, 2000);
});
onUnmounted(() => {
  if (battleClock) clearInterval(battleClock);
  if (privateBattlePoll) clearInterval(privateBattlePoll);
  if (resolutionTimer) clearTimeout(resolutionTimer);
});
</script>
