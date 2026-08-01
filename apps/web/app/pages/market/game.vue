<template>
  <main class="shell game-market-page">
    <header class="view-header market-view-header">
      <div class="view-title">
        <SectionBackLink
          to="/market"
          :label="t('navigation.backToHub', { section: t('navigation.market') })"
        />
        <div class="view-title-heading">
          <h1>{{ t("market.game.title") }}</h1>
          <ViewHelpButton
            :title="t('market.game.title')"
            :description="t('market.game.description')"
          />
        </div>
      </div>
      <span v-if="state" class="market-credit-balance"
        ><Coins :size="17" aria-hidden="true" />{{
          t("common.creditCount", { count: state.player.credits })
        }}</span
      >
    </header>

    <p v-if="pending" class="panel">{{ t("market.game.loading") }}</p>
    <p v-else-if="error" class="panel">{{ t("market.game.loadError") }}</p>

    <template v-else-if="state">
      <section class="market-mode-bar">
        <div class="market-mode-tabs" role="group" :aria-label="t('accessibility.marketResource')">
          <button
            :class="{ active: resourceView === 'materials' }"
            type="button"
            :aria-pressed="resourceView === 'materials'"
            @click="resourceView = 'materials'"
          >
            <PackageOpen :size="17" aria-hidden="true" />{{ t("market.game.materials") }}
          </button>
          <button
            :class="{ active: resourceView === 'items' }"
            type="button"
            :aria-pressed="resourceView === 'items'"
            @click="resourceView = 'items'"
          >
            <Gem :size="17" aria-hidden="true" />{{ t("market.game.items") }}
          </button>
        </div>
        <NuxtLink class="text-link" to="/market/players"
          ><Users :size="16" />{{ t("market.game.openPlayerMarket") }}<ArrowRight :size="15"
        /></NuxtLink>
      </section>

      <template v-if="resourceView === 'materials'">
        <section class="market-filter-strip">
          <SlidersHorizontal :size="18" aria-hidden="true" />
          <label
            ><span class="field-label">{{ t("inventory.materials.craftingFamily") }}</span
            ><select v-model="familyFilter">
              <option value="all">{{ t("common.all") }}</option>
              <option value="ring">{{ t("itemType.ring") }}</option>
              <option value="gem">{{ t("itemType.gem") }}</option>
              <option value="monster">{{ t("itemType.monster") }}</option>
              <option value="spell">{{ t("itemType.spell") }}</option>
            </select></label
          >
          <label
            ><span class="field-label">{{ t("inventory.materials.rarity") }}</span
            ><select v-model="rarityFilter">
              <option value="all">{{ t("common.all") }}</option>
              <option value="common">{{ t("rarity.common") }}</option>
              <option value="refined">{{ t("rarity.refined") }}</option>
              <option value="rare">{{ t("rarity.rare") }}</option>
              <option value="epic">{{ t("rarity.epic") }}</option>
            </select></label
          >
          <span class="pill muted-pill">{{ filteredMaterials.length }}</span>
        </section>

        <section class="game-market-workspace">
          <div class="market-catalogue">
            <div class="section-heading-row">
              <div>
                <span class="eyebrow">{{ t("market.game.fixedStock") }}</span>
                <h2>{{ t("market.game.materials") }}</h2>
              </div>
            </div>
            <div class="game-market-grid">
              <button
                v-for="material in filteredMaterials"
                :key="material.id"
                :class="[
                  'game-market-card',
                  `rarity-border-${material.rarity}`,
                  { selected: selectedMaterial?.id === material.id },
                ]"
                type="button"
                :aria-pressed="selectedMaterial?.id === material.id"
                @click="selectMaterial(material.id, $event)"
              >
                <ItemArtwork :definition-id="material.id" kind="material" />
                <span class="game-market-card-copy">
                  <span
                    ><strong>{{ materialName(material.id, material.label) }}</strong
                    ><small
                      >{{ material.chemicalSymbol ?? material.realWorldType }} ·
                      {{ t(`itemType.${material.craftingFamily}`) }}</small
                    ></span
                  >
                  <span :class="['pill', `rarity-${material.rarity}`]">{{
                    t(`rarity.${material.rarity}`)
                  }}</span>
                  <span class="market-card-metrics"
                    ><span
                      ><small>{{ t("market.game.owned") }}</small
                      ><strong>{{ material.quantity }}</strong></span
                    ><span
                      ><small>{{ t("market.game.buy") }}</small
                      ><strong>{{ material.buyPrice }}</strong></span
                    ><span
                      ><small>{{ t("market.game.sell") }}</small
                      ><strong>{{ material.sellPrice }}</strong></span
                    ></span
                  >
                </span>
              </button>
            </div>
          </div>

          <Teleport to="body">
            <div
              v-if="isTransactionModalOpen"
              class="market-transaction-modal-backdrop"
              role="presentation"
              @click.self="closeTransactionModal"
            >
              <aside
                ref="transactionDialog"
                class="market-transaction-desk market-transaction-modal"
                role="dialog"
                aria-modal="true"
                aria-labelledby="game-market-material-transaction-title"
                tabindex="-1"
              >
                <button
                  class="icon-button market-transaction-modal-close"
                  type="button"
                  :aria-label="t('market.game.closeTransaction')"
                  :title="t('market.game.closeTransaction')"
                  @click="closeTransactionModal"
                >
                  <X :size="20" aria-hidden="true" />
                </button>
                <div class="market-desk-heading">
                  <span class="market-desk-icon"><ArrowLeftRight :size="22" /></span>
                  <div>
                    <span class="eyebrow">{{ t("market.game.transaction") }}</span>
                    <h2 id="game-market-material-transaction-title">
                      {{
                        t(
                          marketAction === "buy"
                            ? "market.game.buyMaterial"
                            : "market.game.sellMaterial",
                        )
                      }}
                    </h2>
                  </div>
                </div>
                <div
                  class="market-action-tabs"
                  role="group"
                  :aria-label="t('accessibility.marketAction')"
                >
                  <button
                    :class="{ active: marketAction === 'buy' }"
                    type="button"
                    :aria-pressed="marketAction === 'buy'"
                    @click="selectMarketAction('buy')"
                  >
                    <ShoppingCart :size="16" />{{ t("market.game.buy") }}
                  </button>
                  <button
                    :class="{ active: marketAction === 'sell' }"
                    type="button"
                    :aria-pressed="marketAction === 'sell'"
                    @click="selectMarketAction('sell')"
                  >
                    <Banknote :size="16" />{{ t("market.game.sell") }}
                  </button>
                </div>

                <div v-if="!selectedMaterial" class="market-desk-empty">
                  <CircleDashed :size="28" />
                  <p>{{ t("market.game.selectMaterial") }}</p>
                </div>
                <template v-else>
                  <div class="market-selected-resource">
                    <ItemArtwork :definition-id="selectedMaterial.id" kind="material" />
                    <div>
                      <span class="eyebrow">{{ t("market.game.selectedResource") }}</span>
                      <h3>{{ materialName(selectedMaterial.id, selectedMaterial.label) }}</h3>
                      <small>{{ t("market.game.each", { price: transactionUnitPrice }) }}</small>
                    </div>
                  </div>
                  <label class="market-quantity-field"
                    ><span class="field-label">{{ t("itemDetail.quantity") }}</span
                    ><input
                      v-model.number="transactionQuantity"
                      min="1"
                      :max="quantityLimit"
                      step="1"
                      type="number"
                  /></label>
                  <dl class="market-transaction-preview">
                    <div>
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
                    <div>
                      <dt>{{ t("market.game.creditsAfter") }}</dt>
                      <dd :class="{ positive: canTransact }">{{ creditsAfterTransaction }}</dd>
                    </div>
                    <div v-if="marketAction === 'sell'">
                      <dt>{{ t("market.game.stockAfter") }}</dt>
                      <dd>{{ stockAfterTransaction }}</dd>
                    </div>
                  </dl>
                  <button
                    class="market-primary-action"
                    :disabled="processing || !canTransact"
                    type="button"
                    @click="submitMarketTransaction"
                  >
                    <ShoppingCart v-if="marketAction === 'buy'" :size="17" /><Banknote
                      v-else
                      :size="17"
                    />{{
                      processing
                        ? t("market.game.processing")
                        : t(marketAction === "buy" ? "market.game.buy" : "market.game.sell")
                    }}
                  </button>
                  <small
                    v-if="validQuantity && marketAction === 'buy' && !canAfford"
                    class="negative"
                    >{{ t("forge.notEnoughCredits") }}</small
                  >
                  <small
                    v-if="validQuantity && marketAction === 'sell' && !hasEnoughStock"
                    class="negative"
                    >{{ t("market.game.notEnoughStock") }}</small
                  >
                </template>
                <p v-if="feedback" class="feedback" role="status">{{ feedback }}</p>
              </aside>
            </div>
          </Teleport>
        </section>
      </template>

      <template v-else>
        <section class="market-filter-strip">
          <SlidersHorizontal :size="18" aria-hidden="true" />
          <label
            ><span class="field-label">{{ t("market.game.itemType") }}</span
            ><select v-model="itemTypeFilter">
              <option value="all">{{ t("common.all") }}</option>
              <option value="ring">{{ t("itemType.ring") }}</option>
              <option value="gem">{{ t("itemType.gem") }}</option>
              <option value="monster">{{ t("itemType.monster") }}</option>
              <option value="spell">{{ t("itemType.spell") }}</option>
            </select></label
          >
          <label
            ><span class="field-label">{{ t("inventory.materials.rarity") }}</span
            ><select v-model="itemRarityFilter">
              <option value="all">{{ t("common.all") }}</option>
              <option value="common">{{ t("rarity.common") }}</option>
              <option value="refined">{{ t("rarity.refined") }}</option>
              <option value="rare">{{ t("rarity.rare") }}</option>
              <option value="epic">{{ t("rarity.epic") }}</option>
            </select></label
          >
          <span class="pill muted-pill">{{ filteredItems.length }}</span>
        </section>

        <section class="game-market-workspace">
          <div class="market-catalogue">
            <div class="section-heading-row">
              <div>
                <span class="eyebrow">{{ t("market.game.buybackInventory") }}</span>
                <h2>{{ t("market.game.items") }}</h2>
              </div>
            </div>
            <div v-if="filteredItems.length === 0" class="market-desk-empty">
              <CircleDashed :size="28" />
              <p>{{ t("market.game.noItems") }}</p>
            </div>
            <div v-else class="game-market-grid">
              <button
                v-for="item in filteredItems"
                :key="item.id"
                :class="[
                  'game-market-card',
                  `rarity-border-${item.rarity}`,
                  { selected: selectedItem?.id === item.id, blocked: !item.canSell },
                ]"
                type="button"
                :aria-pressed="selectedItem?.id === item.id"
                @click="selectItem(item.id, $event)"
              >
                <ItemArtwork :definition-id="item.definitionId" :kind="item.type" />
                <span class="game-market-card-copy">
                  <span
                    ><strong>{{ itemName(item.type, item.definitionId, item.label) }}</strong
                    ><small
                      >{{ t(`itemType.${item.type}`) }} · {{ t("common.level") }}
                      {{ item.level }}</small
                    ></span
                  >
                  <span :class="['pill', `element-${item.element}`]">{{
                    t(`element.${item.element}`)
                  }}</span>
                  <span class="market-card-metrics"
                    ><span
                      ><small>{{ t("common.quality") }}</small
                      ><strong>{{ item.quality }}</strong></span
                    ><span
                      ><small>{{ t("market.game.sell") }}</small
                      ><strong>{{ item.sellPrice ?? "-" }}</strong></span
                    ></span
                  >
                  <small v-if="item.blockedReason" class="negative">{{
                    t(`market.game.blocked.${item.blockedReason}`)
                  }}</small>
                </span>
              </button>
            </div>
          </div>

          <Teleport to="body">
            <div
              v-if="isTransactionModalOpen"
              class="market-transaction-modal-backdrop"
              role="presentation"
              @click.self="closeTransactionModal"
            >
              <aside
                ref="transactionDialog"
                class="market-transaction-desk market-transaction-modal valuation-desk"
                role="dialog"
                aria-modal="true"
                aria-labelledby="game-market-item-transaction-title"
                tabindex="-1"
              >
                <button
                  class="icon-button market-transaction-modal-close"
                  type="button"
                  :aria-label="t('market.game.closeTransaction')"
                  :title="t('market.game.closeTransaction')"
                  @click="closeTransactionModal"
                >
                  <X :size="20" aria-hidden="true" />
                </button>
                <div class="market-desk-heading">
                  <span class="market-desk-icon"><ReceiptText :size="22" /></span>
                  <div>
                    <span class="eyebrow">{{ t("market.game.valuation") }}</span>
                    <h2 id="game-market-item-transaction-title">{{ t("market.game.sellItem") }}</h2>
                  </div>
                </div>
                <div v-if="!selectedItem" class="market-desk-empty">
                  <CircleDashed :size="28" />
                  <p>{{ t("market.game.selectItem") }}</p>
                </div>
                <template v-else>
                  <div class="market-selected-resource">
                    <ItemArtwork
                      :definition-id="selectedItem.definitionId"
                      :kind="selectedItem.type"
                    />
                    <div>
                      <span class="eyebrow">{{ t(`itemType.${selectedItem.type}`) }}</span>
                      <h3>
                        {{
                          itemName(selectedItem.type, selectedItem.definitionId, selectedItem.label)
                        }}
                      </h3>
                      <span :class="['pill', `element-${selectedItem.element}`]">{{
                        t(`element.${selectedItem.element}`)
                      }}</span>
                    </div>
                  </div>
                  <div class="market-recipe-valuation">
                    <div class="market-valuation-heading">
                      <span>{{ t("market.game.recipeValue") }}</span
                      ><strong>{{ selectedItem.recipeValue ?? "-" }}</strong>
                    </div>
                    <div
                      v-for="ingredient in selectedItem.ingredients"
                      :key="ingredient.materialId"
                      class="market-valuation-row"
                    >
                      <span
                        >{{ materialName(ingredient.materialId, ingredient.label) }}
                        <small>× {{ ingredient.quantity }}</small></span
                      ><strong>{{ ingredient.unitPrice * ingredient.quantity }}</strong>
                    </div>
                    <div class="market-buyback-line">
                      <span>{{ t("market.game.buybackRate") }}</span
                      ><strong>25%</strong>
                    </div>
                  </div>
                  <dl class="market-transaction-preview">
                    <div>
                      <dt>{{ t("market.game.creditsEarned") }}</dt>
                      <dd class="positive">{{ selectedItem.sellPrice ?? "-" }}</dd>
                    </div>
                    <div>
                      <dt>{{ t("market.game.creditsAfter") }}</dt>
                      <dd class="positive">{{ creditsAfterItemSale }}</dd>
                    </div>
                  </dl>
                  <p v-if="selectedItem.blockedReason" class="market-blocked-reason">
                    <ShieldAlert :size="17" />{{
                      t(`market.game.blocked.${selectedItem.blockedReason}`)
                    }}
                  </p>
                  <button
                    class="market-primary-action"
                    :disabled="processing || !selectedItem.canSell"
                    type="button"
                    @click="submitItemSale"
                  >
                    <Banknote :size="17" />{{
                      processing ? t("market.game.processing") : t("market.game.sellItem")
                    }}
                  </button>
                </template>
                <p v-if="itemFeedback" class="feedback" role="status">{{ itemFeedback }}</p>
              </aside>
            </div>
          </Teleport>
        </section>
      </template>

      <section class="market-activity-section">
        <div class="section-heading-row">
          <div>
            <span class="eyebrow">{{ t("navigation.history") }}</span>
            <h2>{{ t("market.game.recentTransactions") }}</h2>
          </div>
          <span class="pill muted-pill">{{ state.transactions.length }}</span>
        </div>
        <div v-if="state.transactions.length === 0" class="market-desk-empty compact">
          <History :size="24" />
          <p>{{ t("market.game.noActivity") }}</p>
        </div>
        <div v-else class="market-activity-list">
          <article v-for="transaction in state.transactions" :key="transaction.id">
            <span :class="['market-activity-icon', transaction.action]"
              ><ShoppingCart v-if="transaction.action === 'buy'" :size="16" /><Banknote
                v-else
                :size="16"
            /></span>
            <div>
              <strong
                >{{ t(`market.game.action.${transaction.action}`) }}
                {{ transactionName(transaction) }}</strong
              ><small>{{
                t("market.game.historyLine", {
                  quantity: transaction.quantity,
                  price: transaction.unitPrice,
                  date: formatTransactionDate(transaction.createdAt),
                })
              }}</small>
            </div>
            <strong :class="transaction.creditsDelta > 0 ? 'positive' : 'negative'"
              >{{ transaction.creditsDelta > 0 ? "+" : "" }}{{ transaction.creditsDelta }}</strong
            >
          </article>
        </div>
      </section>
    </template>
  </main>
