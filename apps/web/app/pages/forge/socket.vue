<template>
  <main class="shell">
    <nav class="section-nav" aria-label="Forge navigation">
      <NuxtLink
        v-for="link in sectionLinks.forge"
        :key="link.to"
        :class="{ active: route.path === link.to }"
        :to="link.to"
      >
        {{ link.label }}
      </NuxtLink>
    </nav>

    <header class="view-header">
      <div class="view-title">
        <span class="eyebrow">Forge</span>
        <h1>Socket</h1>
        <p class="muted">Add and remove owned gems from ring sockets.</p>
      </div>
    </header>

    <p v-if="pending" class="panel">Loading socket state...</p>
    <p v-else-if="error" class="panel">Unable to load socket state.</p>

    <template v-else-if="socketState">
      <p v-if="feedback" class="feedback">{{ feedback }}</p>
      <p v-if="actionError" class="status-note">{{ actionError }}</p>
      <p class="status-note">Credits: {{ socketState.player.credits }}</p>

      <section class="detail-layout">
        <div>
          <section class="split-layout socket-layout">
            <div class="stack">
              <section class="panel">
            <div class="card-heading">
              <div>
                <h2>Ring</h2>
                <p class="muted">Select the ring that will receive or release gems.</p>
              </div>
              <NuxtLink class="button-link" to="/forge/craft">Craft Items</NuxtLink>
            </div>

            <label>
              <span class="field-label">Owned ring</span>
              <select v-model="selectedRingId">
                <option value="">Select a ring</option>
                <option v-for="ring in socketState.rings" :key="ring.id" :value="ring.id">
                  {{ ring.label }} - {{ ring.gems.length }}/{{ ring.socketCount ?? 0 }} sockets
                </option>
              </select>
            </label>

            <p v-if="socketState.rings.length === 0" class="status-note">
              Craft a ring before managing sockets.
            </p>

            <article
              v-if="selectedRing"
              :class="['card', 'item-card', `rarity-border-${selectedRing.rarity}`]"
            >
              <ItemArtwork :definition-id="selectedRing.definitionId" kind="ring" />
              <div class="item-card-body">
                <div class="card-heading">
                  <h3>{{ selectedRing.label }}</h3>
                  <span :class="['pill', `element-${selectedRing.element}`]">
                    {{ selectedRing.element }}
                  </span>
                </div>
                <RingStatGrid :ring="selectedRing" />
                <div class="control-row">
                  <button class="secondary-button" @click="selectedDetailItemId = selectedRing.id">
                    Inspect
                  </button>
                </div>
                <div class="socket-improvement">
                  <div>
                    <strong>Socket Capacity</strong>
                    <small>
                      {{ selectedRing.socketCount ?? 0 }} / {{ socketState.maxRingSockets }}
                    </small>
                  </div>
                  <div>
                    <span v-if="selectedRing.socketImprovementCost !== null">
                      Next: {{ selectedRing.nextSocketCount }} sockets, cost
                      {{ selectedRing.socketImprovementCost }} credits
                    </span>
                    <span v-else>Maximum socket capacity reached.</span>
                    <button
                      class="secondary-button"
                      :disabled="!selectedRing.canImproveSockets || updating"
                      @click="improveSelectedRingSockets"
                    >
                      Improve Sockets
                    </button>
                  </div>
                  <small
                    v-if="
                      selectedRing.socketImprovementCost !== null &&
                      !selectedRing.canImproveSockets
                    "
                  >
                    Not enough credits for this socket improvement.
                  </small>
                </div>
              </div>
            </article>
              </section>

              <section v-if="selectedRing" class="panel">
            <h2>Sockets</h2>
            <div class="socket-slot-list">
              <article
                v-for="socketIndex in socketIndexes"
                :key="socketIndex"
                :class="[
                  'socket-slot-card',
                  socketGem(socketIndex) ? `rarity-border-${socketGem(socketIndex)?.rarity}` : '',
                ]"
              >
                <template v-if="socketGem(socketIndex)">
                  <ItemArtwork
                    :definition-id="socketGem(socketIndex)?.definitionId ?? ''"
                    kind="gem"
                  />
                  <div>
                    <strong>{{ socketIndex + 1 }}. {{ socketGem(socketIndex)?.label }}</strong>
                    <small>
                      Damage {{ socketGem(socketIndex)?.damage }}, Energy +{{
                        socketGem(socketIndex)?.energyPenalty
                      }}, Cooldown +{{ socketGem(socketIndex)?.cooldownPenalty }}
                    </small>
                    <button
                      class="secondary-button"
                      :disabled="updating"
                      @click="unsocket(socketGem(socketIndex)?.id ?? '')"
                    >
                      Unsocket
                    </button>
                  </div>
                </template>
                <template v-else>
                  <div class="empty-socket">
                    <strong>{{ socketIndex + 1 }}. Empty socket</strong>
                    <small>Available for one gem.</small>
                  </div>
                </template>
              </article>
            </div>
              </section>
            </div>

            <section class="panel">
          <h2>Available Gems</h2>
          <p v-if="socketState.gems.length === 0" class="muted">Craft gems before socketing.</p>

          <form v-else class="toolbar" @submit.prevent="socketSelectedGem">
            <label>
              <span class="field-label">Gem</span>
              <select v-model="selectedGemId">
                <option value="">Select a gem</option>
                <option v-for="gem in availableGems" :key="gem.id" :value="gem.id">
                  {{ gem.label }} - damage {{ gem.damage }}
                </option>
              </select>
            </label>
            <button :disabled="!canSocketSelectedGem || updating" type="submit">Socket</button>
          </form>

          <p v-if="socketState.gems.length > 0 && availableGems.length === 0" class="status-note">
            All owned gems are already socketed.
          </p>
          <p v-if="selectedRing && ringIsFull" class="status-note">
            The selected ring has no available sockets.
          </p>

          <div class="item-grid socket-gem-grid">
            <article
              v-for="gem in socketState.gems"
              :key="gem.id"
              :class="[
                'card',
                'item-card',
                `rarity-border-${gem.rarity}`,
                {
                  'muted-card': gem.socketedRingId,
                  selected: socketDetailItem?.id === gem.id,
                },
              ]"
            >
              <ItemArtwork :definition-id="gem.definitionId" kind="gem" />
              <div class="item-card-body">
                <div class="card-heading">
                  <h3>{{ gem.label }}</h3>
                  <span
                    :class="['pill', gem.socketedRingId ? 'muted-pill' : `element-${gem.element}`]"
                  >
                    {{ gem.socketedRingId ? "socketed" : gem.element }}
                  </span>
                </div>
                <dl class="summary-grid">
                  <div class="stat">
                    <dt>Damage</dt>
                    <dd>{{ gem.damage }}</dd>
                  </div>
                  <div class="stat">
                    <dt>Energy</dt>
                    <dd>+{{ gem.energyPenalty }}</dd>
                  </div>
                  <div class="stat">
                    <dt>Cooldown</dt>
                    <dd>+{{ gem.cooldownPenalty }}</dd>
                  </div>
                  <div class="stat">
                    <dt>Quality</dt>
                    <dd>{{ gem.quality }}</dd>
                  </div>
                </dl>
                <small v-if="gem.enchantment">
                  {{ gem.enchantment.type }}: {{ gem.enchantment.label }}
                </small>
                <div class="control-row">
                  <button class="secondary-button" @click="selectedDetailItemId = gem.id">
                    Inspect
                  </button>
                </div>
                <code>{{ gem.id }}</code>
              </div>
            </article>
          </div>
            </section>
          </section>

          <section class="panel enchantment-panel">
        <div class="card-heading">
          <div>
            <h2>Gem Enchantment</h2>
            <p class="muted">Attach one owned spell or monster to a gem.</p>
          </div>
          <NuxtLink class="button-link" to="/forge/craft">Craft Spells Or Monsters</NuxtLink>
        </div>

        <p v-if="socketState.gems.length === 0" class="status-note">
          Craft a gem before managing enchantments.
        </p>
        <p v-else-if="socketState.enchantmentTargets.length === 0" class="status-note">
          Craft a spell or monster before enchanting gems.
        </p>

        <template v-else>
          <form class="toolbar" @submit.prevent="enchantSelectedGem">
            <label>
              <span class="field-label">Gem</span>
              <select v-model="selectedEnchantGemId">
                <option value="">Select a gem</option>
                <option v-for="gem in socketState.gems" :key="gem.id" :value="gem.id">
                  {{ gem.label }}{{ gem.enchantment ? ` - ${gem.enchantment.label}` : "" }}
                </option>
              </select>
            </label>

            <label>
              <span class="field-label">Spell or monster</span>
              <select
                v-model="selectedTargetId"
                :disabled="Boolean(selectedEnchantGem?.enchantment)"
              >
                <option value="">Select a target</option>
                <option
                  v-for="target in availableEnchantmentTargets"
                  :key="target.id"
                  :value="target.id"
                >
                  {{ target.label }} - {{ target.type }}
                </option>
              </select>
            </label>

            <button
              v-if="selectedEnchantGem?.enchantment"
              class="secondary-button"
              :disabled="updating"
              type="button"
              @click="unenchantSelectedGem"
            >
              Remove
            </button>
            <button v-else :disabled="!canEnchantSelectedGem || updating" type="submit">
              Enchant
            </button>
          </form>

          <div class="item-grid socket-gem-grid">
            <article
              v-for="target in socketState.enchantmentTargets"
              :key="target.id"
              :class="[
                'card',
                'item-card',
                `rarity-border-${target.rarity}`,
                {
                  'muted-card': target.enchantedGemId,
                  selected: socketDetailItem?.id === target.id,
                },
              ]"
            >
              <ItemArtwork :definition-id="target.definitionId" :kind="target.type" />
              <div class="item-card-body">
                <div class="card-heading">
                  <h3>{{ target.label }}</h3>
                  <span
                    :class="[
                      'pill',
                      target.enchantedGemId ? 'muted-pill' : `element-${target.element}`,
                    ]"
                  >
                    {{ target.enchantedGemId ? "used" : target.element }}
                  </span>
                </div>
                <dl class="summary-grid">
                  <div class="stat">
                    <dt>Type</dt>
                    <dd>{{ target.type }}</dd>
                  </div>
                  <div class="stat">
                    <dt>Damage</dt>
                    <dd>{{ target.damage }}</dd>
                  </div>
                  <div v-if="target.type === 'monster'" class="stat">
                    <dt>Health</dt>
                    <dd>{{ target.health }}</dd>
                  </div>
                  <div v-else class="stat">
                    <dt>Energy</dt>
                    <dd>+{{ target.energyPenalty }}</dd>
                  </div>
                </dl>
                <div class="control-row">
                  <button class="secondary-button" @click="selectedDetailItemId = target.id">
                    Inspect
                  </button>
                </div>
                <code>{{ target.id }}</code>
              </div>
            </article>
          </div>
        </template>
          </section>
        </div>

        <ItemDetailPanel
          :item="socketDetailItem"
          title="Socket Detail"
          @clear="selectedDetailItemId = ''"
        />
      </section>
    </template>
  </main>
