<template>
  <main class="shell forge-socket-page">
    <header class="view-header forge-view-header">
      <div class="view-title">
        <SectionBackLink
          to="/forge"
          :label="t('navigation.backToHub', { section: t('navigation.forge') })"
        />
        <div class="view-title-heading">
          <h1>{{ t("forge.socket.title") }}</h1>
          <ViewHelpButton
            :title="t('forge.socket.title')"
            :description="t('forge.socket.description')"
          />
        </div>
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
  Plus,
  X,
} from "@lucide/vue";
import type { EquipmentGemView, SocketState } from "~/utils/playerState";
const route = useRoute();
const { t } = useI18n();
const contentText = useContentText();
const feedback = ref("");
const actionError = ref("");
const updating = ref(false);
const selectedRingId = ref("");
const selectedGemId = ref("");
const selectedDetailItemId = ref("");
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
const socketDetailItem = computed(
  () =>
    [...(socketState.value?.rings ?? []), ...(socketState.value?.gems ?? [])].find(
      (item) => item.id === selectedDetailItemId.value,
    ) ?? selectedRing.value,
);
const ringIsFull = computed(() =>
  Boolean(
    selectedRing.value && selectedRing.value.gems.length >= (selectedRing.value.socketCount ?? 0),
  ),
);
const canSocketSelectedGem = computed(
  () => Boolean(selectedRing.value && selectedGemId.value) && !ringIsFull.value,
);
const socketIndexes = computed(() =>
  Array.from({ length: selectedRing.value?.socketCount ?? 0 }, (_, index) => index),
);

watchEffect(() => {
  if (socketState.value && !querySelectionApplied.value) {
    const ringId = route.query.ringId;
    const gemId = route.query.gemId;
    if (typeof ringId === "string" && socketState.value.rings.some((ring) => ring.id === ringId))
      selectedRingId.value = ringId;
    if (
      typeof gemId === "string" &&
      socketState.value.gems.some((gem) => gem.id === gemId && gem.socketedRingId === null)
    )
      selectedGemId.value = gemId;
    querySelectionApplied.value = true;
  }
  if (!selectedRingId.value && socketState.value?.rings[0])
    selectedRingId.value = socketState.value.rings[0].id;
  if (selectedGemId.value && !availableGems.value.some((gem) => gem.id === selectedGemId.value))
    selectedGemId.value = "";
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
async function updateSocketState(body: {
  action: string;
  ringItemId?: string;
  gemItemId?: string;
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
