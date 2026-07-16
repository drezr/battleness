<template>
  <main class="shell">
    <nav class="section-nav" :aria-label="t('accessibility.marketNavigation')">
      <NuxtLink
        v-for="link in sectionLinks.market"
        :key="link.to"
        :class="{ active: route.path === link.to }"
        :to="link.to"
      >
        {{ $t(link.labelKey) }}
      </NuxtLink>
    </nav>

    <header class="view-header">
      <div class="view-title">
        <span class="eyebrow">{{ t("market.section") }}</span>
        <h1>{{ t("market.game.title") }}</h1>
        <p class="muted">{{ t("market.game.description") }}</p>
      </div>
      <p v-if="state" class="status-note">
        {{ t("common.creditCount", { count: state.player.credits }) }}
      </p>
    </header>

    <p v-if="pending" class="panel">{{ t("market.game.loading") }}</p>
    <p v-else-if="error" class="panel">{{ t("market.game.loadError") }}</p>

    <template v-else-if="state">
      <div
        class="segmented-control market-resource-control"
        role="group"
        :aria-label="t('accessibility.marketResource')"
      >
        <button
          :class="{ active: resourceView === 'materials' }"
          type="button"
          @click="resourceView = 'materials'"
        >
          {{ t("market.game.materials") }}
        </button>
        <button
          :class="{ active: resourceView === 'items' }"
          type="button"
          @click="resourceView = 'items'"
        >
          {{ t("market.game.items") }}
        </button>
      </div>

      <template v-if="resourceView === 'materials'">
        <div class="filter-bar">
          <label>
            <span class="field-label">{{ t("inventory.materials.craftingFamily") }}</span>
            <select v-model="familyFilter">
              <option value="all">{{ t("common.all") }}</option>
              <option value="ring">{{ t("itemType.ring") }}</option>
              <option value="gem">{{ t("itemType.gem") }}</option>
              <option value="monster">{{ t("itemType.monster") }}</option>
              <option value="spell">{{ t("itemType.spell") }}</option>
            </select>
          </label>
          <label>
            <span class="field-label">{{ t("inventory.materials.rarity") }}</span>
            <select v-model="rarityFilter">
              <option value="all">{{ t("common.all") }}</option>
              <option value="common">{{ t("rarity.common") }}</option>
              <option value="refined">{{ t("rarity.refined") }}</option>
              <option value="rare">{{ t("rarity.rare") }}</option>
              <option value="epic">{{ t("rarity.epic") }}</option>
            </select>
          </label>
        </div>

        <section class="detail-layout">
          <div class="card-grid">
            <article
              v-for="material in filteredMaterials"
              :key="material.id"
              :class="[
                'card',
                'item-card',
                'material-card',
                `rarity-border-${material.rarity}`,
                { selected: selectedMaterial?.id === material.id },
              ]"
            >
              <ItemArtwork :definition-id="material.id" kind="material" />
              <div class="item-card-body">
                <div class="card-heading">
                  <h3>{{ materialName(material.id, material.label) }}</h3>
                  <span :class="['pill', `rarity-${material.rarity}`]">
                    {{ t(`rarity.${material.rarity}`) }}
                  </span>
                </div>
                <p class="muted">
                  {{ material.chemicalSymbol ?? material.realWorldType }} -
                  {{ t(`itemType.${material.craftingFamily}`) }}
                </p>
                <dl class="summary-grid item-detail-grid">
                  <div class="stat">
                    <dt>{{ t("market.game.owned") }}</dt>
                    <dd>{{ material.quantity }}</dd>
                  </div>
                  <div class="stat">
                    <dt>{{ t("market.game.buy") }}</dt>
                    <dd>{{ material.buyPrice }}</dd>
                  </div>
                  <div class="stat">
                    <dt>{{ t("market.game.sell") }}</dt>
                    <dd>{{ material.sellPrice }}</dd>
                  </div>
                </dl>
                <div class="control-row">
                  <button
                    class="secondary-button"
                    type="button"
                    @click="selectMaterial(material.id)"
                  >
                    {{ t("common.inspect") }}
                  </button>
                </div>
              </div>
            </article>
          </div>

          <div class="stack market-detail-column">
            <ItemDetailPanel
              :item="selectedMaterial"
              :title="t('inventory.materials.detail')"
              @clear="selectedMaterialId = ''"
            />

            <section class="panel">
              <div class="card-heading">
                <div>
                  <span class="eyebrow">{{ t("market.game.transaction") }}</span>
                  <h2>
                    {{
                      t(
                        marketAction === "buy"
                          ? "market.game.buyMaterial"
                          : "market.game.sellMaterial",
                      )
                    }}
                  </h2>
                </div>
                <span v-if="selectedMaterial" class="pill muted-pill">
                  {{ t("market.game.each", { price: transactionUnitPrice }) }}
                </span>
              </div>

              <div
                class="segmented-control"
                role="group"
                :aria-label="t('accessibility.marketAction')"
              >
                <button
                  :class="{ active: marketAction === 'buy' }"
                  type="button"
                  @click="selectMarketAction('buy')"
                >
                  {{ t("market.game.buy") }}
                </button>
                <button
                  :class="{ active: marketAction === 'sell' }"
                  type="button"
                  @click="selectMarketAction('sell')"
                >
                  {{ t("market.game.sell") }}
                </button>
              </div>

              <p v-if="!selectedMaterial" class="muted">
                {{ t("market.game.selectMaterial") }}
              </p>

              <div v-else class="stack">
                <label>
                  <span class="field-label">{{ t("itemDetail.quantity") }}</span>
                  <input
                    v-model.number="transactionQuantity"
                    min="1"
                    :max="quantityLimit"
                    step="1"
                    type="number"
                  />
                </label>
                <dl class="summary-grid">
                  <div class="stat">
                    <dt>
                      {{
                        t(
                          marketAction === "buy"
                            ? "market.game.totalCost"
                            : "market.game.creditsEarned",
                        )
                      }}
                    </dt>
                    <dd>{{ transactionTotal }}</dd>
                  </div>
                  <div class="stat">
                    <dt>{{ t("market.game.creditsAfter") }}</dt>
                    <dd :class="{ positive: canTransact }">{{ creditsAfterTransaction }}</dd>
                  </div>
                  <div v-if="marketAction === 'sell'" class="stat">
                    <dt>{{ t("market.game.stockAfter") }}</dt>
                    <dd>{{ stockAfterTransaction }}</dd>
                  </div>
                </dl>
                <button
                  :disabled="processing || !canTransact"
                  type="button"
                  @click="submitMarketTransaction"
                >
                  {{
                    processing
                      ? t("market.game.processing")
                      : t(marketAction === "buy" ? "market.game.buy" : "market.game.sell")
                  }}
                </button>
                <small v-if="validQuantity && marketAction === 'buy' && !canAfford">
                  {{ t("forge.notEnoughCredits") }}
                </small>
                <small v-if="validQuantity && marketAction === 'sell' && !hasEnoughStock">
                  {{ t("market.game.notEnoughStock") }}
                </small>
              </div>

              <p v-if="feedback" class="feedback">{{ feedback }}</p>
            </section>

            <section class="panel">
              <div class="card-heading">
                <div>
                  <span class="eyebrow">{{ t("navigation.history") }}</span>
                  <h2>{{ t("market.game.recentTransactions") }}</h2>
                </div>
                <span class="pill muted-pill">{{ state.transactions.length }}</span>
              </div>
              <p v-if="state.transactions.length === 0" class="muted">
                {{ t("market.game.noActivity") }}
              </p>
              <ul v-else class="clean-list market-history">
                <li v-for="transaction in state.transactions" :key="transaction.id">
                  <div>
                    <strong
                      >{{ t(`market.game.action.${transaction.action}`) }}
                      {{ transactionName(transaction) }}</strong
                    >
                    <small>
                      {{
                        t("market.game.historyLine", {
                          quantity: transaction.quantity,
                          price: transaction.unitPrice,
                          date: formatTransactionDate(transaction.createdAt),
                        })
                      }}
                    </small>
                  </div>
                  <strong :class="transaction.creditsDelta > 0 ? 'positive' : 'negative'">
                    {{ transaction.creditsDelta > 0 ? "+" : "" }}{{ transaction.creditsDelta }}
                  </strong>
                </li>
              </ul>
            </section>
          </div>
        </section>
      </template>

      <template v-else>
        <div class="filter-bar">
          <label>
            <span class="field-label">{{ t("market.game.itemType") }}</span>
            <select v-model="itemTypeFilter">
              <option value="all">{{ t("common.all") }}</option>
              <option value="ring">{{ t("itemType.ring") }}</option>
              <option value="gem">{{ t("itemType.gem") }}</option>
              <option value="monster">{{ t("itemType.monster") }}</option>
              <option value="spell">{{ t("itemType.spell") }}</option>
            </select>
          </label>
          <label>
            <span class="field-label">{{ t("inventory.materials.rarity") }}</span>
            <select v-model="itemRarityFilter">
              <option value="all">{{ t("common.all") }}</option>
              <option value="common">{{ t("rarity.common") }}</option>
              <option value="refined">{{ t("rarity.refined") }}</option>
              <option value="rare">{{ t("rarity.rare") }}</option>
              <option value="epic">{{ t("rarity.epic") }}</option>
            </select>
          </label>
        </div>

        <section class="detail-layout">
          <div class="card-grid">
            <p v-if="filteredItems.length === 0" class="panel">
              {{ t("market.game.noItems") }}
            </p>
            <article
              v-for="item in filteredItems"
              :key="item.id"
              :class="[
                'card',
                'item-card',
                `rarity-border-${item.rarity}`,
                { selected: selectedItem?.id === item.id },
              ]"
            >
              <ItemArtwork :definition-id="item.definitionId" :kind="item.type" />
              <div class="item-card-body">
                <div class="card-heading">
                  <h3>{{ itemName(item.type, item.definitionId, item.label) }}</h3>
                  <span :class="['pill', `rarity-${item.rarity}`]">
                    {{ t(`rarity.${item.rarity}`) }}
                  </span>
                </div>
                <div class="control-row">
                  <span class="pill muted-pill">{{ t(`itemType.${item.type}`) }}</span>
                  <span :class="['pill', `element-${item.element}`]">
                    {{ t(`element.${item.element}`) }}
                  </span>
                </div>
                <dl class="summary-grid item-detail-grid">
                  <div class="stat">
                    <dt>{{ t("common.level") }}</dt>
                    <dd>{{ item.level }}</dd>
                  </div>
                  <div class="stat">
                    <dt>{{ t("common.quality") }}</dt>
                    <dd>{{ item.quality }}</dd>
                  </div>
                  <div class="stat">
                    <dt>{{ t("market.game.sell") }}</dt>
                    <dd>{{ item.sellPrice ?? "-" }}</dd>
                  </div>
                </dl>
                <small v-if="item.blockedReason" class="negative">
                  {{ t(`market.game.blocked.${item.blockedReason}`) }}
                </small>
                <div class="control-row">
                  <button class="secondary-button" type="button" @click="selectItem(item.id)">
                    {{ t("common.inspect") }}
                  </button>
                </div>
              </div>
            </article>
          </div>

          <div class="stack market-detail-column">
            <ItemDetailPanel
              :item="selectedItem"
              :title="t('market.game.itemSale')"
              @clear="selectedItemId = ''"
            />

            <section class="panel">
              <div class="card-heading">
                <div>
                  <span class="eyebrow">{{ t("market.game.valuation") }}</span>
                  <h2>{{ t("market.game.sellItem") }}</h2>
                </div>
                <span
                  v-if="selectedItem && selectedItem.sellPrice !== null"
                  class="pill muted-pill"
                >
                  {{ t("common.creditCount", { count: selectedItem?.sellPrice ?? 0 }) }}
                </span>
              </div>

              <p v-if="!selectedItem" class="muted">{{ t("market.game.selectItem") }}</p>
              <div v-else class="stack">
                <ul v-if="selectedItem.ingredients.length" class="clean-list market-history">
                  <li v-for="ingredient in selectedItem.ingredients" :key="ingredient.materialId">
                    <span>
                      {{ materialName(ingredient.materialId, ingredient.label) }}
                      × {{ ingredient.quantity }}
                    </span>
                    <strong>{{ ingredient.unitPrice * ingredient.quantity }}</strong>
                  </li>
                </ul>
                <dl class="summary-grid">
                  <div class="stat">
                    <dt>{{ t("market.game.recipeValue") }}</dt>
                    <dd>{{ selectedItem.recipeValue ?? "-" }}</dd>
                  </div>
                  <div class="stat">
                    <dt>{{ t("market.game.buybackRate") }}</dt>
                    <dd>25%</dd>
                  </div>
                  <div class="stat">
                    <dt>{{ t("market.game.creditsEarned") }}</dt>
                    <dd class="positive">{{ selectedItem.sellPrice ?? "-" }}</dd>
                  </div>
                  <div class="stat">
                    <dt>{{ t("market.game.creditsAfter") }}</dt>
                    <dd class="positive">{{ creditsAfterItemSale }}</dd>
                  </div>
                </dl>
                <p v-if="selectedItem.blockedReason" class="feedback negative">
                  {{ t(`market.game.blocked.${selectedItem.blockedReason}`) }}
                </p>
                <button
                  :disabled="processing || !selectedItem.canSell"
                  type="button"
                  @click="submitItemSale"
                >
                  {{ processing ? t("market.game.processing") : t("market.game.sellItem") }}
                </button>
              </div>
              <p v-if="itemFeedback" class="feedback">{{ itemFeedback }}</p>
            </section>

            <section class="panel">
              <div class="card-heading">
                <div>
                  <span class="eyebrow">{{ t("navigation.history") }}</span>
                  <h2>{{ t("market.game.recentTransactions") }}</h2>
                </div>
                <span class="pill muted-pill">{{ state.transactions.length }}</span>
              </div>
              <p v-if="state.transactions.length === 0" class="muted">
                {{ t("market.game.noActivity") }}
              </p>
              <ul v-else class="clean-list market-history">
                <li v-for="transaction in state.transactions" :key="transaction.id">
                  <div>
                    <strong>
                      {{ t(`market.game.action.${transaction.action}`) }}
                      {{ transactionName(transaction) }}
                    </strong>
                    <small>
                      {{
                        t("market.game.historyLine", {
                          quantity: transaction.quantity,
                          price: transaction.unitPrice,
                          date: formatTransactionDate(transaction.createdAt),
                        })
                      }}
                    </small>
                  </div>
                  <strong :class="transaction.creditsDelta > 0 ? 'positive' : 'negative'">
                    {{ transaction.creditsDelta > 0 ? "+" : "" }}{{ transaction.creditsDelta }}
                  </strong>
                </li>
              </ul>
            </section>
          </div>
        </section>
      </template>
    </template>
  </main>
