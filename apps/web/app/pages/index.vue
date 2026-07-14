<template>
  <main class="shell">
    <header class="view-header">
      <div class="view-title">
        <span class="eyebrow">{{ t("home.section") }}</span>
        <h1>{{ t("home.title") }}</h1>
        <p class="muted">{{ t("home.description") }}</p>
      </div>
      <p class="status-note">{{ t("home.mockNotice") }}</p>
    </header>

    <p v-if="pending" class="panel">{{ t("home.loading") }}</p>
    <p v-else-if="error" class="panel">{{ t("home.loadError") }}</p>

    <template v-else-if="state">
      <dl class="metric-grid panel">
        <div class="stat">
          <dt>{{ t("common.heroLevel") }}</dt>
          <dd>{{ state.player.level }}</dd>
        </div>
        <div class="stat">
          <dt>{{ t("common.credits") }}</dt>
          <dd>{{ state.player.credits }}</dd>
        </div>
        <div class="stat">
          <dt>{{ t("common.items") }}</dt>
          <dd>{{ state.inventory.length }}</dd>
        </div>
        <div class="stat">
          <dt>{{ t("common.materials") }}</dt>
          <dd>{{ totalMaterialQuantity(state.materials) }}</dd>
        </div>
      </dl>

      <section class="dashboard-grid">
        <article class="panel">
          <h2>{{ t("navigation.battle") }}</h2>
          <p class="muted">{{ t("home.battleDescription") }}</p>
          <div class="control-row">
            <NuxtLink class="button-link" to="/battle/campaign">{{
              t("navigation.campaign")
            }}</NuxtLink>
            <NuxtLink class="button-link" to="/battle/pvp">{{ t("navigation.pvp") }}</NuxtLink>
          </div>
        </article>

        <article class="panel">
          <h2>{{ t("navigation.forge") }}</h2>
          <p class="muted">{{ t("home.forgeDescription") }}</p>
          <div class="control-row">
            <NuxtLink class="button-link" to="/forge/craft">{{ t("navigation.craft") }}</NuxtLink>
            <NuxtLink class="button-link" to="/forge/socket">{{ t("navigation.socket") }}</NuxtLink>
            <NuxtLink class="button-link" to="/forge/quality">{{
              t("navigation.quality")
            }}</NuxtLink>
          </div>
        </article>

        <article class="panel">
          <h2>{{ t("navigation.inventory") }}</h2>
          <p class="muted">
            {{
              t("home.inventoryDescription", {
                rings: ringCount,
                gems: gemCount,
                monsters: monsterCount,
                spells: spellCount,
              })
            }}
          </p>
          <div class="control-row">
            <NuxtLink class="button-link" to="/inventory/items">{{
              t("navigation.items")
            }}</NuxtLink>
            <NuxtLink class="button-link" to="/inventory/materials">{{
              t("navigation.materials")
            }}</NuxtLink>
            <NuxtLink class="button-link" to="/inventory/equipment">{{
              t("navigation.equipment")
            }}</NuxtLink>
          </div>
        </article>

        <article class="panel">
          <h2>{{ t("navigation.market") }}</h2>
          <p class="muted">{{ t("home.marketDescription") }}</p>
          <div class="control-row">
            <NuxtLink class="button-link" to="/market/game">{{
              t("navigation.gameMarket")
            }}</NuxtLink>
            <NuxtLink class="button-link" to="/market/players">{{
              t("navigation.playerMarket")
            }}</NuxtLink>
          </div>
        </article>
      </section>
    </template>
  </main>
</template>

<script setup lang="ts">
import type { PlayerState } from "~/utils/playerState";
import { inventoryCountByType, totalMaterialQuantity } from "~/utils/playerState";

const { data: state, error, pending } = await useFetch<PlayerState>("/api/player");
const { t } = useI18n();

const ringCount = computed(() => inventoryCountByType(state.value?.inventory, "ring"));
const gemCount = computed(() => inventoryCountByType(state.value?.inventory, "gem"));
const monsterCount = computed(() => inventoryCountByType(state.value?.inventory, "monster"));
const spellCount = computed(() => inventoryCountByType(state.value?.inventory, "spell"));
</script>
