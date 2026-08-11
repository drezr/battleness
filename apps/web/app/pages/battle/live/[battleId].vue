<template>
  <main class="live-battle-page">
    <p v-if="shouldShowInitialBattleLoading(pending, battle)" class="panel live-loading-panel">
      {{ t("battle.live.loading") }}
    </p>
    <p v-else-if="!battle" class="panel live-loading-panel">{{ t("battle.live.notFound") }}</p>

    <template v-else>
      <header class="live-combat-toolbar">
        <img src="/assets/brand/battleness-logo.png" :alt="t('app.brand')" />
        <div class="live-combat-status" :aria-label="t('accessibility.battleStatus')">
          <span>{{ t(`battle.mode.${battle.mode}`) }}</span>
          <strong>{{ statusLabel }}</strong>
          <small v-if="isPvpBattle && deadlineSecondsRemaining !== null">
            {{ deadlineLabel }}: {{ formattedDeadlineTime }}
          </small>
        </div>
        <div class="live-combat-actions">
          <span :class="['pill', `realtime-${realtimeStatus}`]">
            {{ t(`realtime.${realtimeStatus}`) }}
          </span>
          <button
            v-if="isDevelopment"
            class="icon-button live-toolbar-button"
            type="button"
            :aria-label="t('battle.live.devTools')"
            :title="t('battle.live.devTools')"
            @click="showDeveloperModal = true"
          >
            <Bug :size="20" aria-hidden="true" />
          </button>
          <NuxtLink
            class="icon-button live-toolbar-button"
            to="/battle"
            :aria-label="t('battle.live.leave')"
            :title="t('battle.live.leave')"
          >
            <LogOut :size="20" aria-hidden="true" />
          </NuxtLink>
        </div>
      </header>

      <section
        v-if="battle.status !== 'finished'"
        class="live-arena"
        :aria-label="t('battle.live.arena')"
      >
        <div class="live-energy-rail opponent-energy">
          <span>{{ battle.opponent.username }} {{ t("stats.energy") }}</span>
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

        <div class="live-battle-board">
          <aside class="live-hero-column">
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
                <span class="eyebrow">{{ t("battle.live.opponent") }}</span>
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

            <div class="live-turn-console">
              <span class="live-turn-counter">
                {{ t("battle.live.turn") }} <strong>{{ battle.turnCount }}</strong>
              </span>
              <button
                type="button"
                class="live-end-turn-button"
                :disabled="!canAct || submitting"
                @click="endTurn"
              >
                {{ t("battle.live.endTurn") }}
              </button>
              <button
                type="button"
                class="icon-button danger-action live-concede-button"
                :disabled="submitting"
                :aria-label="t('battle.live.concede')"
                :title="t('battle.live.concede')"
                @click="concede"
              >
                <Flag :size="18" aria-hidden="true" />
              </button>
            </div>

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
                <span class="eyebrow">{{ t("battle.live.viewer") }}</span>
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
          </aside>

          <div class="live-field-stack">
            <div class="live-monster-grid opponent-monsters">
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
                <div class="live-card-titlebar">
                  <strong>{{ monsterName(monster) }}</strong>
                  <span :class="['live-element-token', `element-${monster.element}`]">{{
                    t(`element.${monster.element}`)
                  }}</span>
                </div>
                <div class="live-card-art live-monster-art">
                  <ItemArtwork
                    :definition-id="monster.definitionId"
                    kind="monster"
                    :rarity-border="false"
                  />
                  <div
                    v-if="
                      monster.skills.length ||
                      monster.temporary ||
                      monster.shieldActive ||
                      monster.rageActive
                    "
                    class="live-card-status-row"
                  >
                    <span v-for="skill in monster.skills" :key="skill" class="pill muted-pill">{{
                      skillLabel(skill)
                    }}</span>
                    <span v-if="monster.temporary" class="pill element-electric">{{
                      t("battle.live.temporaryMonster")
                    }}</span>
                    <span v-if="monster.shieldActive" class="pill element-ice">{{
                      t("battle.live.shieldActive")
                    }}</span>
                    <span v-if="monster.rageActive" class="pill element-fire">{{
                      t("battle.live.rageActive")
                    }}</span>
                  </div>
                </div>
                <dl class="live-card-stats live-monster-stats">
                  <div>
                    <dt class="sr-only">{{ t("stats.damage") }}</dt>
                    <dd>
                      <Sword :size="16" aria-hidden="true" />
                      <span>{{ monster.damage }}</span>
                    </dd>
                  </div>
                  <div>
                    <dt class="sr-only">{{ t("stats.health") }}</dt>
                    <dd>
                      <Heart :size="16" aria-hidden="true" />
                      <span>{{ monster.health }}</span>
                    </dd>
                  </div>
                  <div>
                    <dt class="sr-only">{{ t("stats.cooldown") }}</dt>
                    <dd :aria-label="cooldownStatLabel(monster)">
                      <CheckCircle2
                        v-if="cooldownReady(monster)"
                        class="live-cooldown-ready"
                        :size="16"
                        aria-hidden="true"
                      />
                      <template v-else>
                        <Timer :size="16" aria-hidden="true" />
                        <span>{{ monster.currentCooldown }}/{{ monster.cooldown }}</span>
                      </template>
                    </dd>
                  </div>
                </dl>
              </article>
              <div
                v-for="slot in Math.max(0, 3 - battle.opponent.monsters.length)"
                :key="`opponent-empty-${slot}`"
                class="live-monster empty-slot"
                :aria-label="t('accessibility.emptyMonsterSlot')"
              />
            </div>

            <div v-if="visibleOpponentRings.length" class="live-opponent-reveals">
              <span class="eyebrow">{{ t("battle.live.revealedLoadout") }}</span>
              <div class="live-reveal-strip">
                <article
                  v-for="ring in visibleOpponentRings"
                  :key="ring.id"
                  :class="['live-reveal-chip', `rarity-border-${ring.rarity}`]"
                >
                  <ItemArtwork
                    :definition-id="ring.definitionId"
                    kind="ring"
                    :rarity-border="false"
                  />
                  <strong>{{ ringName(ring) }}</strong>
                  <small>{{ ringTotalDamage(ring) }} / {{ ring.energyCost }}</small>
                </article>
              </div>
            </div>

            <div class="live-arena-divider">
              <span>{{
                t(isViewerTurn ? "battle.live.yourTurn" : "battle.live.opponentTurn")
              }}</span>
            </div>

            <div class="live-monster-grid viewer-monsters">
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
                :aria-pressed="selectedSource?.id === monster.id || undefined"
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
                <div class="live-card-titlebar">
                  <strong>{{ monsterName(monster) }}</strong>
                  <span :class="['live-element-token', `element-${monster.element}`]">{{
                    t(`element.${monster.element}`)
                  }}</span>
                </div>
                <div class="live-card-art live-monster-art">
                  <ItemArtwork
                    :definition-id="monster.definitionId"
                    kind="monster"
                    :rarity-border="false"
                  />
                  <div
                    v-if="
                      monster.skills.length ||
                      monster.temporary ||
                      monster.shieldActive ||
                      monster.rageActive
                    "
                    class="live-card-status-row"
                  >
                    <span v-for="skill in monster.skills" :key="skill" class="pill muted-pill">{{
                      skillLabel(skill)
                    }}</span>
                    <span v-if="monster.temporary" class="pill element-electric">{{
                      t("battle.live.temporaryMonster")
                    }}</span>
                    <span v-if="monster.shieldActive" class="pill element-ice">{{
                      t("battle.live.shieldActive")
                    }}</span>
                    <span v-if="monster.rageActive" class="pill element-fire">{{
                      t("battle.live.rageActive")
                    }}</span>
                  </div>
                </div>
                <dl class="live-card-stats live-monster-stats">
                  <div>
                    <dt class="sr-only">{{ t("stats.damage") }}</dt>
                    <dd>
                      <Sword :size="16" aria-hidden="true" />
                      <span>{{ monster.damage }}</span>
                    </dd>
                  </div>
                  <div>
                    <dt class="sr-only">{{ t("stats.health") }}</dt>
                    <dd>
                      <Heart :size="16" aria-hidden="true" />
                      <span>{{ monster.health }}</span>
                    </dd>
                  </div>
                  <div>
                    <dt class="sr-only">{{ t("stats.cooldown") }}</dt>
                    <dd :aria-label="cooldownStatLabel(monster)">
                      <CheckCircle2
                        v-if="cooldownReady(monster)"
                        class="live-cooldown-ready"
                        :size="16"
                        aria-hidden="true"
                      />
                      <template v-else>
                        <Timer :size="16" aria-hidden="true" />
                        <span>{{ monster.currentCooldown }}/{{ monster.cooldown }}</span>
                      </template>
                    </dd>
                  </div>
                </dl>
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
            :aria-pressed="selectedSource?.id === ring.id || undefined"
            :aria-label="sourceInteractionLabel(ringSource(ring))"
            @click="prepareSource(ringSource(ring))"
            @keydown.enter.prevent="prepareSource(ringSource(ring))"
            @keydown.space.prevent="prepareSource(ringSource(ring))"
          >
            <div class="live-ring-titlebar">
              <strong>{{ ringName(ring) }}</strong>
              <span :class="['live-element-token', `element-${ring.element}`]">{{
                t(`element.${ring.element}`)
              }}</span>
            </div>
            <div class="live-card-art live-ring-art">
              <ItemArtwork :definition-id="ring.definitionId" kind="ring" :rarity-border="false" />
            </div>
            <div class="live-ring-frame" aria-hidden="true"></div>
            <dl class="live-card-stats live-ring-stats">
              <div>
                <dt class="sr-only">{{ t("stats.damage") }}</dt>
                <dd>
                  <span>{{ ringTotalDamage(ring) }}</span>
                </dd>
              </div>
              <div>
                <dt class="sr-only">{{ t("stats.cooldown") }}</dt>
                <dd
                  :class="{ 'live-stat-warning': ringAvailabilityReason(ring) === 'cooldown' }"
                  :aria-label="cooldownStatLabel(ring)"
                >
                  <span v-if="cooldownReady(ring)" class="live-cooldown-ready">
                    {{ t("battle.live.cooldownReady") }}
                  </span>
                  <template v-else>
                    <span>{{ ring.currentCooldown }}/{{ ring.cooldown }}</span>
                  </template>
                </dd>
              </div>
            </dl>
            <div class="live-ring-footer">
              <dl class="live-ring-energy-cost">
                <div>
                  <dt class="sr-only">{{ t("stats.energy") }}</dt>
                  <dd :class="{ 'live-stat-warning': ringAvailabilityReason(ring) === 'energy' }">
                    <Zap :size="18" aria-hidden="true" />
                    <span>{{ ring.energyCost }}</span>
                  </dd>
                </div>
              </dl>
              <div
                v-if="ring.socketCount > 0"
                class="live-socket-track"
                :aria-label="t('stats.sockets')"
              >
                <span
                  v-for="slot in liveRingSocketSlots(ring)"
                  :key="`${ring.id}-socket-${slot.index}`"
                  :class="[
                    'live-socket',
                    slot.gem ? `rarity-border-${slot.gem.rarity}` : '',
                    { filled: slot.gem },
                  ]"
                  :title="
                    slot.gem
                      ? contentText(`gem.${slot.gem.definitionId}.name`, slot.gem.label)
                      : t('battle.live.emptySocket')
                  "
                >
                  <ItemArtwork
                    v-if="slot.gem"
                    :definition-id="slot.gem.definitionId"
                    kind="gem"
                    :rarity-border="false"
                    :title="contentText(`gem.${slot.gem.definitionId}.name`, slot.gem.label)"
                  />
                </span>
              </div>
            </div>
            <small v-if="!sourceAvailability(ringSource(ring)).available" class="muted">
              {{ availabilityLabel(ringSource(ring)) }}
            </small>
          </article>
        </div>

        <div class="live-energy-rail viewer-energy">
          <span>{{ battle.viewer.username }} {{ t("stats.energy") }}</span>
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

      <p v-if="activeSpellTarget" class="panel live-action-error" role="status">
        {{
          t("battle.live.selectSpellTarget", {
            spell: activeSpellTarget.label,
            current: completedSpellTargetCount + 1,
            total: totalSpellTargetCount,
          })
        }}
      </p>

      <p v-if="actionError" class="panel live-action-error" role="alert">{{ actionError }}</p>

      <Teleport to="body">
        <div
          v-if="showDeveloperModal"
          class="live-developer-modal-backdrop"
          role="presentation"
          @click.self="showDeveloperModal = false"
        >
          <aside
            class="panel live-developer-modal"
            role="dialog"
            aria-modal="true"
            :aria-label="t('battle.live.devTools')"
          >
            <div class="card-heading">
              <div>
                <span class="eyebrow">{{ t("battle.live.diagnostics") }}</span>
                <h2>{{ t("battle.live.devTools") }}</h2>
              </div>
              <button
                class="icon-button"
                type="button"
                :aria-label="t('battle.live.closeDiagnostics')"
                :title="t('battle.live.closeDiagnostics')"
                @click="showDeveloperModal = false"
              >
                <X :size="19" aria-hidden="true" />
              </button>
            </div>

            <section
              v-if="presentedEvents.length > 0"
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

            <section class="live-diagnostics">
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
                  <dt>{{ t("battle.result.rules") }}</dt>
                  <dd>{{ battle.rulesVersion }}</dd>
                </div>
                <div class="stat">
                  <dt>{{ t("battle.result.content") }}</dt>
                  <dd>{{ battle.contentVersion }}</dd>
                </div>
              </dl>
              <p v-if="lastEvents.length > 0" class="muted live-raw-events">
                {{ lastEvents.map((event) => event.type).join(" - ") }}
              </p>
            </section>
          </aside>
        </div>
      </Teleport>

      <section
        v-if="battle.status === 'finished' && battle.summary"
        :class="['live-finished-screen', `outcome-${resultOutcome}`]"
      >
        <div class="live-finished-outcome">
          <Trophy v-if="resultOutcome === 'win'" :size="48" aria-hidden="true" />
          <Scale v-else-if="resultOutcome === 'draw'" :size="48" aria-hidden="true" />
          <ShieldX v-else :size="48" aria-hidden="true" />
          <span class="eyebrow">{{ t(`battle.mode.${battle.mode}`) }}</span>
          <h1>{{ resultLabel }}</h1>
        </div>

        <BattleResultSummary
          :mode="battle.mode"
          :summary="battle.summary"
          :reward="battle.reward"
        />

        <p v-if="!battle.reward" class="live-finished-no-reward">
          {{ t("battle.history.noReward") }}
        </p>

        <div class="live-finished-actions">
          <NuxtLink class="button-link secondary-button" to="/battle">
            <LogOut :size="18" aria-hidden="true" />
            {{ t("battle.live.leave") }}
          </NuxtLink>
          <NuxtLink class="button-link secondary-button" :to="`/battle/result/${battle.id}`">{{
            t("battle.live.resultDetails")
          }}</NuxtLink>
          <button
            v-if="battle.reward?.status === 'unclaimed'"
            type="button"
            :disabled="claimingReward"
            @click="claimReward"
          >
            <Gift :size="18" aria-hidden="true" />
            {{ t(claimingReward ? "battle.live.claiming" : "battle.live.claimRewards") }}
          </button>
          <span v-else-if="battle.reward" class="live-finished-claimed">
            <CheckCircle2 :size="18" aria-hidden="true" />
            {{ t("battle.result.rewardSecured") }}
          </span>
        </div>
      </section>
    </template>
  </main>