</template>

<script setup lang="ts">
import type { GameMarketState, GameMarketTransactionView } from "~/utils/playerState";
import { sectionLinks } from "~/utils/viewData";

const route = useRoute();
const { t, locale } = useI18n();
const contentText = useContentText();
const { data: state, error, pending } = await useFetch<GameMarketState>("/api/market/game");
const resourceView = ref<"materials" | "items">("materials");
const familyFilter = ref("all");
const rarityFilter = ref("all");
const itemTypeFilter = ref("all");
const itemRarityFilter = ref("all");
const selectedMaterialId = ref("");
const selectedItemId = ref("");
const marketAction = ref<"buy" | "sell">("buy");
const transactionQuantity = ref(1);
const processing = ref(false);
const feedback = ref("");
const itemFeedback = ref("");

function materialName(id: string, fallback: string): string {
  return contentText(`material.${id}.name`, fallback);
}

function itemName(type: string, definitionId: string, fallback: string): string {
  return contentText(`${type}.${definitionId}.name`, fallback);
}

const filteredMaterials = computed(() =>
  (state.value?.materials ?? []).filter((material) => {
    const matchesFamily =
      familyFilter.value === "all" || material.craftingFamily === familyFilter.value;
    const matchesRarity = rarityFilter.value === "all" || material.rarity === rarityFilter.value;
    return matchesFamily && matchesRarity;
  }),
);
const selectedMaterial = computed(
  () => state.value?.materials.find((material) => material.id === selectedMaterialId.value) ?? null,
);
const filteredItems = computed(() =>
  (state.value?.items ?? []).filter((item) => {
    const matchesType = itemTypeFilter.value === "all" || item.type === itemTypeFilter.value;
    const matchesRarity =
      itemRarityFilter.value === "all" || item.rarity === itemRarityFilter.value;
    return matchesType && matchesRarity;
  }),
);
const selectedItem = computed(
  () => state.value?.items.find((item) => item.id === selectedItemId.value) ?? null,
);
const creditsAfterItemSale = computed(
  () => (state.value?.player.credits ?? 0) + (selectedItem.value?.sellPrice ?? 0),
);
const validQuantity = computed(
  () =>
    Number.isInteger(transactionQuantity.value) &&
    transactionQuantity.value >= 1 &&
    transactionQuantity.value <= 999,
);
const transactionUnitPrice = computed(() =>
  marketAction.value === "buy"
    ? (selectedMaterial.value?.buyPrice ?? 0)
    : (selectedMaterial.value?.sellPrice ?? 0),
);
const transactionTotal = computed(() =>
  validQuantity.value ? transactionUnitPrice.value * transactionQuantity.value : 0,
);
const creditsAfterTransaction = computed(() =>
  marketAction.value === "buy"
    ? (state.value?.player.credits ?? 0) - transactionTotal.value
    : (state.value?.player.credits ?? 0) + transactionTotal.value,
);
const canAfford = computed(() => creditsAfterTransaction.value >= 0);
const hasEnoughStock = computed(
  () => transactionQuantity.value <= (selectedMaterial.value?.quantity ?? 0),
);
const canTransact = computed(
  () =>
    selectedMaterial.value !== null &&
    validQuantity.value &&
    (marketAction.value === "buy" ? canAfford.value : hasEnoughStock.value),
);
const stockAfterTransaction = computed(
  () => (selectedMaterial.value?.quantity ?? 0) - transactionQuantity.value,
);
const quantityLimit = computed(() =>
  marketAction.value === "sell" ? Math.max(1, selectedMaterial.value?.quantity ?? 1) : 999,
);