</template>

<script setup lang="ts">
import {
  ArrowLeftRight,
  ArrowRight,
  Banknote,
  CircleDashed,
  Coins,
  Gem,
  History,
  PackageOpen,
  ReceiptText,
  ShieldAlert,
  ShoppingCart,
  SlidersHorizontal,
  Users,
  X,
} from "@lucide/vue";
import type { GameMarketState, GameMarketTransactionView } from "~/utils/playerState";
const { t, locale } = useI18n();
const { formatDateTime: formatLocalizedDateTime } = useDateTimeFormatter();
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
const isTransactionModalOpen = ref(false);
const transactionDialog = ref<HTMLElement | null>(null);
let transactionTrigger: HTMLElement | null = null;
let marketBackground: HTMLElement | null = null;
let marketBackgroundWasInert = false;
let previousBodyOverflow = "";

function materialName(id: string, fallback: string): string {
  return contentText(`material.${id}.name`, fallback);
}
function itemName(type: string, definitionId: string, fallback: string): string {
  return contentText(`${type}.${definitionId}.name`, fallback);
}
const filteredMaterials = computed(() =>
  (state.value?.materials ?? []).filter(
    (material) =>
      (familyFilter.value === "all" || material.craftingFamily === familyFilter.value) &&
      (rarityFilter.value === "all" || material.rarity === rarityFilter.value),
  ),
);
const selectedMaterial = computed(
  () => state.value?.materials.find((material) => material.id === selectedMaterialId.value) ?? null,
);
const filteredItems = computed(() =>
  (state.value?.items ?? []).filter(
    (item) =>
      (itemTypeFilter.value === "all" || item.type === itemTypeFilter.value) &&
      (itemRarityFilter.value === "all" || item.rarity === itemRarityFilter.value),
  ),
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
  )
    selectedMaterialId.value = "";
});
watchEffect(() => {
  if (selectedItemId.value && !filteredItems.value.some((item) => item.id === selectedItemId.value))
    selectedItemId.value = "";
});
function selectMaterial(materialId: string, event: MouseEvent): void {
  selectedMaterialId.value = materialId;
  transactionQuantity.value = 1;
  feedback.value = "";
  void openTransactionModal(event.currentTarget);
}
function selectItem(itemId: string, event: MouseEvent): void {
  selectedItemId.value = itemId;
  itemFeedback.value = "";
  void openTransactionModal(event.currentTarget);
}
function selectMarketAction(action: "buy" | "sell"): void {
  marketAction.value = action;
  transactionQuantity.value = 1;
  feedback.value = "";
}

