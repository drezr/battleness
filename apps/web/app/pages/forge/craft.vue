<template>
  <main class="shell forge-craft-page">
    <nav class="section-nav" :aria-label="t('accessibility.forgeNavigation')">
      <NuxtLink
        v-for="link in sectionLinks.forge"
        :key="link.to"
        :class="{ active: route.path === link.to }"
        :to="link.to"
      >
        {{ $t(link.labelKey) }}
      </NuxtLink>
    </nav>

    <header class="view-header forge-view-header">
      <div class="view-title">
        <span class="eyebrow">{{ t("forge.section") }}</span>
        <h1>{{ t("forge.craft.title") }}</h1>
        <p class="muted">{{ t("forge.craft.description") }}</p>
      </div>
      <NuxtLink class="button-link secondary-button" to="/inventory/materials">
        <PackageOpen :size="17" aria-hidden="true" />
        {{ t("forge.craft.viewMaterials") }}
        <ArrowRight :size="16" aria-hidden="true" />
      </NuxtLink>
    </header>

    <p v-if="pending" class="panel">{{ t("forge.craft.loading") }}</p>
    <p v-else-if="error" class="panel">{{ t("forge.craft.loadError") }}</p>

    <template v-else-if="state">
      <section class="forge-overview" :aria-label="t('forge.craft.summaryLabel')">
        <div class="forge-overview-title">
          <span><Hammer :size="24" aria-hidden="true" /></span>
          <div>
            <small>{{ t("forge.craft.workshop") }}</small
            ><strong>{{ t("forge.craft.productionReady") }}</strong>
          </div>
        </div>
        <dl>
          <div>
            <dt>{{ t("forge.craft.recipes") }}</dt>
            <dd>{{ state.recipes.length }}</dd>
          </div>
          <div>
            <dt>{{ t("forge.craft.craftable") }}</dt>
            <dd>{{ craftableRecipeCount }}</dd>
          </div>
          <div>
            <dt>{{ t("forge.craft.materialUnits") }}</dt>
            <dd>{{ materialUnitCount }}</dd>
          </div>
          <div>
            <dt>{{ t("forge.craft.createdItems") }}</dt>
            <dd>{{ state.inventory.length }}</dd>
          </div>
        </dl>
      </section>

      <p v-if="feedback" class="feedback">{{ feedback }}</p>

      <section class="detail-layout forge-detail-layout">
        <div class="stack forge-main-workspace">
          <section class="forge-craft-workspace">
            <aside class="recipe-catalogue">
              <div class="section-heading-row">
                <div>
                  <span class="eyebrow">{{ t("forge.craft.catalogue") }}</span>
                  <h2>{{ t("forge.craft.recipes") }}</h2>
                </div>
                <span class="pill muted-pill">{{ filteredRecipes.length }}</span>
              </div>
              <div class="forge-type-tabs" :aria-label="t('forge.craft.typeFilter')">
                <button
                  v-for="type in recipeTypes"
                  :key="type"
                  :class="{ active: recipeTypeFilter === type }"
                  type="button"
                  @click="recipeTypeFilter = type"
                >
                  {{ type === "all" ? t("common.all") : t(`itemType.${type}`) }}
                </button>
              </div>
              <div class="recipe-list">
                <button
                  v-for="recipe in filteredRecipes"
                  :key="recipe.id"
                  :class="[
                    'recipe-list-item',
                    `rarity-border-${recipe.outputRarity}`,
                    { active: selectedRecipeId === recipe.id },
                  ]"
                  type="button"
                  @click="selectedRecipeId = recipe.id"
                >
                  <ItemArtwork
                    :definition-id="recipe.outputDefinitionId"
                    :kind="recipe.outputType"
                  />
                  <span>
                    <strong>{{
                      itemName(recipe.outputType, recipe.outputDefinitionId, recipe.outputLabel)
                    }}</strong>
                    <small
                      >{{ t(`itemType.${recipe.outputType}`) }} ·
                      {{ t(`rarity.${recipe.outputRarity}`) }}</small
                    >
                  </span>
                  <CheckCircle2
                    v-if="recipe.canCraft"
                    :size="17"
                    class="recipe-ready"
                    aria-hidden="true"
                  />
                  <LockKeyhole v-else :size="16" class="recipe-blocked" aria-hidden="true" />
                </button>
              </div>
            </aside>

            <section v-if="selectedRecipe" class="craft-station">
              <div class="craft-station-heading">
                <div>
                  <span class="eyebrow">{{ t("forge.craft.selectedBlueprint") }}</span>
                  <h2>
                    {{
                      itemName(
                        selectedRecipe.outputType,
                        selectedRecipe.outputDefinitionId,
                        selectedRecipe.outputLabel,
                      )
                    }}
                  </h2>
                </div>
                <span :class="['pill', `element-${selectedRecipe.outputElement}`]">{{
                  t(`element.${selectedRecipe.outputElement}`)
                }}</span>
              </div>

              <div class="craft-blueprint">
                <div :class="['craft-output-art', `rarity-border-${selectedRecipe.outputRarity}`]">
                  <ItemArtwork
                    :definition-id="selectedRecipe.outputDefinitionId"
                    :kind="selectedRecipe.outputType"
                  />
                  <span>{{ t(`rarity.${selectedRecipe.outputRarity}`) }}</span>
                </div>
                <div class="craft-output-data">
                  <span class="forge-object-type"
                    ><Sparkles :size="15" /> {{ t(`itemType.${selectedRecipe.outputType}`) }}</span
                  >
                  <dl>
                    <div>
                      <dt>{{ t("common.level") }}</dt>
                      <dd>{{ selectedRecipe.craftedLevel }}</dd>
                    </div>
                    <div>
                      <dt>{{ t("common.quality") }}</dt>
                      <dd>{{ selectedRecipe.craftedQuality }}</dd>
                    </div>
                    <div>
                      <dt>{{ t("common.element") }}</dt>
                      <dd>{{ t(`element.${selectedRecipe.outputElement}`) }}</dd>
                    </div>
                  </dl>
                </div>
              </div>

              <div class="craft-ingredients-heading">
                <div>
                  <span class="eyebrow">{{ t("forge.craft.requirements") }}</span>
                  <h3>{{ t("forge.craft.materialsRequired") }}</h3>
                </div>
                <span :class="['forge-readiness', { ready: selectedRecipe.canCraft }]">
                  <Check v-if="selectedRecipe.canCraft" :size="15" aria-hidden="true" />
                  <AlertTriangle v-else :size="15" aria-hidden="true" />
                  {{
                    t(
                      selectedRecipe.canCraft
                        ? "forge.craft.ready"
                        : "forge.craft.missingMaterials",
                    )
                  }}
                </span>
              </div>
              <div class="craft-ingredient-grid">
                <article
                  v-for="ingredient in selectedRecipe.ingredients"
                  :key="ingredient.materialId"
                  :class="{ ready: ingredient.available >= ingredient.quantity }"
                >
                  <ItemArtwork :definition-id="ingredient.materialId" kind="material" />
                  <div>
                    <strong>{{
                      contentText(`material.${ingredient.materialId}.name`, ingredient.label)
                    }}</strong>
                    <small>{{
                      t("forge.craft.stockRequired", {
                        available: ingredient.available,
                        required: ingredient.quantity,
                      })
                    }}</small>
                  </div>
                  <Check
                    v-if="ingredient.available >= ingredient.quantity"
                    :size="17"
                    aria-hidden="true"
                  />
                  <X v-else :size="17" aria-hidden="true" />
                </article>
              </div>

              <button
                class="craft-primary-action"
                :disabled="!selectedRecipe.canCraft || crafting"
                type="button"
                @click="craftSelectedRecipe"
              >
                <Hammer :size="18" aria-hidden="true" />
                {{ t(crafting ? "forge.craft.crafting" : "forge.craft.action") }}
              </button>
            </section>
          </section>

          <section class="forge-recent-section">
            <div class="section-heading-row">
              <div>
                <span class="eyebrow">{{ t("forge.craft.productionLog") }}</span>
                <h2>{{ t("forge.craft.recentInventory") }}</h2>
              </div>
              <NuxtLink class="text-link" to="/inventory/items"
                >{{ t("forge.craft.openInventory") }} <ArrowRight :size="16"
              /></NuxtLink>
            </div>
            <div v-if="state.inventory.length === 0" class="forge-empty-state">
              <PackageOpen :size="27" aria-hidden="true" />
              <p>{{ t("forge.craft.emptyInventory") }}</p>
            </div>
            <div v-else class="forge-recent-grid">
              <button
                v-for="item in state.inventory.slice(0, 8)"
                :key="item.id"
                :class="[
                  `rarity-border-${item.rarity}`,
                  { selected: selectedDetailItem?.id === item.id },
                ]"
                type="button"
                @click="selectedDetailItemId = item.id"
              >
                <ItemArtwork :definition-id="item.definitionId" :kind="item.type" />
                <span
                  ><strong>{{ itemName(item.type, item.definitionId, item.label) }}</strong
                  ><small>{{
                    t("forge.craft.inventorySummary", {
                      type: t(`itemType.${item.type}`),
                      quality: item.quality,
                      experience: item.experience,
                    })
                  }}</small></span
                >
                <Eye :size="16" aria-hidden="true" />
              </button>
            </div>
          </section>
        </div>

        <ItemDetailPanel
          v-if="selectedDetailItem"
          :item="selectedDetailItem"
          :title="t('forge.craft.recentItemDetail')"
          @clear="selectedDetailItemId = ''"
        />
      </section>
    </template>
  </main>
