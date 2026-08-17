<template>
  <main class="shell inventory-items-page">
    <header class="view-header">
      <div class="view-title">
        <SectionBackLink
          to="/inventory"
          :label="t('navigation.backToHub', { section: t('navigation.inventory') })"
        />
        <div class="view-title-heading">
          <h1>{{ t("inventory.items.title") }}</h1>
          <ViewHelpButton
            :title="t('inventory.items.title')"
            :description="t('inventory.items.description')"
          />
        </div>
      </div>
    </header>

    <p v-if="pending" class="panel">{{ t("inventory.items.loading") }}</p>
    <p v-else-if="error" class="panel">{{ t("inventory.items.loadError") }}</p>

    <template v-else-if="state">
      <section class="inventory-collection-command" :aria-label="t('inventory.items.collection')">
        <InventoryCategoryTabs v-model="typeFilter" :counts="categoryCounts" />
        <InventoryCollectionToolbar
          v-model:search-query="searchQuery"
          v-model:element-filter="elementFilter"
          v-model:sort-order="sortOrder"
          :filtered-count="filteredItems.length"
          :total-count="state.inventory.length"
        />
      </section>

      <section class="inventory-collection-layout">
        <div class="inventory-collection-floor">
          <div class="inventory-collection-heading">
            <div>
              <span class="eyebrow">{{ t("inventory.items.ownedArsenal") }}</span>
              <h2>{{ activeCategoryLabel }}</h2>
            </div>
            <span>{{ t("inventory.items.visibleCount", { count: filteredItems.length }) }}</span>
          </div>

          <div v-if="filteredItems.length === 0" class="inventory-empty-collection">
            <SearchX :size="36" aria-hidden="true" />
            <strong>{{ t("inventory.items.noMatchesTitle") }}</strong>
            <p>{{ t("inventory.items.noMatches") }}</p>
            <button type="button" class="secondary-button" @click="resetFilters">
              {{ t("inventory.items.resetFilters") }}
            </button>
          </div>

          <div v-else class="inventory-item-grid">
            <InventoryItemTile
              v-for="item in filteredItems"
              :key="item.id"
              :item="item"
              :selected="selectedItem?.id === item.id"
              @select="selectItem(item.id)"
            />
          </div>
        </div>

        <InventoryItemInspector :item="selectedItem" />
      </section>

      <ItemDetailPanel
        :item="mobileInspectorItem"
        :title="t('inventory.items.detail')"
        :manage-to="mobileManageTo"
        @clear="mobileInspectorItemId = ''"
      />
    </template>
  </main>
</template>

<script setup lang="ts">
import { SearchX } from "@lucide/vue";
import type { InventoryCategory } from "~/components/InventoryCategoryTabs.vue";
import type { InventoryItemView, PlayerState } from "~/utils/playerState";

type InventorySortOrder = "current" | "levelDesc" | "qualityDesc" | "rarityDesc" | "nameAsc";

const { t, locale } = useI18n();
const contentText = useContentText();
const { data: state, error, pending } = await useFetch<PlayerState>("/api/player");
const typeFilter = ref<InventoryCategory>("all");
const elementFilter = ref("all");
const searchQuery = ref("");
const sortOrder = ref<InventorySortOrder>("current");
const selectedItemId = ref("");
const mobileInspectorItemId = ref("");
const compactInspector = ref(false);
let inspectorMediaQuery: MediaQueryList | null = null;

const rarityRank: Record<string, number> = {
  common: 0,
  refined: 1,
  rare: 2,
  epic: 3,
};

const categoryCounts = computed<Record<InventoryCategory, number>>(() => {
  const items = state.value?.inventory ?? [];
  return {
    all: items.length,
    ring: items.filter((item) => item.type === "ring").length,
    gem: items.filter((item) => item.type === "gem").length,
    monster: items.filter((item) => item.type === "monster").length,
    spell: items.filter((item) => item.type === "spell").length,
  };
});

const activeCategoryLabel = computed(() =>
  typeFilter.value === "all" ? t("inventory.items.allItems") : t(`itemType.${typeFilter.value}`),
);

const filteredItems = computed(() => {
  const normalizedQuery = searchQuery.value.trim().toLocaleLowerCase(locale.value);
  const indexed = (state.value?.inventory ?? []).map((item, index) => ({
    item,
    index,
    name: itemName(item).toLocaleLowerCase(locale.value),
  }));
  const matches = indexed.filter(({ item, name }) => {
    const matchesType = typeFilter.value === "all" || item.type === typeFilter.value;
    const matchesElement = elementFilter.value === "all" || item.element === elementFilter.value;
    const matchesSearch = !normalizedQuery || name.includes(normalizedQuery);
    return matchesType && matchesElement && matchesSearch;
  });

  matches.sort((left, right) => {
    if (sortOrder.value === "levelDesc")
      return right.item.level - left.item.level || left.index - right.index;
    if (sortOrder.value === "qualityDesc")
      return right.item.quality - left.item.quality || left.index - right.index;
    if (sortOrder.value === "rarityDesc") {
      return (
        (rarityRank[right.item.rarity] ?? 0) - (rarityRank[left.item.rarity] ?? 0) ||
        left.index - right.index
      );
    }
    if (sortOrder.value === "nameAsc") return left.name.localeCompare(right.name, locale.value);
    return left.index - right.index;
  });

  return matches.map(({ item }) => item);
});

const selectedItem = computed(
  () => state.value?.inventory.find((item) => item.id === selectedItemId.value) ?? null,
);
const mobileInspectorItem = computed(
  () => state.value?.inventory.find((item) => item.id === mobileInspectorItemId.value) ?? null,
);
const mobileManageTo = computed(() => manageRoute(mobileInspectorItem.value));

watchEffect(() => {
  const visibleItems = filteredItems.value;
  if (visibleItems.length === 0) {
    selectedItemId.value = "";
    mobileInspectorItemId.value = "";
    return;
  }
  if (!visibleItems.some((item) => item.id === selectedItemId.value)) {
    selectedItemId.value = visibleItems[0]?.id ?? "";
    mobileInspectorItemId.value = "";
  }
});

onMounted(() => {
  inspectorMediaQuery = window.matchMedia("(max-width: 1179px)");
  updateInspectorMode(inspectorMediaQuery);
  inspectorMediaQuery.addEventListener("change", updateInspectorMode);
});

onBeforeUnmount(() => {
  inspectorMediaQuery?.removeEventListener("change", updateInspectorMode);
});

function itemName(item: InventoryItemView): string {
  return contentText(`${item.type}.${item.definitionId}.name`, item.label);
}

function selectItem(itemId: string): void {
  selectedItemId.value = itemId;
  if (compactInspector.value) mobileInspectorItemId.value = itemId;
}

function resetFilters(): void {
  typeFilter.value = "all";
  elementFilter.value = "all";
  searchQuery.value = "";
  sortOrder.value = "current";
}

function updateInspectorMode(event: MediaQueryList | MediaQueryListEvent): void {
  compactInspector.value = event.matches;
  if (!event.matches) mobileInspectorItemId.value = "";
}

function manageRoute(item: InventoryItemView | null): string | undefined {
  if (!item) return undefined;
  if (item.type === "ring") return `/forge/socket?ringId=${encodeURIComponent(item.id)}`;
  if (item.type === "gem") return `/forge/enchant?gemId=${encodeURIComponent(item.id)}`;
  return `/forge/enchant?targetId=${encodeURIComponent(item.id)}`;
}
</script>
