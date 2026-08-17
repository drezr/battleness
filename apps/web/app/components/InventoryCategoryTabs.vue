<template>
  <div class="inventory-category-tabs" role="group" :aria-label="t('inventory.items.categories')">
    <button
      v-for="category in categories"
      :key="category.id"
      type="button"
      :class="{ active: modelValue === category.id }"
      :aria-pressed="modelValue === category.id"
      @click="emit('update:modelValue', category.id)"
    >
      <component :is="category.icon" :size="18" aria-hidden="true" />
      <span>{{ t(category.labelKey) }}</span>
      <small>{{ counts[category.id] ?? 0 }}</small>
    </button>
  </div>
</template>

<script setup lang="ts">
import { Boxes, CircleDot, Gem, PawPrint, Sparkles } from "@lucide/vue";

export type InventoryCategory = "all" | "ring" | "gem" | "monster" | "spell";

defineProps<{
  modelValue: InventoryCategory;
  counts: Record<InventoryCategory, number>;
}>();

const emit = defineEmits<{
  "update:modelValue": [value: InventoryCategory];
}>();

const { t } = useI18n();
const categories = [
  { id: "all", labelKey: "common.all", icon: Boxes },
  { id: "ring", labelKey: "common.rings", icon: CircleDot },
  { id: "gem", labelKey: "common.gems", icon: Gem },
  { id: "monster", labelKey: "common.monsters", icon: PawPrint },
  { id: "spell", labelKey: "common.spells", icon: Sparkles },
] as const;
</script>
