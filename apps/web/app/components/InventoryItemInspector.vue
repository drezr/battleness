<template>
  <aside class="inventory-item-inspector" :aria-label="t('inventory.items.inspector')">
    <div v-if="!item" class="inventory-inspector-empty">
      <ScanSearch :size="34" aria-hidden="true" />
      <strong>{{ t("inventory.items.noneSelected") }}</strong>
      <p>{{ t("inventory.items.selectHint") }}</p>
    </div>

    <template v-else>
      <div class="inventory-inspector-hero">
        <ItemArtwork :definition-id="item.definitionId" :kind="item.type" :rarity="item.rarity" />
        <div>
          <span class="eyebrow">{{ t("inventory.items.selectedItem") }}</span>
          <h2>{{ localizedName }}</h2>
          <div class="control-row">
            <span :class="['pill', `rarity-${item.rarity}`]">{{ t(`rarity.${item.rarity}`) }}</span>
            <span :class="['pill', `element-${item.element}`]">{{
              t(`element.${item.element}`)
            }}</span>
            <span class="pill muted-pill">{{ t(`itemType.${item.type}`) }}</span>
          </div>
        </div>
      </div>

      <dl class="inventory-inspector-summary">
        <div>
          <dt>{{ t("common.level") }}</dt>
          <dd>{{ item.level }}</dd>
        </div>
        <div>
          <dt>{{ t("common.quality") }}</dt>
          <dd>{{ item.quality }}</dd>
        </div>
        <div v-if="item.socketCount !== null">
          <dt>{{ t("stats.sockets") }}</dt>
          <dd>{{ item.gems?.length ?? 0 }}/{{ item.socketCount }}</dd>
        </div>
        <div>
          <dt>{{ t("itemDetail.equipped") }}</dt>
          <dd>{{ t(item.equipped ? "common.yes" : "common.no") }}</dd>
        </div>
      </dl>

      <section class="inventory-inspector-section">
        <div class="inventory-inspector-section-heading">
          <h3>{{ t("progression.title") }}</h3>
          <strong>{{ t("inventory.items.experienceValue", { value: item.experience }) }}</strong>
        </div>
        <ExperienceProgress
          :progress="item.progression"
          :label="t('progression.itemExperience', { item: localizedName })"
        />
        <p>
          {{ t("inventory.items.qualityBonus") }}
          <strong class="positive">+{{ item.bonusPercent }}%</strong>
        </p>
      </section>

      <section v-if="primaryStats.length" class="inventory-inspector-section">
        <h3>{{ t("inventory.items.combatStats") }}</h3>
        <dl class="inventory-inspector-stats">
          <div v-for="stat in primaryStats" :key="stat.label">
            <dt>{{ stat.label }}</dt>
            <dd>{{ stat.value }}</dd>
          </div>
        </dl>
      </section>

      <section v-if="usageEntries.length" class="inventory-inspector-section">
        <h3>{{ t("itemDetail.usage") }}</h3>
        <dl class="inventory-inspector-usage">
          <div v-for="entry in usageEntries" :key="entry.label">
            <dt>{{ entry.label }}</dt>
            <dd>{{ entry.value }}</dd>
          </div>
        </dl>
      </section>

      <div class="inventory-inspector-actions">
        <NuxtLink
          v-for="(action, index) in actions"
          :key="action.to"
          :class="['button-link', { 'secondary-button': index > 0 }]"
          :to="action.to"
        >
          <component :is="action.icon" :size="17" aria-hidden="true" />
          {{ action.label }}
        </NuxtLink>
      </div>
    </template>
  </aside>
</template>

<script setup lang="ts">
import { Gem, Hammer, ScanSearch, Shield, Sparkles } from "@lucide/vue";
import type { InventoryItemView } from "~/utils/playerState";

const props = defineProps<{
  item: InventoryItemView | null;
}>();

const { t } = useI18n();
const contentText = useContentText();
const localizedName = computed(() => {
  const item = props.item;
  return item ? contentText(`${item.type}.${item.definitionId}.name`, item.label) : "";
});

const primaryStats = computed(() => {
  const item = props.item;
  if (!item) return [];
  const values = [
    { label: t("stats.damage"), value: item.damage },
    { label: t("stats.health"), value: item.health },
    { label: t("itemDetail.energyCost"), value: item.energyCost },
    { label: t("stats.cooldown"), value: item.cooldown },
    { label: t("itemDetail.energyPenalty"), value: item.energyPenalty },
    { label: t("itemDetail.cooldownPenalty"), value: item.cooldownPenalty },
  ];
  return values.filter(
    (entry): entry is { label: string; value: number } =>
      typeof entry.value === "number" && Number.isFinite(entry.value),
  );
});

const usageEntries = computed(() => {
  const item = props.item;
  if (!item) return [];
  const entries = [
    item.socketedRingLabel
      ? { label: t("itemDetail.socketedRing"), value: item.socketedRingLabel }
      : null,
    item.enchantedGemLabel
      ? { label: t("itemDetail.enchantedGem"), value: item.enchantedGemLabel }
      : null,
    item.enchantment
      ? {
          label: t("itemDetail.enchantment"),
          value: contentText(
            `${item.enchantment.type}.${item.enchantment.definitionId}.name`,
            item.enchantment.label,
          ),
        }
      : null,
  ];
  return entries.filter((entry): entry is { label: string; value: string } => entry !== null);
});

const actions = computed(() => {
  const item = props.item;
  if (!item) return [];
  const encodedId = encodeURIComponent(item.id);
  if (item.type === "ring") {
    return [
      { to: "/inventory/equipment", label: t("inventory.items.manageEquipment"), icon: Shield },
      {
        to: `/forge/socket?ringId=${encodedId}`,
        label: t("inventory.items.manageSockets"),
        icon: Gem,
      },
      { to: "/forge/quality", label: t("inventory.items.improveQuality"), icon: Sparkles },
    ];
  }
  if (item.type === "gem") {
    return [
      {
        to: `/forge/socket?gemId=${encodedId}`,
        label: t("inventory.items.manageSockets"),
        icon: Gem,
      },
      {
        to: `/forge/enchant?gemId=${encodedId}`,
        label: t("inventory.items.manageEnchantments"),
        icon: Sparkles,
      },
    ];
  }
  return [
    {
      to: `/forge/enchant?targetId=${encodedId}`,
      label: t("inventory.items.manageEnchantments"),
      icon: Sparkles,
    },
    { to: "/forge/quality", label: t("inventory.items.improveQuality"), icon: Hammer },
  ];
});
</script>
