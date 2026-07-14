<template>
  <main class="shell">
    <nav class="section-nav" :aria-label="t('accessibility.forgeNavigation')">
      <NuxtLink
        v-for="link in sectionLinks.forge"
        :key="link.to"
        :class="{ active: route.path === link.to }"
        :to="link.to"
      >
        {{ $t(link.labelKey) }}
      </NuxtLink>
    </nav>

    <header class="view-header">
      <div class="view-title">
        <span class="eyebrow">{{ t("forge.section") }}</span>
        <h1>{{ t("forge.socket.title") }}</h1>
        <p class="muted">{{ t("forge.socket.description") }}</p>
      </div>
    </header>

    <p v-if="pending" class="panel">{{ t("forge.socket.loading") }}</p>
    <p v-else-if="error" class="panel">{{ t("forge.socket.loadError") }}</p>

    <template v-else-if="socketState">
      <p v-if="feedback" class="feedback">{{ feedback }}</p>
      <p v-if="actionError" class="status-note">{{ actionError }}</p>
      <p class="status-note">
        {{ t("common.creditCount", { count: socketState.player.credits }) }}
      </p>

      <section class="detail-layout">
        <div>
          <section class="split-layout socket-layout">
            <div class="stack">
              <section class="panel">
                <div class="card-heading">
                  <div>
                    <h2>{{ t("itemType.ring") }}</h2>
                    <p class="muted">{{ t("forge.socket.ringDescription") }}</p>
                  </div>
                  <NuxtLink class="button-link" to="/forge/craft">{{
                    t("forge.craftItems")
                  }}</NuxtLink>
                </div>

                <label>
                  <span class="field-label">{{ t("forge.socket.ownedRing") }}</span>
                  <select v-model="selectedRingId">
                    <option value="">{{ t("forge.socket.selectRing") }}</option>
                    <option v-for="ring in socketState.rings" :key="ring.id" :value="ring.id">
                      {{ itemName("ring", ring.definitionId, ring.label) }} -
                      {{
                        t("forge.socket.socketCount", {
                          used: ring.gems.length,
                          total: ring.socketCount ?? 0,
                        })
                      }}
                    </option>
                  </select>
                </label>

                <p v-if="socketState.rings.length === 0" class="status-note">
                  {{ t("forge.socket.craftRingFirst") }}
                </p>

                <article
                  v-if="selectedRing"
                  :class="['card', 'item-card', `rarity-border-${selectedRing.rarity}`]"
                >
                  <ItemArtwork :definition-id="selectedRing.definitionId" kind="ring" />
                  <div class="item-card-body">
                    <div class="card-heading">
                      <h3>{{ itemName("ring", selectedRing.definitionId, selectedRing.label) }}</h3>
                      <span :class="['pill', `element-${selectedRing.element}`]">
                        {{ t(`element.${selectedRing.element}`) }}
                      </span>
                    </div>
                    <RingStatGrid :ring="selectedRing" />
                    <div class="control-row">
                      <button
                        class="secondary-button"
                        @click="selectedDetailItemId = selectedRing.id"
                      >
                        {{ t("common.inspect") }}
                      </button>
                    </div>
                    <div class="socket-improvement">
                      <div>
                        <strong>{{ t("forge.socket.capacity") }}</strong>
                        <small>
                          {{ selectedRing.socketCount ?? 0 }} / {{ socketState.maxRingSockets }}
                        </small>
                      </div>
                      <div>
                        <span v-if="selectedRing.socketImprovementCost !== null">
                          {{
                            t("forge.socket.nextCapacity", {
                              count: selectedRing.nextSocketCount,
                              cost: selectedRing.socketImprovementCost,
                            })
                          }}
                        </span>
                        <span v-else>{{ t("forge.socket.maximumCapacity") }}</span>
                        <button
                          class="secondary-button"
                          :disabled="!selectedRing.canImproveSockets || updating"
                          @click="improveSelectedRingSockets"
                        >
                          {{ t("forge.socket.improve") }}
                        </button>
                      </div>
                      <small
                        v-if="
                          selectedRing.socketImprovementCost !== null &&
                          !selectedRing.canImproveSockets
                        "
                      >
                        {{ t("forge.socket.notEnoughCredits") }}
                      </small>
                    </div>
                  </div>
                </article>
              </section>

              <section v-if="selectedRing" class="panel">
                <h2>{{ t("stats.sockets") }}</h2>
                <div class="socket-slot-list">
                  <article
                    v-for="socketIndex in socketIndexes"
                    :key="socketIndex"
                    :class="[
                      'socket-slot-card',
                      socketGem(socketIndex)
                        ? `rarity-border-${socketGem(socketIndex)?.rarity}`
                        : '',
                    ]"
                  >
                    <template v-if="socketGem(socketIndex)">
                      <ItemArtwork
                        :definition-id="socketGem(socketIndex)?.definitionId ?? ''"
                        kind="gem"
                      />
                      <div>
                        <strong
                          >{{ socketIndex + 1 }}. {{ gemName(socketGem(socketIndex)) }}</strong
                        >
                        <small>
                          {{
                            t("forge.socket.gemStats", {
                              damage: socketGem(socketIndex)?.damage,
                              energy: socketGem(socketIndex)?.energyPenalty,
                              cooldown: socketGem(socketIndex)?.cooldownPenalty,
                            })
                          }}
                        </small>
                        <button
                          class="secondary-button"
                          :disabled="updating"
                          @click="unsocket(socketGem(socketIndex)?.id ?? '')"
                        >
                          {{ t("forge.socket.unsocket") }}
                        </button>
                      </div>
                    </template>
                    <template v-else>
                      <div class="empty-socket">
                        <strong>{{ socketIndex + 1 }}. {{ t("forge.socket.emptySocket") }}</strong>
                        <small>{{ t("forge.socket.availableSlot") }}</small>
                      </div>
                    </template>
                  </article>
                </div>
              </section>
            </div>

            <section class="panel">
              <h2>{{ t("forge.socket.availableGems") }}</h2>
              <p v-if="socketState.gems.length === 0" class="muted">
                {{ t("forge.socket.craftGemsFirst") }}
              </p>

              <form v-else class="toolbar" @submit.prevent="socketSelectedGem">
                <label>
                  <span class="field-label">{{ t("itemType.gem") }}</span>
                  <select v-model="selectedGemId">
                    <option value="">{{ t("forge.socket.selectGem") }}</option>
                    <option v-for="gem in availableGems" :key="gem.id" :value="gem.id">
                      {{ itemName("gem", gem.definitionId, gem.label) }} -
                      {{ t("battle.summary.damageValue", { count: gem.damage }) }}
                    </option>
                  </select>
                </label>
                <button :disabled="!canSocketSelectedGem || updating" type="submit">
                  {{ t("forge.socket.action") }}
                </button>
              </form>

              <p
                v-if="socketState.gems.length > 0 && availableGems.length === 0"
                class="status-note"
              >
                {{ t("forge.socket.allSocketed") }}
              </p>
              <p v-if="selectedRing && ringIsFull" class="status-note">
                {{ t("forge.socket.ringFull") }}
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
                      <h3>{{ itemName("gem", gem.definitionId, gem.label) }}</h3>
                      <span
                        :class="[
                          'pill',
                          gem.socketedRingId ? 'muted-pill' : `element-${gem.element}`,
                        ]"
                      >
                        {{
                          gem.socketedRingId
                            ? t("forge.socket.socketed")
                            : t(`element.${gem.element}`)
                        }}
                      </span>
                    </div>
                    <dl class="summary-grid">
                      <div class="stat">
                        <dt>{{ t("stats.damage") }}</dt>
                        <dd>{{ gem.damage }}</dd>
                      </div>
                      <div class="stat">
                        <dt>{{ t("stats.energy") }}</dt>
                        <dd>+{{ gem.energyPenalty }}</dd>
                      </div>
                      <div class="stat">
                        <dt>{{ t("stats.cooldown") }}</dt>
                        <dd>+{{ gem.cooldownPenalty }}</dd>
                      </div>
                      <div class="stat">
                        <dt>{{ t("common.quality") }}</dt>
                        <dd>{{ gem.quality }}</dd>
                      </div>
                    </dl>
                    <small v-if="gem.enchantment">
                      {{ t(`itemType.${gem.enchantment.type}`) }}:
                      {{
                        itemName(
                          gem.enchantment.type,
                          gem.enchantment.definitionId,
                          gem.enchantment.label,
                        )
                      }}
                    </small>
                    <div class="control-row">
                      <button class="secondary-button" @click="selectedDetailItemId = gem.id">
                        {{ t("common.inspect") }}
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
                <h2>{{ t("forge.socket.enchantment") }}</h2>
                <p class="muted">{{ t("forge.socket.enchantmentDescription") }}</p>
              </div>
              <NuxtLink class="button-link" to="/forge/craft">{{
                t("forge.socket.craftEnchantments")
              }}</NuxtLink>
            </div>

            <p v-if="socketState.gems.length === 0" class="status-note">
              {{ t("forge.socket.craftGemFirst") }}
            </p>
            <p v-else-if="socketState.enchantmentTargets.length === 0" class="status-note">
              {{ t("forge.socket.craftTargetFirst") }}
            </p>

            <template v-else>
              <form class="toolbar" @submit.prevent="enchantSelectedGem">
                <label>
                  <span class="field-label">{{ t("itemType.gem") }}</span>
                  <select v-model="selectedEnchantGemId">
                    <option value="">{{ t("forge.socket.selectGem") }}</option>
                    <option v-for="gem in socketState.gems" :key="gem.id" :value="gem.id">
                      {{ itemName("gem", gem.definitionId, gem.label)
                      }}{{
                        gem.enchantment
                          ? ` - ${itemName(gem.enchantment.type, gem.enchantment.definitionId, gem.enchantment.label)}`
                          : ""
                      }}
                    </option>
                  </select>
                </label>

                <label>
                  <span class="field-label">{{ t("forge.socket.spellOrMonster") }}</span>
                  <select
                    v-model="selectedTargetId"
                    :disabled="Boolean(selectedEnchantGem?.enchantment)"
                  >
                    <option value="">{{ t("forge.socket.selectTarget") }}</option>
                    <option
                      v-for="target in availableEnchantmentTargets"
                      :key="target.id"
                      :value="target.id"
                    >
                      {{ itemName(target.type, target.definitionId, target.label) }} -
                      {{ t(`itemType.${target.type}`) }}
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
                  {{ t("forge.socket.remove") }}
                </button>
                <button v-else :disabled="!canEnchantSelectedGem || updating" type="submit">
                  {{ t("forge.socket.enchant") }}
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
                      <h3>{{ itemName(target.type, target.definitionId, target.label) }}</h3>
                      <span
                        :class="[
                          'pill',
                          target.enchantedGemId ? 'muted-pill' : `element-${target.element}`,
                        ]"
                      >
                        {{
                          target.enchantedGemId
                            ? t("forge.socket.used")
                            : t(`element.${target.element}`)
                        }}
                      </span>
                    </div>
                    <dl class="summary-grid">
                      <div class="stat">
                        <dt>{{ t("common.type") }}</dt>
                        <dd>{{ t(`itemType.${target.type}`) }}</dd>
                      </div>
                      <div class="stat">
                        <dt>{{ t("stats.damage") }}</dt>
                        <dd>{{ target.damage }}</dd>
                      </div>
                      <div v-if="target.type === 'monster'" class="stat">
                        <dt>{{ t("stats.health") }}</dt>
                        <dd>{{ target.health }}</dd>
                      </div>
                      <div v-else class="stat">
                        <dt>{{ t("stats.energy") }}</dt>
                        <dd>+{{ target.energyPenalty }}</dd>
                      </div>
                    </dl>
                    <div class="control-row">
                      <button class="secondary-button" @click="selectedDetailItemId = target.id">
                        {{ t("common.inspect") }}
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
          :title="t('forge.socket.detail')"
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
const { t } = useI18n();
const contentText = useContentText();
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

