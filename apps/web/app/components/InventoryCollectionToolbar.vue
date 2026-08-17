<template>
  <div class="inventory-collection-toolbar">
    <label class="inventory-search-field">
      <span class="field-label">{{ t("inventory.items.searchLabel") }}</span>
      <span class="inventory-search-control">
        <Search :size="18" aria-hidden="true" />
        <input
          :value="searchQuery"
          type="search"
          :placeholder="t('inventory.items.searchPlaceholder')"
          @input="emit('update:searchQuery', ($event.target as HTMLInputElement).value)"
        />
        <button
          v-if="searchQuery"
          class="inventory-search-clear"
          type="button"
          :aria-label="t('inventory.items.clearSearch')"
          :title="t('inventory.items.clearSearch')"
          @click="emit('update:searchQuery', '')"
        >
          <X :size="16" aria-hidden="true" />
        </button>
      </span>
    </label>

    <label>
      <span class="field-label">{{ t("common.element") }}</span>
      <select
        :value="elementFilter"
        @change="emit('update:elementFilter', ($event.target as HTMLSelectElement).value)"
      >
        <option value="all">{{ t("common.all") }}</option>
        <option value="electric">{{ t("element.electric") }}</option>
        <option value="fire">{{ t("element.fire") }}</option>
        <option value="ice">{{ t("element.ice") }}</option>
      </select>
    </label>

    <label>
      <span class="field-label">{{ t("inventory.items.sortLabel") }}</span>
      <select
        :value="sortOrder"
        @change="emit('update:sortOrder', ($event.target as HTMLSelectElement).value)"
      >
        <option value="current">{{ t("inventory.items.sort.current") }}</option>
        <option value="levelDesc">{{ t("inventory.items.sort.levelDesc") }}</option>
        <option value="qualityDesc">{{ t("inventory.items.sort.qualityDesc") }}</option>
        <option value="rarityDesc">{{ t("inventory.items.sort.rarityDesc") }}</option>
        <option value="nameAsc">{{ t("inventory.items.sort.nameAsc") }}</option>
      </select>
    </label>

    <p class="inventory-collection-count" aria-live="polite">
      <strong>{{ filteredCount }}</strong>
      <span>{{ t("inventory.items.collectionCount", { total: totalCount }) }}</span>
    </p>
  </div>
</template>

<script setup lang="ts">
import { Search, X } from "@lucide/vue";

defineProps<{
  searchQuery: string;
  elementFilter: string;
  sortOrder: string;
  filteredCount: number;
  totalCount: number;
}>();

const emit = defineEmits<{
  "update:searchQuery": [value: string];
  "update:elementFilter": [value: string];
  "update:sortOrder": [value: string];
}>();

const { t } = useI18n();
</script>
