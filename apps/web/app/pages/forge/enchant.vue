<template>
  <main class="shell forge-socket-page forge-enchant-page">
    <header class="view-header forge-view-header">
      <div class="view-title">
        <SectionBackLink
          to="/forge"
          :label="t('navigation.backToHub', { section: t('navigation.forge') })"
        />
        <div class="view-title-heading">
          <h1>{{ t("forge.enchant.title") }}</h1>
          <ViewHelpButton
            :title="t('forge.enchant.title')"
            :description="t('forge.enchant.description')"
          />
        </div>
      </div>
    </header>

    <p v-if="pending" class="panel">{{ t("forge.enchant.loading") }}</p>
    <p v-else-if="error" class="panel">{{ t("forge.enchant.loadError") }}</p>

    <template v-else-if="enchantState">
      <div class="forge-process-steps" :aria-label="t('forge.enchant.workflowLabel')">
        <span class="active"><strong>1</strong>{{ t("forge.enchant.chooseGem") }}</span>
        <ChevronRight :size="16" aria-hidden="true" />
        <span><strong>2</strong>{{ t("forge.enchant.chooseEnchantment") }}</span>
        <ChevronRight :size="16" aria-hidden="true" />
        <span><strong>3</strong>{{ t("forge.enchant.bind") }}</span>
      </div>

      <p v-if="feedback" class="feedback">{{ feedback }}</p>
      <p v-if="actionError" class="status-note">{{ actionError }}</p>

      <section class="detail-layout forge-detail-layout">
        <div class="stack forge-main-workspace">
          <section class="enchantment-lab">
            <div class="enchantment-lab-heading">
              <span class="enchantment-icon"><WandSparkles :size="23" aria-hidden="true" /></span>
              <div>
                <span class="eyebrow">{{ t("forge.enchant.station") }}</span>
                <h2>{{ t("forge.enchant.binding") }}</h2>
                <p>{{ t("forge.enchant.bindingDescription") }}</p>
              </div>
              <NuxtLink class="text-link" to="/forge/craft">
                {{ t("forge.enchant.craftTargets") }} <ArrowRight :size="16" />
              </NuxtLink>
            </div>

            <div class="enchantment-controls">
              <label>
                <span class="field-label">{{ t("itemType.gem") }}</span>
                <select v-model="selectedGemId">
                  <option value="">{{ t("forge.enchant.selectGem") }}</option>
                  <option v-for="gem in enchantState.gems" :key="gem.id" :value="gem.id">
                    {{ itemName("gem", gem.definitionId, gem.label)
                    }}{{
                      gem.enchantment
                        ? ` · ${itemName(gem.enchantment.type, gem.enchantment.definitionId, gem.enchantment.label)}`
                        : ""
                    }}
                  </option>
                </select>
              </label>

              <span class="enchantment-link-icon"><Link :size="19" aria-hidden="true" /></span>

              <label>
                <span class="field-label">{{ t("forge.enchant.spellOrMonster") }}</span>
                <select v-model="selectedTargetId">
                  <option value="">{{ t("forge.enchant.selectTarget") }}</option>
                  <option v-for="target in availableTargets" :key="target.id" :value="target.id">
                    {{ itemName(target.type, target.definitionId, target.label) }} ·
                    {{ t(`itemType.${target.type}`) }}
                  </option>
                </select>
              </label>

              <button
                v-if="selectedGem?.enchantment"
                class="secondary-button danger-action"
                :disabled="updating"
                type="button"
                @click="unenchantSelectedGem"
              >
                <Unlink :size="16" />{{ t("forge.enchant.remove") }}
              </button>
              <button :disabled="!canEnchant || updating" type="button" @click="requestEnchant">
                <WandSparkles :size="16" />{{
                  replacing ? t("forge.enchant.replace") : t("forge.enchant.action")
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

            <div v-if="enchantState.enchantmentTargets.length > 0" class="enchantment-target-strip">
              <button
                v-for="target in enchantState.enchantmentTargets"
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
                @click="selectTarget(target.id)"
              >
                <ItemArtwork :definition-id="target.definitionId" :kind="target.type" />
                <span>
                  <strong>{{ itemName(target.type, target.definitionId, target.label) }}</strong>
                  <small>{{
                    targetUnavailable(target)
                      ? t("forge.enchant.used")
                      : t(`itemType.${target.type}`)
                  }}</small>
                </span>
              </button>
            </div>
            <p v-else class="status-note">{{ t("forge.enchant.craftTargetFirst") }}</p>
          </section>
        </div>

        <ItemDetailPanel
          v-if="selectedDetailItemId"
          :item="detailItem"
          :title="t('forge.enchant.detail')"
          @clear="selectedDetailItemId = ''"
        />
      </section>
    </template>
  </main>
</template>

<script setup lang="ts">
import { ArrowRight, ChevronRight, Link, Unlink, WandSparkles } from "@lucide/vue";
import type { SocketEnchantmentTargetView, SocketState } from "~/utils/playerState";

const route = useRoute();
const { t } = useI18n();
const contentText = useContentText();
const feedback = ref("");
const actionError = ref("");
const updating = ref(false);
const selectedGemId = ref("");
const selectedTargetId = ref("");
const selectedDetailItemId = ref("");
const replacementConfirmation = ref("");
const querySelectionApplied = ref(false);

const {
  data: enchantState,
  error,
  pending,
  refresh,
} = await useFetch<SocketState>("/api/forge/socket", { key: "forge-enchant-state" });

const selectedGem = computed(
  () => enchantState.value?.gems.find((gem) => gem.id === selectedGemId.value) ?? null,
);
const selectedTarget = computed(
  () =>
    enchantState.value?.enchantmentTargets.find((target) => target.id === selectedTargetId.value) ??
    null,
);
const availableTargets = computed(() =>
  (enchantState.value?.enchantmentTargets ?? []).filter((target) => !targetUnavailable(target)),
);
const detailItem = computed(
  () =>
    [...(enchantState.value?.gems ?? []), ...(enchantState.value?.enchantmentTargets ?? [])].find(
      (item) => item.id === selectedDetailItemId.value,
    ) ?? null,
);
const canEnchant = computed(
  () =>
    Boolean(selectedGem.value && selectedTarget.value) &&
    !targetUnavailable(selectedTarget.value) &&
    selectedGem.value?.enchantment?.id !== selectedTarget.value?.id,
);
const replacing = computed(
  () =>
    Boolean(selectedGem.value?.enchantment && selectedTarget.value) &&
    selectedGem.value?.enchantment?.id !== selectedTarget.value?.id,
);

watchEffect(() => {
  if (enchantState.value && !querySelectionApplied.value) {
    const gemId = route.query.gemId;
    const targetId = route.query.targetId;
    if (typeof gemId === "string" && enchantState.value.gems.some((gem) => gem.id === gemId))
      selectedGemId.value = gemId;
    if (typeof targetId === "string") {
      const target = enchantState.value.enchantmentTargets.find((item) => item.id === targetId);
      if (target) {
        if (target.enchantedGemId) selectedGemId.value = target.enchantedGemId;
        selectedTargetId.value = target.id;
        selectedDetailItemId.value = target.id;
      }
    }
    querySelectionApplied.value = true;
  }
  if (!selectedGemId.value && enchantState.value?.gems[0])
    selectedGemId.value = enchantState.value.gems[0].id;
  if (
    selectedTargetId.value &&
    !availableTargets.value.some((target) => target.id === selectedTargetId.value)
  )
    selectedTargetId.value = "";
});

watch([selectedGemId, selectedTargetId], () => {
  replacementConfirmation.value = "";
});

function itemName(type: string, definitionId: string, fallback: string): string {
  return contentText(`${type}.${definitionId}.name`, fallback);
}
function targetUnavailable(target: SocketEnchantmentTargetView | null): boolean {
  return Boolean(target?.enchantedGemId && target.enchantedGemId !== selectedGem.value?.id);
}
function selectTarget(targetId: string) {
  selectedTargetId.value = targetId;
  selectedDetailItemId.value = targetId;
}
async function enchantSelectedGem() {
  if (!selectedGem.value || !selectedTarget.value) return;
  const wasReplacement = replacing.value;
  const success = await updateEnchantState({
    action: "enchant",
    gemItemId: selectedGem.value.id,
    targetItemId: selectedTarget.value.id,
    targetType: selectedTarget.value.type,
  });
  if (success) {
    selectedTargetId.value = "";
    replacementConfirmation.value = "";
    feedback.value = t(wasReplacement ? "forge.enchant.replacedSuccess" : "forge.enchant.success");
  }
}
function requestEnchant() {
  if (!selectedGem.value || !selectedTarget.value) return;
  if (!replacing.value) {
    void enchantSelectedGem();
    return;
  }
  replacementConfirmation.value = t("forge.enchant.replaceConfirmation", {
    current: itemName(
      selectedGem.value.enchantment?.type ?? "spell",
      selectedGem.value.enchantment?.definitionId ?? "",
      selectedGem.value.enchantment?.label ?? "",
    ),
    next: itemName(
      selectedTarget.value.type,
      selectedTarget.value.definitionId,
      selectedTarget.value.label,
    ),
  });
}
async function unenchantSelectedGem() {
  if (!selectedGem.value) return;
  if (await updateEnchantState({ action: "unenchant", gemItemId: selectedGem.value.id }))
    feedback.value = t("forge.enchant.removedSuccess");
}
async function updateEnchantState(body: {
  action: "enchant" | "unenchant";
  gemItemId: string;
  targetItemId?: string;
  targetType?: SocketEnchantmentTargetView["type"];
}): Promise<boolean> {
  feedback.value = "";
  actionError.value = "";
  updating.value = true;
  try {
    enchantState.value = await $fetch<SocketState>("/api/forge/socket", { method: "POST", body });
    await refresh();
    return true;
  } catch (error_) {
    actionError.value = error_ instanceof Error ? error_.message : t("forge.enchant.actionError");
    return false;
  } finally {
    updating.value = false;
  }
}
</script>