function itemName(type: string, definitionId: string, fallback: string): string {
  return contentText(`${type}.${definitionId}.name`, fallback);
}

function gemName(gem: EquipmentGemView | undefined): string {
  return gem ? itemName("gem", gem.definitionId, gem.label) : "";
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
  feedback.value = t("forge.socket.socketedSuccess");
}

async function unsocket(gemItemId: string) {
  if (!gemItemId) {
    return;
  }

  await updateSocketState({
    action: "unsocket",
    gemItemId,
  });
  feedback.value = t("forge.socket.unsocketedSuccess");
}

async function improveSelectedRingSockets() {
  if (!selectedRing.value) {
    return;
  }

  await updateSocketState({
    action: "improveSockets",
    ringItemId: selectedRing.value.id,
  });
  feedback.value = t("forge.socket.improvedSuccess");
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
  feedback.value = t("forge.socket.enchantedSuccess");
}

async function unenchantSelectedGem() {
  if (!selectedEnchantGem.value) {
    return;
  }

  await updateSocketState({
    action: "unenchant",
    gemItemId: selectedEnchantGem.value.id,
  });
  feedback.value = t("forge.socket.unenchantedSuccess");
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
    actionError.value = error_ instanceof Error ? error_.message : t("forge.socket.actionError");
  } finally {
    updating.value = false;
  }
}
</script>
