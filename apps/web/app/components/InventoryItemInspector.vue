<template>
  <div
    ref="inspectorElement"
    :class="['inventory-item-inspector', { compact }]"
    role="region"
    :aria-label="t('inventory.items.inspector')"
  >
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

      <section v-if="item.type === 'ring'" class="inventory-inspector-section">
        <h3>{{ t("inventory.items.resolvedStats") }}</h3>
        <div class="inventory-stat-comparison" role="table">
          <div class="inventory-stat-comparison-head" role="row">
            <span role="columnheader">{{ t("inventory.items.stat") }}</span>
            <span role="columnheader">{{ t("inventory.items.base") }}</span>
            <span role="columnheader">{{ t("inventory.items.ringOnly") }}</span>
            <span role="columnheader">{{ t("inventory.items.final") }}</span>
          </div>
          <div v-for="stat in ringStats" :key="stat.label" role="row">
            <span role="rowheader">{{ stat.label }}</span>
            <span role="cell">{{ stat.base }}</span>
            <span role="cell">{{ stat.ring }}</span>
            <strong role="cell">{{ stat.final }}</strong>
          </div>
        </div>
        <dl class="inventory-damage-breakdown">
          <div v-for="part in damageBreakdown" :key="part.label">
            <dt>{{ part.label }}</dt>
            <dd>{{ part.value }}</dd>
          </div>
        </dl>
      </section>

      <section v-else-if="primaryStats.length" class="inventory-inspector-section">
        <h3>{{ t("inventory.items.combatStats") }}</h3>
        <dl class="inventory-inspector-stats">
          <div v-for="stat in primaryStats" :key="stat.label">
            <dt>{{ stat.label }}</dt>
            <dd>{{ stat.value }}</dd>
          </div>
        </dl>
      </section>

      <section v-if="item.type === 'ring'" class="inventory-inspector-section">
        <h3>{{ t("inventory.items.composition") }}</h3>
        <ul class="inventory-composition-tree">
          <li v-for="socket in ringSockets" :key="socket.index" class="inventory-socket-branch">
            <span class="inventory-tree-connector" aria-hidden="true"></span>
            <button
              v-if="socket.gem"
              type="button"
              class="inventory-related-item"
              :aria-label="relatedItemLabel(socket.gem)"
              @click="selectRelated(socket.gem.id)"
            >
              <ItemArtwork
                :definition-id="socket.gem.definitionId"
                kind="gem"
                :rarity="socket.gem.rarity"
              />
              <span>
                <small>{{ t("inventory.items.socketNumber", { number: socket.index + 1 }) }}</small>
                <strong>{{ itemName("gem", socket.gem.definitionId, socket.gem.label) }}</strong>
                <small>{{
                  t("inventory.items.gemSummary", {
                    damage: socket.gem.damage,
                    speed: socket.gem.speed,
                  })
                }}</small>
              </span>
              <ChevronRight :size="17" aria-hidden="true" />
            </button>
            <div v-else class="inventory-empty-socket">
              <CircleDashed :size="22" aria-hidden="true" />
              <span
                ><small>{{ t("inventory.items.socketNumber", { number: socket.index + 1 }) }}</small
                ><strong>{{ t("inventory.items.emptySocket") }}</strong></span
              >
            </div>

            <button
              v-if="socket.gem?.enchantment"
              type="button"
              class="inventory-related-item inventory-enchantment-branch"
              :aria-label="relatedItemLabel(socket.gem.enchantment)"
              @click="selectRelated(socket.gem.enchantment.id)"
            >
              <ItemArtwork
                :definition-id="socket.gem.enchantment.definitionId"
                :kind="socket.gem.enchantment.type"
                :rarity="socket.gem.enchantment.rarity"
              />
              <span
                ><small>{{ t(`itemType.${socket.gem.enchantment.type}`) }}</small
                ><strong>{{
                  itemName(
                    socket.gem.enchantment.type,
                    socket.gem.enchantment.definitionId,
                    socket.gem.enchantment.label,
                  )
                }}</strong></span
              >
              <ChevronRight :size="17" aria-hidden="true" />
            </button>
          </li>
        </ul>
      </section>

      <section v-if="item.type === 'gem'" class="inventory-inspector-section">
        <h3>{{ t("inventory.items.enchantmentContents") }}</h3>
        <button
          v-if="item.enchantment"
          type="button"
          class="inventory-related-item"
          :aria-label="relatedItemLabel(item.enchantment)"
          @click="selectRelated(item.enchantment.id)"
        >
          <ItemArtwork
            :definition-id="item.enchantment.definitionId"
            :kind="item.enchantment.type"
            :rarity="item.enchantment.rarity"
          />
          <span
            ><small>{{ t(`itemType.${item.enchantment.type}`) }}</small
            ><strong>{{
              itemName(item.enchantment.type, item.enchantment.definitionId, item.enchantment.label)
            }}</strong></span
          >
          <ChevronRight :size="17" aria-hidden="true" />
        </button>
        <p v-else class="inventory-relationship-empty">{{ t("inventory.items.noEnchantment") }}</p>
      </section>

      <section v-if="parentReference" class="inventory-inspector-section">
        <h3>{{ parentHeading }}</h3>
        <button
          type="button"
          class="inventory-related-item"
          :aria-label="relatedItemLabel(parentReference)"
          @click="selectRelated(parentReference.id)"
        >
          <ItemArtwork
            :definition-id="parentReference.definitionId"
            :kind="parentReference.type"
            :rarity="parentReference.rarity"
          />
          <span>
            <small>{{ t(`itemType.${parentReference.type}`) }}</small>
            <strong>{{
              itemName(parentReference.type, parentReference.definitionId, parentReference.label)
            }}</strong>
            <small
              v-if="
                item.type === 'gem' && item.socketIndex !== null && item.socketIndex !== undefined
              "
              >{{ t("inventory.items.socketNumber", { number: item.socketIndex + 1 }) }}</small
            >
          </span>
          <ChevronRight :size="17" aria-hidden="true" />
        </button>
      </section>

      <div class="inventory-inspector-actions">
        <NuxtLink
          v-for="(action, index) in actions"
          :key="action.to"
          :class="['button-link', { 'secondary-button': index > 0 }]"
          :to="action.to"
        >
          <component :is="action.icon" :size="17" aria-hidden="true" />{{ action.label }}
        </NuxtLink>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { ChevronRight, CircleDashed, Gem, Hammer, ScanSearch, Shield, Sparkles } from "@lucide/vue";