</template>

<script setup lang="ts">
import {
  Bug,
  CheckCircle2,
  Flag,
  Gift,
  Heart,
  LogOut,
  Scale,
  ShieldX,
  Sword,
  Timer,
  Trophy,
  X,
  Zap,
} from "@lucide/vue";
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
  cooldownReady,
  presentBattleEvent,
  ringTotalDamage,
  shouldShowInitialBattleLoading,
  type LiveBattleActionSource,
  type LiveBattleEventPresentation,
  type LiveBattleResolutionEffects,
} from "~/utils/liveBattlePresentation";
import { isPvpBattleMode, visiblePvpOpponentRings } from "~/utils/pvpPresentation";

const route = useRoute();
const { t } = useI18n();
const contentText = useContentText();
const battleId = computed(() => String(route.params.battleId));
const {
  data: battle,
  pending,
  refresh,
} = await useFetch<LiveBattleState>(() => `/api/battle/live/${battleId.value}`);
const isPvpBattle = computed(() => isPvpBattleMode(battle.value?.mode ?? ""));
const visibleOpponentRings = computed(() => {
  const currentBattle = battle.value;
  if (!currentBattle) return [];
  return isPvpBattleMode(currentBattle.mode)
    ? visiblePvpOpponentRings(currentBattle.mode, "live", currentBattle.opponent.rings)
    : (currentBattle.opponent.rings ?? []);
});
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
const primaryRingTargetId = ref<string | null>(null);
const pendingSpellTargets = ref<SpellTargetRequest[]>([]);
const ringEnchantmentTargets = ref<Record<string, string>>({});
const totalSpellTargetCount = ref(0);
const submitting = ref(false);
const claimingReward = ref(false);
const showDeveloperModal = ref(false);
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
const presentedEvents = computed(() =>
  lastEvents.value.map((event) => presentBattleEvent(event, eventLabel)),
);
const resolutionSourceIds = computed(() => new Set(resolutionEffects.value.sourceIds));
const activeSpellTarget = computed(() => pendingSpellTargets.value[0] ?? null);
const completedSpellTargetCount = computed(
  () => totalSpellTargetCount.value - pendingSpellTargets.value.length,
);

