<template>
  <main class="shell forge-socket-page">
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

    <header class="view-header forge-view-header">
      <div class="view-title">
        <span class="eyebrow">{{ t("forge.section") }}</span>
        <h1>{{ t("forge.socket.title") }}</h1>
        <p class="muted">{{ t("forge.socket.description") }}</p>
      </div>
      <span v-if="socketState" class="forge-credit-balance"
        ><Coins :size="17" aria-hidden="true" />{{
          t("common.creditCount", { count: socketState.player.credits })
        }}</span
      >
    </header>

    <p v-if="pending" class="panel">{{ t("forge.socket.loading") }}</p>
    <p v-else-if="error" class="panel">{{ t("forge.socket.loadError") }}</p>

    <template v-else-if="socketState">
      <div class="forge-process-steps" :aria-label="t('forge.socket.workflowLabel')">
        <span class="active"><strong>1</strong>{{ t("forge.socket.chooseRing") }}</span>
        <ChevronRight :size="16" aria-hidden="true" />
        <span><strong>2</strong>{{ t("forge.socket.composeSockets") }}</span>
        <ChevronRight :size="16" aria-hidden="true" />
        <span><strong>3</strong>{{ t("forge.socket.bindEnchantment") }}</span>
      </div>

      <p v-if="feedback" class="feedback">{{ feedback }}</p>
      <p v-if="actionError" class="status-note">{{ actionError }}</p>

      <section class="detail-layout forge-detail-layout">
        <div class="stack forge-main-workspace">
          <section class="socket-composer">
            <div class="socket-ring-station">
              <div class="section-heading-row">
                <div>
                  <span class="eyebrow">{{ t("forge.socket.ringStation") }}</span>
                  <h2>{{ t("forge.socket.chooseRing") }}</h2>
                </div>
                <NuxtLink class="text-link" to="/forge/craft"
                  >{{ t("forge.craftItems") }} <ArrowRight :size="16"
                /></NuxtLink>
              </div>
              <label class="forge-select-field">
                <span class="field-label">{{ t("forge.socket.ownedRing") }}</span>
                <select v-model="selectedRingId">
                  <option value="">{{ t("forge.socket.selectRing") }}</option>
                  <option v-for="ring in socketState.rings" :key="ring.id" :value="ring.id">
                    {{ itemName("ring", ring.definitionId, ring.label) }} ·
                    {{
                      t("forge.socket.socketCount", {
                        used: ring.gems.length,
                        total: ring.socketCount ?? 0,
                      })
                    }}
                  </option>
                </select>
              </label>

              <div v-if="!selectedRing" class="forge-empty-state">
                <CircleDashed :size="26" />
                <p>{{ t("forge.socket.craftRingFirst") }}</p>
              </div>
              <template v-else>
                <div class="socket-selected-ring">
                  <div :class="['socket-ring-art', `rarity-border-${selectedRing.rarity}`]">
                    <ItemArtwork :definition-id="selectedRing.definitionId" kind="ring" />
                  </div>
                  <div class="socket-ring-copy">
                    <div class="card-heading">
                      <div>
                        <span class="eyebrow">{{ t("forge.socket.selectedRing") }}</span>
                        <h3>
                          {{ itemName("ring", selectedRing.definitionId, selectedRing.label) }}
                        </h3>
                      </div>
                      <span :class="['pill', `element-${selectedRing.element}`]">{{
                        t(`element.${selectedRing.element}`)
                      }}</span>
                    </div>
                    <RingStatGrid :ring="selectedRing" />
                    <button
                      class="text-link"
                      type="button"
                      @click="selectedDetailItemId = selectedRing.id"
                    >
                      <Eye :size="15" />{{ t("common.inspect") }}
                    </button>
                  </div>
                </div>

                <div class="socket-capacity-row">
                  <div>
                    <span class="eyebrow">{{ t("forge.socket.capacity") }}</span>
                    <strong
                      >{{ selectedRing.socketCount ?? 0 }} /
                      {{ socketState.maxRingSockets }}</strong
                    >
                  </div>
                  <div class="socket-capacity-track" aria-hidden="true">
                    <span
                      v-for="slot in socketState.maxRingSockets"
                      :key="slot"
                      :class="{ active: slot <= (selectedRing.socketCount ?? 0) }"
                    />
                  </div>
                  <div class="socket-capacity-action">
                    <small v-if="selectedRing.socketImprovementCost !== null">{{
                      t("forge.socket.nextCapacity", {
                        count: selectedRing.nextSocketCount,
                        cost: selectedRing.socketImprovementCost,
                      })
                    }}</small>
                    <small v-else>{{ t("forge.socket.maximumCapacity") }}</small>
                    <button
                      class="secondary-button"
                      :disabled="!selectedRing.canImproveSockets || updating"
                      type="button"
                      @click="improveSelectedRingSockets"
                    >
                      <Plus :size="16" />{{ t("forge.socket.improve") }}
                    </button>
                  </div>
                </div>

                <div class="socket-slot-grid">
                  <article
                    v-for="socketIndex in socketIndexes"
                    :key="socketIndex"
                    :class="[
                      'socket-composer-slot',
                      socketGem(socketIndex)
                        ? `rarity-border-${socketGem(socketIndex)?.rarity}`
                        : 'empty',
                    ]"
                  >
                    <span class="socket-slot-index">{{ socketIndex + 1 }}</span>
                    <template v-if="socketGem(socketIndex)">
                      <ItemArtwork
                        :definition-id="socketGem(socketIndex)?.definitionId ?? ''"
                        kind="gem"
                      />
                      <div>
                        <strong>{{ gemName(socketGem(socketIndex)) }}</strong
                        ><small>{{
                          t("forge.socket.gemStats", {
                            damage: socketGem(socketIndex)?.damage,
                            energy: socketGem(socketIndex)?.energyPenalty,
                            cooldown: socketGem(socketIndex)?.cooldownPenalty,
                          })
                        }}</small>
                      </div>
                      <button
                        class="icon-button danger-action"
                        :disabled="updating"
                        type="button"
                        :title="t('forge.socket.unsocket')"
                        :aria-label="t('forge.socket.unsocket')"
                        @click="unsocket(socketGem(socketIndex)?.id ?? '')"
                      >
                        <X :size="17" />
                      </button>
                    </template>
                    <template v-else>
                      <CircleDashed :size="24" aria-hidden="true" />
                      <div>
                        <strong>{{ t("forge.socket.emptySocket") }}</strong
                        ><small>{{ t("forge.socket.availableSlot") }}</small>
                      </div>
                    </template>
                  </article>
                </div>
              </template>
            </div>

            <aside class="socket-gem-vault">
              <div class="section-heading-row">
                <div>
                  <span class="eyebrow">{{ t("forge.socket.gemVault") }}</span>
                  <h2>{{ t("forge.socket.availableGems") }}</h2>
                </div>
                <span class="pill muted-pill">{{ availableGems.length }}</span>
              </div>
              <p v-if="socketState.gems.length === 0" class="muted">
                {{ t("forge.socket.craftGemsFirst") }}
              </p>
              <p v-else-if="availableGems.length === 0" class="status-note">
                {{ t("forge.socket.allSocketed") }}
              </p>
              <div v-else class="socket-vault-list">
                <button
                  v-for="gem in availableGems"
                  :key="gem.id"
                  :class="[`rarity-border-${gem.rarity}`, { selected: selectedGemId === gem.id }]"
                  type="button"
                  @click="selectedGemId = gem.id"
                >
                  <ItemArtwork :definition-id="gem.definitionId" kind="gem" />
                  <span
                    ><strong>{{ itemName("gem", gem.definitionId, gem.label) }}</strong
                    ><small>{{
                      t("forge.socket.gemStats", {
                        damage: gem.damage,
                        energy: gem.energyPenalty,
                        cooldown: gem.cooldownPenalty,
                      })
                    }}</small></span
                  >
                  <Check v-if="selectedGemId === gem.id" :size="17" aria-hidden="true" />
                </button>
              </div>
              <p v-if="selectedRing && ringIsFull" class="status-note">
                {{ t("forge.socket.ringFull") }}
              </p>
              <button
                class="socket-primary-action"
                :disabled="!canSocketSelectedGem || updating"
                type="button"
                @click="socketSelectedGem"
              >
                <Gem :size="17" />{{ t("forge.socket.action") }}
              </button>
            </aside>
          </section>

          <section class="enchantment-lab">
            <div class="enchantment-lab-heading">
              <span class="enchantment-icon"><WandSparkles :size="23" aria-hidden="true" /></span>
              <div>
                <span class="eyebrow">{{ t("forge.socket.enchantmentLab") }}</span>
                <h2>{{ t("forge.socket.enchantment") }}</h2>
                <p>{{ t("forge.socket.enchantmentDescription") }}</p>
              </div>
              <NuxtLink class="text-link" to="/forge/craft"
                >{{ t("forge.socket.craftEnchantments") }} <ArrowRight :size="16"
              /></NuxtLink>
            </div>

            <div class="enchantment-controls">
              <label
                ><span class="field-label">{{ t("itemType.gem") }}</span
                ><select v-model="selectedEnchantGemId">
                  <option value="">{{ t("forge.socket.selectGem") }}</option>
                  <option v-for="gem in socketState.gems" :key="gem.id" :value="gem.id">
                    {{ itemName("gem", gem.definitionId, gem.label)
                    }}{{
                      gem.enchantment
                        ? ` · ${itemName(gem.enchantment.type, gem.enchantment.definitionId, gem.enchantment.label)}`
                        : ""
                    }}
                  </option>
                </select></label
              >
              <span class="enchantment-link-icon"><Link :size="19" aria-hidden="true" /></span>
              <label
                ><span class="field-label">{{ t("forge.socket.spellOrMonster") }}</span
                ><select v-model="selectedTargetId">
                  <option value="">{{ t("forge.socket.selectTarget") }}</option>
                  <option
                    v-for="target in availableEnchantmentTargets"
                    :key="target.id"
                    :value="target.id"
                  >
                    {{ itemName(target.type, target.definitionId, target.label) }} ·
                    {{ t(`itemType.${target.type}`) }}
                  </option>
                </select></label
              >
              <button
                v-if="selectedEnchantGem?.enchantment"
                class="secondary-button danger-action"
                :disabled="updating"
                type="button"
                @click="unenchantSelectedGem"
              >
                <Unlink :size="16" />{{ t("forge.socket.remove") }}
              </button>
              <button
                :disabled="!canEnchantSelectedGem || updating"
                type="button"
                @click="requestEnchantSelectedGem"
              >
                <WandSparkles :size="16" />{{
                  replacingEnchantment ? t("forge.socket.replace") : t("forge.socket.enchant")
                }}
              </button>
            </div>

            <div v-if="replacementConfirmation" class="status-note">
              <p>{{ replacementConfirmation }}</p>
              <div class="control-row">
                <button type="button" :disabled="updating" @click="enchantSelectedGem">
                  {{ t("common.confirm") }}
                </button>
                <button
                  class="secondary-button"
                  type="button"
                  :disabled="updating"
                  @click="replacementConfirmation = ''"
                >
                  {{ t("common.cancel") }}
                </button>
              </div>
            </div>

            <div v-if="socketState.enchantmentTargets.length > 0" class="enchantment-target-strip">
              <button
                v-for="target in socketState.enchantmentTargets"
                :key="target.id"
                :class="[
                  `rarity-border-${target.rarity}`,
                  {
                    unavailable: targetUnavailable(target),
                    selected: selectedTargetId === target.id,
                  },
                ]"
                type="button"
                :disabled="targetUnavailable(target)"
                @click="
                  selectedTargetId = target.id;
                  selectedDetailItemId = target.id;
                "
              >
                <ItemArtwork :definition-id="target.definitionId" :kind="target.type" />
                <span
                  ><strong>{{ itemName(target.type, target.definitionId, target.label) }}</strong
                  ><small>{{
                    targetUnavailable(target)
                      ? t("forge.socket.used")
                      : t(`itemType.${target.type}`)
                  }}</small></span
                >
              </button>
            </div>
            <p v-else class="status-note">{{ t("forge.socket.craftTargetFirst") }}</p>
          </section>
        </div>

        <ItemDetailPanel
          v-if="selectedDetailItemId"
          :item="socketDetailItem"
          :title="t('forge.socket.detail')"
          @clear="selectedDetailItemId = ''"
        />
      </section>
    </template>
  </main>