import type {
  EquipmentGemView,
  InventoryItemReferenceView,
  InventoryItemView,
} from "~/utils/playerState";

const props = withDefaults(defineProps<{ item: InventoryItemView | null; compact?: boolean }>(), {
  compact: false,
});
const emit = defineEmits<{ selectItem: [itemId: string] }>();
const { t } = useI18n();
const contentText = useContentText();
const inspectorElement = ref<HTMLElement | null>(null);
const localizedName = computed(() =>
  props.item ? itemName(props.item.type, props.item.definitionId, props.item.label) : "",
);

watch(
  () => props.item?.id,
  async () => {
    await nextTick();
    if (!props.compact && inspectorElement.value) inspectorElement.value.scrollTop = 0;
  },
);

const ringStats = computed(() => {
  const item = props.item;
  if (!item || item.type !== "ring") return [];
  return [
    {
      label: t("stats.damage"),
      base: item.baseDamage ?? 0,
      ring: item.ringDamage ?? 0,
      final: item.damage ?? 0,
    },
    {
      label: t("itemDetail.energyCost"),
      base: item.baseEnergyCost ?? 0,
      ring: item.baseEnergyCost ?? 0,
      final: item.energyCost ?? 0,
    },
    {
      label: t("stats.cooldown"),
      base: item.baseCooldown ?? 0,
      ring: item.baseCooldown ?? 0,
      final: item.cooldown ?? 0,
    },
    {
      label: t("stats.speed"),
      base: item.baseSpeed ?? 0,
      ring: item.baseSpeed ?? 0,
      final: item.speed ?? 0,
    },
  ];
});

const damageBreakdown = computed(() => {
  const item = props.item;
  if (!item || item.type !== "ring") return [];
  return [
    { label: t("itemDetail.ringDamage"), value: item.ringDamage ?? 0 },
    { label: t("itemDetail.gemDamage"), value: item.gemDamage ?? 0 },
    { label: t("itemDetail.monsterDamage"), value: item.monsterDamage ?? 0 },
    { label: t("itemDetail.spellDamage"), value: item.spellDamage ?? 0 },
  ];
});

const primaryStats = computed(() => {
  const item = props.item;
  if (!item) return [];
  return [
    { label: t("stats.damage"), value: item.damage },
    { label: t("stats.health"), value: item.health },
    { label: t("itemDetail.energyPenalty"), value: item.energyPenalty },
    { label: t("itemDetail.cooldownPenalty"), value: item.cooldownPenalty },
    { label: t("stats.cooldown"), value: item.cooldown },
    { label: t("stats.speed"), value: item.speed },
  ].filter(
    (entry): entry is { label: string; value: number } =>
      typeof entry.value === "number" && Number.isFinite(entry.value),
  );
});

const ringSockets = computed(() => {
  const item = props.item;
  if (!item || item.type !== "ring") return [];
  return Array.from({ length: item.socketCount ?? 0 }, (_, index) => ({
    index,
    gem: item.gems?.find((gem) => gem.socketIndex === index) ?? null,
  }));
});

const parentReference = computed<InventoryItemReferenceView | null>(() => {
  const item = props.item;
  if (!item) return null;
  if (item.type === "gem") return item.socketedRing ?? null;
  if (item.type === "monster" || item.type === "spell") return item.enchantedGem ?? null;
  return null;
});
const parentHeading = computed(() =>
  props.item?.type === "gem" ? t("inventory.items.socketedIn") : t("inventory.items.enchantsGem"),
);

const actions = computed(() => {
  const item = props.item;
  if (!item) return [];
  const encodedId = encodeURIComponent(item.id);
  if (item.type === "ring")
    return [
      { to: "/inventory/equipment", label: t("inventory.items.manageEquipment"), icon: Shield },
      {
        to: `/forge/socket?ringId=${encodedId}`,
        label: t("inventory.items.manageSockets"),
        icon: Gem,
      },
      { to: "/forge/quality", label: t("inventory.items.improveQuality"), icon: Sparkles },
    ];
  if (item.type === "gem")
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
  return [
    {
      to: `/forge/enchant?targetId=${encodedId}`,
      label: t("inventory.items.manageEnchantments"),
      icon: Sparkles,
    },
    { to: "/forge/quality", label: t("inventory.items.improveQuality"), icon: Hammer },
  ];
});

function itemName(type: string, definitionId: string, fallback: string): string {
  return contentText(`${type}.${definitionId}.name`, fallback);
}

function relatedItemLabel(
  item:
    | Pick<InventoryItemReferenceView, "type" | "definitionId" | "label">
    | EquipmentGemView
    | EquipmentGemView["enchantment"],
): string {
  if (!item) return "";
  const type = "type" in item ? item.type : "gem";
  return t("inventory.items.openRelatedItem", {
    item: itemName(type, item.definitionId, item.label),
  });
}

function selectRelated(itemId: string): void {
  emit("selectItem", itemId);
}
</script>