</template>

<script setup lang="ts">
import type {
  EquipmentGemView,
  SocketEnchantmentTargetView,
  SocketState,
} from "~/utils/playerState";
import { sectionLinks } from "~/utils/viewData";

const route = useRoute();
const feedback = ref("");
const actionError = ref("");
const updating = ref(false);
const selectedRingId = ref("");
const selectedGemId = ref("");
const selectedEnchantGemId = ref("");
const selectedTargetId = ref("");
const selectedDetailItemId = ref("");
const {
  data: socketState,
  error,
  pending,
  refresh,
} = await useFetch<SocketState>("/api/forge/socket");

const selectedRing = computed(
  () => socketState.value?.rings.find((ring) => ring.id === selectedRingId.value) ?? null,
);
const availableGems = computed(() =>
  (socketState.value?.gems ?? []).filter((gem) => gem.socketedRingId === null),
);
const selectedEnchantGem = computed(
  () => socketState.value?.gems.find((gem) => gem.id === selectedEnchantGemId.value) ?? null,
);
const selectedTarget = computed(
  () =>
    socketState.value?.enchantmentTargets.find((target) => target.id === selectedTargetId.value) ??
    null,
);
const socketDetailItem = computed(() => {
  const items = [
    ...(socketState.value?.rings ?? []),
    ...(socketState.value?.gems ?? []),
    ...(socketState.value?.enchantmentTargets ?? []),
  ];

  return items.find((item) => item.id === selectedDetailItemId.value) ?? selectedRing.value;
});
const availableEnchantmentTargets = computed(() =>
  (socketState.value?.enchantmentTargets ?? []).filter((target) => target.enchantedGemId === null),
);
const ringIsFull = computed(() => {
  if (!selectedRing.value) {
    return false;
  }

  return selectedRing.value.gems.length >= (selectedRing.value.socketCount ?? 0);
});
const canSocketSelectedGem = computed(
  () => Boolean(selectedRing.value && selectedGemId.value) && !ringIsFull.value,
);
const canEnchantSelectedGem = computed(
  () =>
    Boolean(selectedEnchantGem.value && selectedTarget.value) &&
    !selectedEnchantGem.value?.enchantment,
);
const socketIndexes = computed(() =>
  Array.from({ length: selectedRing.value?.socketCount ?? 0 }, (_, index) => index),
);

