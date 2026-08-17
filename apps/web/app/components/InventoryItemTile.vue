<template>
  <button
    type="button"
    :class="[
      'inventory-item-tile',
      `rarity-border-${item.rarity}`,
      `inventory-item-${item.type}`,
      { selected },
    ]"
    :aria-pressed="selected"
    :aria-label="accessibleLabel"
    @click="emit('select')"
  >
    <span class="inventory-item-visual">
      <ItemArtwork :definition-id="item.definitionId" :kind="item.type" :rarity="item.rarity" />
      <span :class="['inventory-element-mark', `element-${item.element}`]" aria-hidden="true">
        <Flame v-if="item.element === 'fire'" :size="15" />
        <Snowflake v-else-if="item.element === 'ice'" :size="15" />
        <Zap v-else :size="15" />
      </span>
      <span class="inventory-level-badge">{{
        t("inventory.items.levelShort", { level: item.level })
      }}</span>
      <span v-if="usageLabel" class="inventory-usage-badge">{{ usageLabel }}</span>
    </span>

    <span class="inventory-item-tile-copy">
      <strong>{{ localizedName }}</strong>
      <span class="inventory-item-identity">
        {{ t(`rarity.${item.rarity}`) }} · {{ t(`itemType.${item.type}`) }}
      </span>
    </span>

    <span v-if="tileStats.length" class="inventory-tile-stats">
      <span v-for="stat in tileStats" :key="stat.key">
        <component :is="stat.icon" :size="15" aria-hidden="true" />
        <small>{{ stat.shortLabel }}</small>
        <strong>{{ stat.value }}</strong>
      </span>
    </span>
  </button>
</template>

<script setup lang="ts">
import { Flame, HeartPulse, Snowflake, Sword, Timer, Zap } from "@lucide/vue";
import type { InventoryItemView } from "~/utils/playerState";

const props = defineProps<{
  item: InventoryItemView;
  selected: boolean;
}>();

const emit = defineEmits<{
  select: [];
}>();

const { t } = useI18n();
const contentText = useContentText();
const localizedName = computed(() =>
  contentText(`${props.item.type}.${props.item.definitionId}.name`, props.item.label),
);

const usageLabel = computed(() => {
  if (props.item.equipped) return t("inventory.items.equipped");
  if (props.item.socketedRingId) return t("inventory.items.socketed");
  if (props.item.enchantedGemId) return t("inventory.items.enchanted");
  return "";
});

const tileStats = computed(() => {
  const item = props.item;
  if (item.type === "ring") {
    return [
      stat("damage", Sword, t("stats.damageShort"), t("stats.damage"), item.damage),
      stat("energyCost", Zap, t("stats.energyShort"), t("itemDetail.energyCost"), item.energyCost),
      stat("cooldown", Timer, t("stats.cooldownShort"), t("stats.cooldown"), item.cooldown),
    ].filter(hasValue);
  }
  if (item.type === "gem") {
    return [
      stat(
        "addedDamage",
        Sword,
        t("stats.damageShort"),
        t("inventory.items.addedDamage"),
        item.damage,
      ),
    ].filter(hasValue);
  }
  if (item.type === "monster") {
    return [
      stat("damage", Sword, t("stats.damageShort"), t("stats.damage"), item.damage),
      stat("health", HeartPulse, t("stats.healthShort"), t("stats.health"), item.health),
      stat("cooldown", Timer, t("stats.cooldownShort"), t("stats.cooldown"), item.cooldown),
    ].filter(hasValue);
  }
  return [];
});

const statSummary = computed(() =>
  tileStats.value.map((entry) => `${entry.label} ${entry.value}`).join(", "),
);

const accessibleLabel = computed(() =>
  t("inventory.items.tileLabel", {
    item: localizedName.value,
    type: t(`itemType.${props.item.type}`),
    rarity: t(`rarity.${props.item.rarity}`),
    element: t(`element.${props.item.element}`),
    level: props.item.level,
    stats: statSummary.value || t("inventory.items.noTileStats"),
    usage: usageLabel.value || t("inventory.items.notInUse"),
  }),
);

function stat(
  key: string,
  icon: typeof Sword,
  shortLabel: string,
  label: string,
  value: number | undefined,
) {
  return { key, icon, shortLabel, label, value };
}

function hasValue(entry: { value: number | undefined }): entry is typeof entry & { value: number } {
  return typeof entry.value === "number" && Number.isFinite(entry.value);
}
</script>