</template>

<script setup lang="ts">
import {
  ArrowRight,
  Check,
  ChevronRight,
  CircleDashed,
  Coins,
  Eye,
  Gem,
  Link,
  Plus,
  Unlink,
  WandSparkles,
  X,
} from "@lucide/vue";
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
const replacementConfirmation = ref("");
const querySelectionApplied = ref(false);
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
const socketDetailItem = computed(
  () =>
    [
      ...(socketState.value?.rings ?? []),
      ...(socketState.value?.gems ?? []),
      ...(socketState.value?.enchantmentTargets ?? []),
    ].find((item) => item.id === selectedDetailItemId.value) ?? selectedRing.value,
);
const availableEnchantmentTargets = computed(() =>
  (socketState.value?.enchantmentTargets ?? []).filter((target) => !targetUnavailable(target)),
);
const ringIsFull = computed(() =>
  Boolean(
    selectedRing.value && selectedRing.value.gems.length >= (selectedRing.value.socketCount ?? 0),
  ),
);
const canSocketSelectedGem = computed(
  () => Boolean(selectedRing.value && selectedGemId.value) && !ringIsFull.value,
);
const canEnchantSelectedGem = computed(
  () =>
    Boolean(selectedEnchantGem.value && selectedTarget.value) &&
    !targetUnavailable(selectedTarget.value) &&
    selectedEnchantGem.value?.enchantment?.id !== selectedTarget.value?.id,
);
const replacingEnchantment = computed(
  () =>
    Boolean(selectedEnchantGem.value?.enchantment && selectedTarget.value) &&
    selectedEnchantGem.value?.enchantment?.id !== selectedTarget.value?.id,
);
const socketIndexes = computed(() =>
  Array.from({ length: selectedRing.value?.socketCount ?? 0 }, (_, index) => index),
);

