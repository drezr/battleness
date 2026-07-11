<template>
  <main class="shell">
    <header class="topbar">
      <div>
        <img class="brand-logo" src="/assets/brand/battleness-logo.png" alt="BattleNess" />
        <h1>Game App</h1>
        <p class="muted">Persistent inventory and forge scaffold.</p>
      </div>

      <section v-if="state" class="panel player-panel" aria-label="Player summary">
        <h2>{{ state.player.username }}</h2>
        <dl class="summary-grid">
          <div class="stat">
            <dt>Experience</dt>
            <dd>{{ state.player.experience }}</dd>
          </div>
          <div class="stat">
            <dt>Credits</dt>
            <dd>{{ state.player.credits }}</dd>
          </div>
        </dl>
      </section>
    </header>

    <p v-if="pending" class="panel">Loading...</p>
    <p v-else-if="error" class="panel">Unable to load player state.</p>

    <div v-else-if="state" class="layout">
      <section class="stack">
        <div class="panel">
          <h2>Forge</h2>
          <form class="toolbar" @submit.prevent="craftSelectedRecipe">
            <label>
              <span class="field-label">Recipe</span>
              <select v-model="selectedRecipeId">
                <option v-for="recipe in state.recipes" :key="recipe.id" :value="recipe.id">
                  {{ recipe.outputLabel }} - {{ recipe.outputType }}
                </option>
              </select>
            </label>
            <button :disabled="!selectedRecipe?.canCraft || crafting" type="submit">
              {{ crafting ? "Crafting" : "Craft" }}
            </button>
          </form>

          <article v-if="selectedRecipe" class="card recipe-card">
            <div class="card-heading">
              <h3>{{ selectedRecipe.outputLabel }}</h3>
              <span :class="['pill', `rarity-${selectedRecipe.outputRarity}`]">
                {{ selectedRecipe.outputRarity }}
              </span>
            </div>
            <p class="muted">
              {{ selectedRecipe.outputElement }} {{ selectedRecipe.outputType }} · level
              {{ selectedRecipe.craftedLevel }} · quality {{ selectedRecipe.craftedQuality }}
            </p>
            <dl class="ingredient-list">
              <div v-for="ingredient in selectedRecipe.ingredients" :key="ingredient.materialId">
                <dt>{{ ingredient.label }}</dt>
                <dd :class="{ ready: ingredient.available >= ingredient.quantity }">
                  {{ ingredient.available }}/{{ ingredient.quantity }}
                </dd>
              </div>
            </dl>
          </article>

          <p v-if="feedback" class="feedback">{{ feedback }}</p>
        </div>

        <div class="panel">
          <h2>Materials</h2>
          <div class="card-grid">
            <article
              v-for="material in state.materials"
              :key="material.id"
              :class="['card', `rarity-border-${material.rarity}`]"
            >
              <div class="card-heading">
                <h3>{{ material.label }}</h3>
                <span :class="['pill', `rarity-${material.rarity}`]">{{ material.rarity }}</span>
              </div>
              <p class="muted">
                {{ material.chemicalSymbol ?? material.realWorldType }} · {{ material.craftingFamily }}
              </p>
              <strong>{{ material.quantity }}</strong>
            </article>
          </div>
        </div>
      </section>

      <section class="panel">
        <h2>Inventory</h2>
        <p v-if="state.inventory.length === 0" class="muted">
          Craft an item to populate the persistent inventory.
        </p>
        <div v-else class="item-grid">
          <article
            v-for="item in state.inventory"
            :key="item.id"
            :class="['card', `rarity-border-${item.rarity}`]"
          >
            <div class="card-heading">
              <h3>{{ item.label }}</h3>
              <span :class="['pill', `element-${item.element}`]">{{ item.element }}</span>
            </div>
            <dl class="summary-grid">
              <div class="stat">
                <dt>Type</dt>
                <dd>{{ item.type }}</dd>
              </div>
              <div class="stat">
                <dt>Quality</dt>
                <dd>{{ item.quality }}</dd>
              </div>
              <div class="stat">
                <dt>XP</dt>
                <dd>{{ item.experience }}</dd>
              </div>
              <div v-if="item.socketCount" class="stat">
                <dt>Sockets</dt>
                <dd>{{ item.socketCount }}</dd>
              </div>
            </dl>
            <code>{{ item.id }}</code>
          </article>
        </div>
      </section>
    </div>
  </main>
</template>

<script setup lang="ts">
type PlayerState = {
  player: {
    id: string;
    username: string;
    experience: number;
    credits: number;
  };
  materials: MaterialView[];
  inventory: InventoryItemView[];
  recipes: RecipeView[];
};

type MaterialView = {
  id: string;
  label: string;
  description: string;
  rarity: string;
  craftingFamily: string;
  realWorldType: string;
  chemicalSymbol: string | null;
  atomicNumber: number | null;
  quantity: number;
};

type InventoryItemView = {
  id: string;
  type: string;
  definitionId: string;
  label: string;
  rarity: string;
  element: string;
  experience: number;
  quality: number;
  socketCount: number | null;
  equipped: boolean;
};

type RecipeView = {
  id: string;
  outputType: string;
  outputDefinitionId: string;
  outputLabel: string;
  outputRarity: string;
  outputElement: string;
  craftedLevel: number;
  craftedQuality: number;
  canCraft: boolean;
  ingredients: {
    materialId: string;
    label: string;
    quantity: number;
    available: number;
  }[];
};

const { data: state, error, pending, refresh } = await useFetch<PlayerState>("/api/player");
const selectedRecipeId = ref("");
const crafting = ref(false);
const feedback = ref("");

const selectedRecipe = computed(() =>
  state.value?.recipes.find((recipe) => recipe.id === selectedRecipeId.value),
);

watchEffect(() => {
  if (!selectedRecipeId.value && state.value?.recipes[0]) {
    selectedRecipeId.value = state.value.recipes[0].id;
  }
});

async function craftSelectedRecipe(): Promise<void> {
  if (!selectedRecipe.value) {
    return;
  }

  crafting.value = true;
  feedback.value = "";

  try {
    const result = await $fetch<{ crafted: { label: string } }>("/api/forge/craft", {
      method: "POST",
      body: { recipeId: selectedRecipe.value.id },
    });
    feedback.value = `${result.crafted.label} crafted.`;
    await refresh();
  } catch (craftError) {
    feedback.value = craftError instanceof Error ? craftError.message : "Crafting failed.";
  } finally {
    crafting.value = false;
  }
}
</script>