watchEffect(() => {
  if (
    selectedMaterialId.value &&
    !filteredMaterials.value.some((material) => material.id === selectedMaterialId.value)
  ) {
    selectedMaterialId.value = "";
  }
});

watchEffect(() => {
  if (
    selectedItemId.value &&
    !filteredItems.value.some((item) => item.id === selectedItemId.value)
  ) {
    selectedItemId.value = "";
  }
});

function selectMaterial(materialId: string): void {
  selectedMaterialId.value = materialId;
  transactionQuantity.value = 1;
  feedback.value = "";
}

function selectItem(itemId: string): void {
  selectedItemId.value = itemId;
  itemFeedback.value = "";
}

function selectMarketAction(action: "buy" | "sell"): void {
  marketAction.value = action;
  transactionQuantity.value = 1;
  feedback.value = "";
}

async function submitMarketTransaction(): Promise<void> {
  if (!selectedMaterial.value || !canTransact.value) {
    return;
  }

  const materialLabel = selectedMaterial.value.label;
  const quantity = transactionQuantity.value;
  const action = marketAction.value;
  processing.value = true;
  feedback.value = "";

  try {
    state.value = await $fetch<GameMarketState>("/api/market/game", {
      method: "POST",
      body: {
        action: action === "buy" ? "buyMaterial" : "sellMaterial",
        materialId: selectedMaterial.value.id,
        quantity,
        requestId: crypto.randomUUID(),
      },
    });
    feedback.value = t(action === "buy" ? "market.game.purchased" : "market.game.sold", {
      quantity,
      material: materialName(selectedMaterial.value.id, materialLabel),
    });
    await refreshNuxtData();
  } catch (transactionError) {
    feedback.value =
      transactionError instanceof Error ? transactionError.message : t("market.game.actionError");
  } finally {
    processing.value = false;
  }
}