watchEffect(() => {
  if (!selectedRingId.value && socketState.value?.rings[0]) {
    selectedRingId.value = socketState.value.rings[0].id;
  }
  if (selectedGemId.value && !availableGems.value.some((gem) => gem.id === selectedGemId.value)) {
    selectedGemId.value = "";
  }
  if (!selectedEnchantGemId.value && socketState.value?.gems[0]) {
    selectedEnchantGemId.value = socketState.value.gems[0].id;
  }
  if (
    selectedTargetId.value &&
    !availableEnchantmentTargets.value.some((target) => target.id === selectedTargetId.value)
  ) {
    selectedTargetId.value = "";
  }
});

function socketGem(socketIndex: number): EquipmentGemView | undefined {
  return selectedRing.value?.gems.find((gem) => gem.socketIndex === socketIndex);
}

async function socketSelectedGem() {
  if (!selectedRing.value || !selectedGemId.value) {
    return;
  }

  await updateSocketState({
    action: "socket",
    ringItemId: selectedRing.value.id,
    gemItemId: selectedGemId.value,
  });
  selectedGemId.value = "";
  feedback.value = "Gem socketed.";
}

async function unsocket(gemItemId: string) {
  if (!gemItemId) {
    return;
  }

  await updateSocketState({
    action: "unsocket",
    gemItemId,
  });
  feedback.value = "Gem unsocketed.";
}

