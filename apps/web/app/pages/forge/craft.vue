<template>
  <main class="shell">
    <nav class="section-nav" aria-label="Forge navigation">
      <NuxtLink
        v-for="link in sectionLinks.forge"
        :key="link.to"
        :class="{ active: route.path === link.to }"
        :to="link.to"
      >
        {{ link.label }}
      </NuxtLink>
    </nav>

    <header class="view-header">
      <div class="view-title">
        <span class="eyebrow">Forge</span>
        <h1>Craft</h1>
        <p class="muted">Create rings, gems, monsters, and spells from recipe materials.</p>
      </div>
    </header>

    <p v-if="pending" class="panel">Loading forge state...</p>
    <p v-else-if="error" class="panel">Unable to load forge state.</p>

    <div v-else-if="state" class="split-layout">
      <section class="stack">
        <div class="panel">
          <h2>Recipe</h2>
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

          <article v-if="selectedRecipe" class="card item-card">
            <ItemArtwork
              :definition-id="selectedRecipe.outputDefinitionId"
              :kind="selectedRecipe.outputType"
            />
            <div class="item-card-body">
              <div class="card-heading">
                <h3>{{ selectedRecipe.outputLabel }}</h3>
                <span :class="['pill', `rarity-${selectedRecipe.outputRarity}`]">
                  {{ selectedRecipe.outputRarity }}
                </span>
              </div>
              <p class="muted">
                {{ selectedRecipe.outputElement }} {{ selectedRecipe.outputType }} - level
                {{ selectedRecipe.craftedLevel }} - quality {{ selectedRecipe.craftedQuality }}
              </p>
            </div>
            <dl class="ingredient-list">
              <div v-for="ingredient in selectedRecipe.ingredients" :key="ingredient.materialId">
                <dt class="ingredient-name">
                  <ItemArtwork :definition-id="ingredient.materialId" kind="material" />
                  <span>{{ ingredient.label }}</span>
                </dt>
                <dd :class="{ ready: ingredient.available >= ingredient.quantity }">
                  {{ ingredient.available }}/{{ ingredient.quantity }}
                </dd>
              </div>
            </dl>
          </article>

          <p v-if="feedback" class="feedback">{{ feedback }}</p>
        </div>
      </section>

      <section class="panel">
        <h2>Recent Inventory</h2>
        <p v-if="state.inventory.length === 0" class="muted">
          Craft an item to populate the persistent inventory.
        </p>
        <div v-else class="item-grid">
          <article
            v-for="item in state.inventory.slice(0, 8)"
            :key="item.id"
            :class="['card', 'item-card', `rarity-border-${item.rarity}`]"
          >
            <ItemArtwork :definition-id="item.definitionId" :kind="item.type" />
            <div class="item-card-body">
              <div class="card-heading">
                <h3>{{ item.label }}</h3>
                <span :class="['pill', `element-${item.element}`]">{{ item.element }}</span>
              </div>
              <p class="muted">
                {{ item.type }} - quality {{ item.quality }} - XP {{ item.experience }}
              </p>
              <code>{{ item.id }}</code>
            </div>
          </article>
        </div>
      </section>
    </div>
  </main>
</template>

<script setup lang="ts">
import type { PlayerState } from "~/utils/playerState";
import { sectionLinks } from "~/utils/viewData";

const route = useRoute();
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