watchEffect(() => {
  if (socketState.value && !querySelectionApplied.value) {
    const ringId = route.query.ringId;
    const gemId = route.query.gemId;
    const targetId = route.query.targetId;
    if (typeof ringId === "string" && socketState.value.rings.some((ring) => ring.id === ringId))
      selectedRingId.value = ringId;
    if (typeof gemId === "string" && socketState.value.gems.some((gem) => gem.id === gemId))
      selectedEnchantGemId.value = gemId;
    if (typeof targetId === "string") {
      const target = socketState.value.enchantmentTargets.find((item) => item.id === targetId);
      if (target) {
        if (target.enchantedGemId) selectedEnchantGemId.value = target.enchantedGemId;
        selectedTargetId.value = target.id;
      }
    }
    querySelectionApplied.value = true;
  }
  if (!selectedRingId.value && socketState.value?.rings[0])
    selectedRingId.value = socketState.value.rings[0].id;
  if (selectedGemId.value && !availableGems.value.some((gem) => gem.id === selectedGemId.value))
    selectedGemId.value = "";
  if (!selectedEnchantGemId.value && socketState.value?.gems[0])
    selectedEnchantGemId.value = socketState.value.gems[0].id;
  if (
    selectedTargetId.value &&
    !availableEnchantmentTargets.value.some((target) => target.id === selectedTargetId.value)
  )
    selectedTargetId.value = "";
});