</template>

<script setup lang="ts">
import {
  AlertTriangle,
  ArrowRight,
  Check,
  CheckCircle2,
  Eye,
  Hammer,
  LockKeyhole,
  PackageOpen,
  Sparkles,
  X,
} from "@lucide/vue";
import type { PlayerState } from "~/utils/playerState";
import { sectionLinks } from "~/utils/viewData";

const route = useRoute();
const { t } = useI18n();
const contentText = useContentText();
const { data: state, error, pending, refresh } = await useFetch<PlayerState>("/api/player");
const selectedRecipeId = ref("");
const recipeTypeFilter = ref("all");
const crafting = ref(false);
const feedback = ref("");
const selectedDetailItemId = ref("");

const recipeTypes = computed(() => [
  "all",
  ...new Set((state.value?.recipes ?? []).map((recipe) => recipe.outputType)),
]);
const filteredRecipes = computed(() =>
  (state.value?.recipes ?? []).filter(
    (recipe) => recipeTypeFilter.value === "all" || recipe.outputType === recipeTypeFilter.value,
  ),
);
const selectedRecipe = computed(() =>
  state.value?.recipes.find((recipe) => recipe.id === selectedRecipeId.value),
);
const selectedDetailItem = computed(
  () => state.value?.inventory.find((item) => item.id === selectedDetailItemId.value) ?? null,
);
const craftableRecipeCount = computed(
  () => (state.value?.recipes ?? []).filter((recipe) => recipe.canCraft).length,
);
const materialUnitCount = computed(() =>
  (state.value?.materials ?? []).reduce((total, material) => total + material.quantity, 0),
);

function itemName(type: string, definitionId: string, fallback: string): string {
  return contentText(`${type}.${definitionId}.name`, fallback);
}

watchEffect(() => {
  if (!selectedRecipeId.value && state.value?.recipes[0])
    selectedRecipeId.value = state.value.recipes[0].id;
  if (
    selectedRecipeId.value &&
    !filteredRecipes.value.some((recipe) => recipe.id === selectedRecipeId.value)
  ) {
    selectedRecipeId.value = filteredRecipes.value[0]?.id ?? "";
  }
});

async function craftSelectedRecipe(): Promise<void> {
  if (!selectedRecipe.value) return;
  crafting.value = true;
  feedback.value = "";
  try {
    const result = await $fetch<{ crafted: { id: string; label: string } }>("/api/forge/craft", {
      method: "POST",
      body: { recipeId: selectedRecipe.value.id },
    });
    feedback.value = t("forge.craft.success", { item: result.crafted.label });
    await refresh();
    selectedDetailItemId.value = result.crafted.id;
  } catch (craftError) {
    feedback.value =
      craftError instanceof Error ? craftError.message : t("forge.craft.actionError");
  } finally {
    crafting.value = false;
  }
}
</script>