async function submitItemSale(): Promise<void> {
  if (!selectedItem.value?.canSell || selectedItem.value.sellPrice === null) {
    return;
  }

  const item = selectedItem.value;
  const localizedName = itemName(item.type, item.definitionId, item.label);
  const confirmed = window.confirm(
    t("market.game.confirmItemSale", { item: localizedName, price: item.sellPrice }),
  );
  if (!confirmed) {
    return;
  }

  processing.value = true;
  itemFeedback.value = "";
  try {
    state.value = await $fetch<GameMarketState>("/api/market/game", {
      method: "POST",
      body: {
        action: "sellItem",
        itemId: item.id,
        requestId: crypto.randomUUID(),
      },
    });
    selectedItemId.value = "";
    itemFeedback.value = t("market.game.itemSold", {
      item: localizedName,
      price: item.sellPrice,
    });
    await refreshNuxtData();
  } catch (transactionError) {
    itemFeedback.value =
      transactionError instanceof Error ? transactionError.message : t("market.game.actionError");
  } finally {
    processing.value = false;
  }
}

function transactionName(transaction: GameMarketTransactionView): string {
  return transaction.resourceType === "material"
    ? materialName(transaction.resourceDefinitionId, transaction.resourceLabel)
    : itemName(
        transaction.resourceType,
        transaction.resourceDefinitionId,
        transaction.resourceLabel,
      );
}

function formatTransactionDate(value: string): string {
  return new Date(value).toLocaleString(locale.value);
}
</script>