watch([selectedEnchantGemId, selectedTargetId], () => {
  replacementConfirmation.value = "";
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
function targetUnavailable(target: SocketEnchantmentTargetView | null): boolean {
  return Boolean(target?.enchantedGemId && target.enchantedGemId !== selectedEnchantGem.value?.id);
}

async function socketSelectedGem() {
  if (!selectedRing.value || !selectedGemId.value) return;
  const success = await updateSocketState({
    action: "socket",
    ringItemId: selectedRing.value.id,
    gemItemId: selectedGemId.value,
  });
  if (success) {
    selectedGemId.value = "";
    feedback.value = t("forge.socket.socketedSuccess");
  }
}
async function unsocket(gemItemId: string) {
  if (!gemItemId) return;
  if (await updateSocketState({ action: "unsocket", gemItemId }))
    feedback.value = t("forge.socket.unsocketedSuccess");
}
async function improveSelectedRingSockets() {
  if (!selectedRing.value) return;
  if (await updateSocketState({ action: "improveSockets", ringItemId: selectedRing.value.id }))
    feedback.value = t("forge.socket.improvedSuccess");
}
async function enchantSelectedGem() {
  if (!selectedEnchantGem.value || !selectedTarget.value) return;
  const wasReplacement = replacingEnchantment.value;
  const success = await updateSocketState({
    action: "enchant",
    gemItemId: selectedEnchantGem.value.id,
    targetItemId: selectedTarget.value.id,
    targetType: selectedTarget.value.type,
  });
  if (success) {
    selectedTargetId.value = "";
    replacementConfirmation.value = "";
    feedback.value = t(
      wasReplacement ? "forge.socket.replacedSuccess" : "forge.socket.enchantedSuccess",
    );
  }
}
function requestEnchantSelectedGem() {
  if (!selectedEnchantGem.value || !selectedTarget.value) return;
  if (!replacingEnchantment.value) {
    void enchantSelectedGem();
    return;
  }
  replacementConfirmation.value = t("forge.socket.replaceConfirmation", {
    current: itemName(
      selectedEnchantGem.value.enchantment?.type ?? "spell",
      selectedEnchantGem.value.enchantment?.definitionId ?? "",
      selectedEnchantGem.value.enchantment?.label ?? "",
    ),
    next: itemName(
      selectedTarget.value.type,
      selectedTarget.value.definitionId,
      selectedTarget.value.label,
    ),
  });
}
async function unenchantSelectedGem() {
  if (!selectedEnchantGem.value) return;
  if (await updateSocketState({ action: "unenchant", gemItemId: selectedEnchantGem.value.id }))
    feedback.value = t("forge.socket.unenchantedSuccess");
}
async function updateSocketState(body: {
  action: string;
  ringItemId?: string;
  gemItemId?: string;
  targetItemId?: string;
  targetType?: SocketEnchantmentTargetView["type"];
}): Promise<boolean> {
  feedback.value = "";
  actionError.value = "";
  updating.value = true;
  try {
    socketState.value = await $fetch<SocketState>("/api/forge/socket", { method: "POST", body });
    await refresh();
    return true;
  } catch (error_) {
    actionError.value = error_ instanceof Error ? error_.message : t("forge.socket.actionError");
    return false;
  } finally {
    updating.value = false;
  }
}
</script>
