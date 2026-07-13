<template>
  <main class="shell">
    <nav class="section-nav" aria-label="Battle navigation">
      <NuxtLink v-for="link in sectionLinks.battle" :key="link.to" :to="link.to">
        {{ link.label }}
      </NuxtLink>
    </nav>

    <header class="view-header">
      <div class="view-title">
        <span class="eyebrow">{{ battle?.mode ?? "Battle" }}</span>
        <h1>Live Battle</h1>
        <p class="muted">{{ statusLabel }}</p>
      </div>
      <NuxtLink class="button-link secondary-button" to="/battle">Leave View</NuxtLink>
    </header>

    <p v-if="pending" class="panel">Loading battle...</p>
    <p v-else-if="error || !battle" class="panel">Battle not found.</p>

    <template v-else>
      <section class="live-battle-status" aria-label="Battle status">
        <div>
          <span class="eyebrow">Turn</span>
          <strong>{{ battle.turnCount }}</strong>
        </div>
        <div>
          <span class="eyebrow">Active Player</span>
          <strong>{{ activePlayerName }}</strong>
        </div>
        <div>
          <span class="eyebrow">Actions</span>
          <strong>{{ battle.actionCount }}</strong>
        </div>
        <div>
          <span class="eyebrow">Status</span>
          <strong>{{ battle.status }}</strong>
        </div>
      </section>

      <section class="panel live-battlefield opponent-field">
        <div class="live-player-heading">
          <div>
            <span class="eyebrow">Opponent</span>
            <h2>{{ battle.opponent.username }}</h2>
          </div>
          <span class="pill">{{ battle.opponent.ringCount }} hidden rings</span>
        </div>

        <div class="live-combat-row opponent-row">
          <article class="live-hero">
            <span class="eyebrow">Level {{ battle.opponent.level }}</span>
            <strong>{{ battle.opponent.username }}</strong>
            <dl>
              <div>
                <dt>Health</dt>
                <dd>{{ battle.opponent.hero.health }}/{{ battle.opponent.hero.maxHealth }}</dd>
              </div>
              <div>
                <dt>Speed</dt>
                <dd>{{ battle.opponent.hero.speed }}</dd>
              </div>
              <div>
                <dt>Energy</dt>
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
              <strong>{{ monster.label }}</strong>
              <small>{{ monster.health }}/{{ monster.maxHealth }} HP</small>
              <small
                >{{ monster.damage }} DMG - {{ monster.currentCooldown }}/{{
                  monster.cooldown
                }}
                CD</small
              >
            </article>
            <div
              v-for="slot in Math.max(0, 3 - battle.opponent.monsters.length)"
              :key="`opponent-empty-${slot}`"
              class="live-monster empty-slot"
              aria-label="Empty monster slot"
            />
          </div>
        </div>
      </section>

      <section class="panel live-battlefield viewer-field">
        <div class="live-combat-row">
          <article class="live-hero">
            <span class="eyebrow">Level {{ battle.viewer.level }}</span>
            <strong>{{ battle.viewer.username }}</strong>
            <dl>
              <div>
                <dt>Health</dt>
                <dd>{{ battle.viewer.hero.health }}/{{ battle.viewer.hero.maxHealth }}</dd>
              </div>
              <div>
                <dt>Speed</dt>
                <dd>{{ battle.viewer.hero.speed }}</dd>
              </div>
              <div>
                <dt>Energy</dt>
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
              <strong>{{ monster.label }}</strong>
              <small>{{ monster.health }}/{{ monster.maxHealth }} HP</small>
              <small
                >{{ monster.damage }} DMG - {{ monster.currentCooldown }}/{{
                  monster.cooldown
                }}
                CD</small
              >
              <div class="live-action-controls">
                <select
                  v-model="selectedTargets[monster.id]"
                  :aria-label="`Target for ${monster.label}`"
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
                  Attack
                </button>
              </div>
            </article>
            <div
              v-for="slot in Math.max(0, 3 - battle.viewer.monsters.length)"
              :key="`viewer-empty-${slot}`"
              class="live-monster empty-slot"
              aria-label="Empty monster slot"
            />
          </div>
        </div>

        <div class="live-player-heading">
          <div>
            <span class="eyebrow">Active Loadout</span>
            <h2>{{ battle.viewer.ringCount }} Rings</h2>
          </div>
          <span :class="['status-note', isViewerTurn ? 'ready-note' : '']">
            {{ isViewerTurn ? "Your turn" : "Opponent turn" }}
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
            <strong>{{ ring.label }}</strong>
            <dl>
              <div>
                <dt>Damage</dt>
                <dd>{{ ring.damage }}</dd>
              </div>
              <div>
                <dt>Energy</dt>
                <dd>{{ ring.energyCost }}</dd>
              </div>
              <div>
                <dt>Cooldown</dt>
                <dd>{{ ring.currentCooldown }}/{{ ring.cooldown }}</dd>
              </div>
            </dl>
            <div class="live-gem-row">
              <ItemArtwork
                v-for="gem in ring.gems"
                :key="gem.id"
                :definition-id="gem.definitionId"
                kind="gem"
                :title="gem.label"
              />
            </div>
            <div class="live-action-controls">
              <select
                v-model="selectedTargets[ring.id]"
                :aria-label="`Target for ${ring.label}`"
                :disabled="!canAct || submitting"
              >
                <option v-for="target in targets" :key="target.id" :value="target.id">
                  {{ target.label }}
                </option>
              </select>
              <button type="button" :disabled="!canUseRing(ring)" @click="useRing(ring.id)">
                Use Ring
              </button>
            </div>
          </article>
        </div>
      </section>

      <section v-if="battle.status === 'choosingFirstPlayer'" class="panel live-choice-panel">
        <div>
          <span class="eyebrow">Element Duel</span>
          <h2>Choose an element</h2>
        </div>
        <div class="segmented-control live-element-choice">
          <button
            v-for="element in elements"
            :key="element"
            type="button"
            :disabled="submitting"
            @click="chooseElement(element)"
          >
            {{ element }}
          </button>
        </div>
      </section>

      <section class="panel live-command-bar" aria-label="Battle commands">
        <div>
          <span class="eyebrow">Server Actions</span>
          <strong>{{ actionFeedback }}</strong>
        </div>
        <div class="live-command-buttons">
          <button type="button" :disabled="!canAct || submitting" @click="endTurn">End Turn</button>
          <button
            type="button"
            class="secondary-button"
            :disabled="battle.status === 'finished' || submitting"
            @click="concede"
          >
            Concede
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
const battleId = computed(() => String(route.params.battleId));
const {
  data: battle,
  error,
  pending,
} = await useFetch<LiveBattleState>(() => `/api/battle/live/${battleId.value}`);
const isViewerTurn = computed(() => battle.value?.activePlayerId === battle.value?.viewer.id);
const canAct = computed(
  () => battle.value?.status === "active" && isViewerTurn.value && !submitting.value,
);
const elements = ["electric", "fire", "ice"] as const;
const selectedTargets = reactive<Record<string, string>>({});
const submitting = ref(false);
const actionError = ref("");
const lastEventTypes = ref<string[]>([]);
const targets = computed(() => {
  const currentBattle = battle.value;
  if (!currentBattle) {
    return [];
  }

  return [
    { id: currentBattle.opponent.heroTargetId, label: `${currentBattle.opponent.username} - Hero` },
    ...currentBattle.opponent.monsters.map((monster) => ({
      id: monster.id,
      label: `${currentBattle.opponent.username} - ${monster.label}`,
    })),
    { id: currentBattle.viewer.heroTargetId, label: `${currentBattle.viewer.username} - Hero` },
    ...currentBattle.viewer.monsters.map((monster) => ({
      id: monster.id,
      label: `${currentBattle.viewer.username} - ${monster.label}`,
    })),
  ];
});
const actionFeedback = computed(() => {
  if (submitting.value) {
    return "Submitting action...";
  }
  if (lastEventTypes.value.length > 0) {
    return lastEventTypes.value.join(" - ");
  }
  if (battle.value?.status === "finished") {
    return "Battle finished";
  }
  return canAct.value ? "Choose an action" : "Waiting for the active player";
});
const activePlayerName = computed(() => {
  if (!battle.value?.activePlayerId) {
    return "Pending";
  }
  return battle.value.activePlayerId === battle.value.viewer.id
    ? battle.value.viewer.username
    : battle.value.opponent.username;
});
const statusLabel = computed(() => {
  if (!battle.value) {
    return "Server-authoritative battle state.";
  }
  if (battle.value.status === "choosingFirstPlayer") {
    return "First player selection pending.";
  }
  if (battle.value.status === "finished") {
    return "Battle finished.";
  }
  return isViewerTurn.value ? "Your turn." : "Opponent turn.";
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
      fetchError.data?.statusMessage ?? fetchError.message ?? "Battle action failed.";
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
</script>