type SpellTargetRequest = {
  gemId: string;
  label: string;
  allowedTargets: ("anyCombatant" | "anyMonster" | "alliedMonster" | "enemyMonster")[];
  requiresTauntTargeting: boolean;
};

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
const resultOutcome = computed<"win" | "draw" | "loss">(() => {
  const result = battle.value?.result;
  if (!result || result.type === "draw") return "draw";
  return result.winnerId === battle.value?.viewer.id ? "win" : "loss";
});
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
const isDevelopment = import.meta.dev;

function liveRingSocketSlots(ring: LiveBattleRingView) {
  return Array.from({ length: ring.socketCount }, (_, index) => ({
    index,
    gem: ring.gems[index] ?? null,
  }));
}

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
function ringAvailabilityReason(ring: LiveBattleRingView) {
  return sourceAvailability(ringSource(ring)).reason;
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
function cooldownStatLabel(
  item: Pick<LiveBattleMonsterView | LiveBattleRingView, "currentCooldown" | "cooldown">,
): string {
  return cooldownReady(item)
    ? t("battle.live.cooldownReady")
    : `${t("stats.cooldown")} ${item.currentCooldown}/${item.cooldown}`;
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
  const spellTarget = activeSpellTarget.value;
  const legalForCurrentStage = spellTarget
    ? target !== undefined &&
      spellTarget.allowedTargets.some((allowed) => spellTargetAllows(allowed, target)) &&
      (!spellTarget.requiresTauntTargeting || !target.blockedByTaunt)
    : Boolean(target && !target.blockedByTaunt);
  return Boolean(
    selectedSource.value &&
    sourceAvailability(selectedSource.value).available &&
    legalForCurrentStage &&
    !submitting.value,
  );
}

function spellTargetAllows(
  allowed: SpellTargetRequest["allowedTargets"][number],
  target: NonNullable<ReturnType<typeof targetState>>,
): boolean {
  if (allowed === "anyCombatant") return true;
  if (target.kind !== "monster") return false;
  if (allowed === "anyMonster") return true;
  return allowed === "alliedMonster" ? target.side === "viewer" : target.side === "opponent";
}
function targetInteractionLabel(targetId: string): string {
  const target = targetState(targetId);
  if (target?.blockedByTaunt && !canSelectTarget(targetId)) return t("battle.live.blockedByTaunt");
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
      "target-blocked": Boolean(
        selectedSource.value && target?.blockedByTaunt && !canSelectTarget(targetId),
      ),
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
  if (selectedSource.value?.id === source.id) {
    clearPreparedAction();
    return;
  }
  if (!canPrepareSource(source)) return;
  selectedSource.value = source;
  selectedTargetId.value = null;
  primaryRingTargetId.value = null;
  pendingSpellTargets.value = [];
  ringEnchantmentTargets.value = {};
  totalSpellTargetCount.value = 0;
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
  if (selectedSource.value?.id === monster.id) {
    clearPreparedAction();
    return;
  }
  if (selectedSource.value) {
    void executeTarget(monster.id);
    return;
  }
  prepareSource(monsterSource(monster));
}
function clearPreparedAction(): void {
  selectedSource.value = null;
  selectedTargetId.value = null;
  primaryRingTargetId.value = null;
  pendingSpellTargets.value = [];
  ringEnchantmentTargets.value = {};
  totalSpellTargetCount.value = 0;
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
  if (source.kind === "ring" && primaryRingTargetId.value === null) {
    primaryRingTargetId.value = targetId;
    const primaryTarget = targetState(targetId);
    pendingSpellTargets.value = source.item.gems.flatMap((gem) => {
      const enchantment = gem.enchantment;
      if (enchantment?.type !== "spell" || enchantment.targeting.selection === "none") return [];
      const acceptsPrimary =
        primaryTarget &&
        enchantment.targeting.allowedTargets.some((allowed) =>
          spellTargetAllows(allowed, primaryTarget),
        ) &&
        (!enchantment.requiresTauntTargeting || !primaryTarget.blockedByTaunt);
      return acceptsPrimary
        ? []
        : [
            {
              gemId: gem.id,
              label: enchantment.label,
              allowedTargets: enchantment.targeting.allowedTargets,
              requiresTauntTargeting: enchantment.requiresTauntTargeting,
            },
          ];
    });
    totalSpellTargetCount.value = pendingSpellTargets.value.length;
    if (pendingSpellTargets.value.length > 0) {
      selectedTargetId.value = null;
      return;
    }
  } else if (source.kind === "ring" && activeSpellTarget.value) {
    ringEnchantmentTargets.value[activeSpellTarget.value.gemId] = targetId;
    pendingSpellTargets.value.shift();
    if (pendingSpellTargets.value.length > 0) {
      selectedTargetId.value = null;
      return;
    }
  }

  const action: LiveBattleActionCommand =
    source.kind === "ring"
      ? {
          type: "useRing",
          ringInstanceId: source.id,
          targetId: primaryRingTargetId.value ?? targetId,
          ...(Object.keys(ringEnchantmentTargets.value).length > 0
            ? { enchantmentTargets: ringEnchantmentTargets.value }
            : {}),
        }
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
