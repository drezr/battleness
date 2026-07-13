<template>
  <main class="shell">
    <nav class="section-nav" aria-label="Market navigation">
      <NuxtLink
        v-for="link in sectionLinks.market"
        :key="link.to"
        :class="{ active: route.path === link.to }"
        :to="link.to"
      >
        {{ link.label }}
      </NuxtLink>
    </nav>

    <header class="view-header">
      <div class="view-title">
        <span class="eyebrow">Market</span>
        <h1>Game Market</h1>
        <p class="muted">Buy and sell crafting materials through the fixed game economy.</p>
      </div>
      <p v-if="state" class="status-note">Credits: {{ state.player.credits }}</p>
    </header>

    <p v-if="pending" class="panel">Loading game market...</p>
    <p v-else-if="error" class="panel">Unable to load game market.</p>

    <template v-else-if="state">
      <div class="filter-bar">
        <label>
          <span class="field-label">Crafting Family</span>
          <select v-model="familyFilter">
            <option value="all">All</option>
            <option value="ring">Ring</option>
            <option value="gem">Gem</option>
            <option value="monster">Monster</option>
            <option value="spell">Spell</option>
          </select>
        </label>
        <label>
          <span class="field-label">Rarity</span>
          <select v-model="rarityFilter">
            <option value="all">All</option>
            <option value="common">Common</option>
            <option value="refined">Refined</option>
            <option value="rare">Rare</option>
            <option value="epic">Epic</option>
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
                <h3>{{ material.label }}</h3>
                <span :class="['pill', `rarity-${material.rarity}`]">
                  {{ material.rarity }}
                </span>
              </div>
              <p class="muted">
                {{ material.chemicalSymbol ?? material.realWorldType }} -
                {{ material.craftingFamily }}
              </p>
              <dl class="summary-grid item-detail-grid">
                <div class="stat">
                  <dt>Owned</dt>
                  <dd>{{ material.quantity }}</dd>
                </div>
                <div class="stat">
                  <dt>Buy</dt>
                  <dd>{{ material.buyPrice }}</dd>
                </div>
                <div class="stat">
                  <dt>Sell</dt>
                  <dd>{{ material.sellPrice }}</dd>
                </div>
              </dl>
              <div class="control-row">
                <button class="secondary-button" type="button" @click="selectMaterial(material.id)">
                  Inspect
                </button>
              </div>
            </div>
          </article>
        </div>

        <div class="stack market-detail-column">
          <ItemDetailPanel
            :item="selectedMaterial"
            title="Material Detail"
            @clear="selectedMaterialId = ''"
          />

          <section class="panel">
            <div class="card-heading">
              <div>
                <span class="eyebrow">Transaction</span>
                <h2>{{ marketAction === "buy" ? "Buy Material" : "Sell Material" }}</h2>
              </div>
              <span v-if="selectedMaterial" class="pill muted-pill">
                {{ transactionUnitPrice }} each
              </span>
            </div>

            <div class="segmented-control" role="group" aria-label="Market action">
              <button
                :class="{ active: marketAction === 'buy' }"
                type="button"
                @click="selectMarketAction('buy')"
              >
                Buy
              </button>
              <button
                :class="{ active: marketAction === 'sell' }"
                type="button"
                @click="selectMarketAction('sell')"
              >
                Sell
              </button>
            </div>

            <p v-if="!selectedMaterial" class="muted">
              Select a material to prepare a transaction.
            </p>

            <div v-else class="stack">
              <label>
                <span class="field-label">Quantity</span>
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
                  <dt>{{ marketAction === "buy" ? "Total Cost" : "Credits Earned" }}</dt>
                  <dd>{{ transactionTotal }}</dd>
                </div>
                <div class="stat">
                  <dt>Credits After</dt>
                  <dd :class="{ positive: canTransact }">{{ creditsAfterTransaction }}</dd>
                </div>
                <div v-if="marketAction === 'sell'" class="stat">
                  <dt>Stock After</dt>
                  <dd>{{ stockAfterTransaction }}</dd>
                </div>
              </dl>
              <button
                :disabled="processing || !canTransact"
                type="button"
                @click="submitMarketTransaction"
              >
                {{ processing ? "Processing" : marketAction === "buy" ? "Buy" : "Sell" }}
              </button>
              <small v-if="validQuantity && marketAction === 'buy' && !canAfford">
                Not enough credits.
              </small>
              <small v-if="validQuantity && marketAction === 'sell' && !hasEnoughStock">
                Not enough material stock.
              </small>
            </div>

            <p v-if="feedback" class="feedback">{{ feedback }}</p>
          </section>

          <section class="panel">
            <div class="card-heading">
              <div>
                <span class="eyebrow">History</span>
                <h2>Recent Transactions</h2>
              </div>
              <span class="pill muted-pill">{{ state.transactions.length }}</span>
            </div>
            <p v-if="state.transactions.length === 0" class="muted">No market activity yet.</p>
            <ul v-else class="clean-list market-history">
              <li v-for="transaction in state.transactions" :key="transaction.id">
                <div>
                  <strong>{{ transaction.action }} {{ transaction.resourceLabel }}</strong>
                  <small>
                    {{ transaction.quantity }} at {{ transaction.unitPrice }} each -
                    {{ formatTransactionDate(transaction.createdAt) }}
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
  </main>
</template>

<script setup lang="ts">
import type { GameMarketState } from "~/utils/playerState";
import { sectionLinks } from "~/utils/viewData";

const route = useRoute();
const { data: state, error, pending } = await useFetch<GameMarketState>("/api/market/game");
const familyFilter = ref("all");
const rarityFilter = ref("all");
const selectedMaterialId = ref("");
const marketAction = ref<"buy" | "sell">("buy");
const transactionQuantity = ref(1);
const processing = ref(false);
const feedback = ref("");

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

function selectMaterial(materialId: string): void {
  selectedMaterialId.value = materialId;
  transactionQuantity.value = 1;
  feedback.value = "";
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
    feedback.value = `${quantity} ${materialLabel} ${action === "buy" ? "purchased" : "sold"}.`;
    await refreshNuxtData();
  } catch (transactionError) {
    feedback.value =
      transactionError instanceof Error ? transactionError.message : "Market transaction failed.";
  } finally {
    processing.value = false;
  }
}

function formatTransactionDate(value: string): string {
  return new Date(value).toLocaleString();
}
</script>