async function improveSelectedRingSockets() {
  if (!selectedRing.value) {
    return;
  }

  await updateSocketState({
    action: "improveSockets",
    ringItemId: selectedRing.value.id,
  });
  feedback.value = "Ring socket capacity improved.";
}

async function enchantSelectedGem() {
  if (!selectedEnchantGem.value || !selectedTarget.value) {
    return;
  }

  await updateSocketState({
    action: "enchant",
    gemItemId: selectedEnchantGem.value.id,
    targetItemId: selectedTarget.value.id,
    targetType: selectedTarget.value.type,
  });
  selectedTargetId.value = "";
  feedback.value = "Gem enchanted.";
}

async function unenchantSelectedGem() {
  if (!selectedEnchantGem.value) {
    return;
  }

  await updateSocketState({
    action: "unenchant",
    gemItemId: selectedEnchantGem.value.id,
  });
  feedback.value = "Gem enchantment removed.";
}

async function updateSocketState(body: {
  action: string;
  ringItemId?: string;
  gemItemId?: string;
  targetItemId?: string;
  targetType?: SocketEnchantmentTargetView["type"];
}) {
  feedback.value = "";
  actionError.value = "";
  updating.value = true;

  try {
    socketState.value = await $fetch<SocketState>("/api/forge/socket", {
      method: "POST",
      body,
    });
    await refresh();
  } catch (error_) {
    actionError.value = error_ instanceof Error ? error_.message : "Socket update failed.";
  } finally {
    updating.value = false;
  }
}
</script>