async function openTransactionModal(trigger: EventTarget | null): Promise<void> {
  transactionTrigger = trigger instanceof HTMLElement ? trigger : null;
  previousBodyOverflow = document.body.style.overflow;
  document.body.style.overflow = "hidden";
  marketBackground = document.querySelector<HTMLElement>(".app-shell");
  marketBackgroundWasInert = marketBackground?.inert ?? false;
  if (marketBackground) marketBackground.inert = true;
  isTransactionModalOpen.value = true;
  await nextTick();
  transactionDialog.value?.focus();
}

function closeTransactionModal(): void {
  if (!isTransactionModalOpen.value) return;
  isTransactionModalOpen.value = false;
  document.body.style.overflow = previousBodyOverflow;
  if (marketBackground) marketBackground.inert = marketBackgroundWasInert;
  marketBackground = null;
  const trigger = transactionTrigger;
  transactionTrigger = null;
  nextTick(() => trigger?.focus());
}

function handleTransactionModalKeydown(event: KeyboardEvent): void {
  if (!isTransactionModalOpen.value) return;
  if (event.key === "Escape") {
    closeTransactionModal();
    return;
  }
  if (event.key !== "Tab" || !transactionDialog.value) return;
  const focusable = Array.from(
    transactionDialog.value.querySelectorAll<HTMLElement>(
      'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
    ),
  ).filter((element) => !element.hidden && element.getClientRects().length > 0);
  if (focusable.length === 0) {
    event.preventDefault();
    transactionDialog.value.focus();
    return;
  }
  const first = focusable[0];
  const last = focusable.at(-1);
  if (!event.shiftKey && document.activeElement === transactionDialog.value) {
    event.preventDefault();
    first?.focus();
  } else if (
    event.shiftKey &&
    (document.activeElement === first || document.activeElement === transactionDialog.value)
  ) {
    event.preventDefault();
    last?.focus();
  } else if (!event.shiftKey && document.activeElement === last) {
    event.preventDefault();
    first?.focus();
  }
}

onMounted(() => window.addEventListener("keydown", handleTransactionModalKeydown));
onBeforeUnmount(() => {
  window.removeEventListener("keydown", handleTransactionModalKeydown);
  if (isTransactionModalOpen.value) closeTransactionModal();
});

async function submitMarketTransaction(): Promise<void> {
  if (!selectedMaterial.value || !canTransact.value) return;
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
  if (!selectedItem.value?.canSell || selectedItem.value.sellPrice === null) return;
  const item = selectedItem.value;
  const localizedName = itemName(item.type, item.definitionId, item.label);
  if (
    !window.confirm(
      t("market.game.confirmItemSale", { item: localizedName, price: item.sellPrice }),
    )
  )
    return;
  processing.value = true;
  itemFeedback.value = "";
  try {
    state.value = await $fetch<GameMarketState>("/api/market/game", {
      method: "POST",
      body: { action: "sellItem", itemId: item.id, requestId: crypto.randomUUID() },
    });
    selectedItemId.value = "";
    itemFeedback.value = t("market.game.itemSold", { item: localizedName, price: item.sellPrice });
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
  return formatLocalizedDateTime(value, { dateStyle: "medium", timeStyle: "short" });
}
</script>
