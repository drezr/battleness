<template>
  <main class="shell">
    <header class="view-header">
      <div class="view-title">
        <span class="eyebrow">Home</span>
        <h1>Dashboard</h1>
        <p class="muted">Player-facing entry point for BattleNess.</p>
      </div>
      <p class="status-note">Some sections are mockups until their backend workflows exist.</p>
    </header>

    <p v-if="pending" class="panel">Loading player state...</p>
    <p v-else-if="error" class="panel">Unable to load player state.</p>

    <template v-else-if="state">
      <dl class="metric-grid panel">
        <div class="stat">
          <dt>Hero Level</dt>
          <dd>{{ heroLevelFromExperience(state.player.experience) }}</dd>
        </div>
        <div class="stat">
          <dt>Credits</dt>
          <dd>{{ state.player.credits }}</dd>
        </div>
        <div class="stat">
          <dt>Items</dt>
          <dd>{{ state.inventory.length }}</dd>
        </div>
        <div class="stat">
          <dt>Materials</dt>
          <dd>{{ totalMaterialQuantity(state.materials) }}</dd>
        </div>
      </dl>

      <section class="dashboard-grid">
        <article class="panel">
          <h2>Battle</h2>
          <p class="muted">Campaign and PvP entry points with active loadout validation.</p>
          <div class="control-row">
            <NuxtLink class="button-link" to="/battle/campaign">Campaign</NuxtLink>
            <NuxtLink class="button-link" to="/battle/pvp">PvP</NuxtLink>
          </div>
        </article>

        <article class="panel">
          <h2>Forge</h2>
          <p class="muted">Crafting is connected to the local SQLite development inventory.</p>
          <div class="control-row">
            <NuxtLink class="button-link" to="/forge/craft">Craft</NuxtLink>
            <NuxtLink class="button-link" to="/forge/socket">Socket</NuxtLink>
            <NuxtLink class="button-link" to="/forge/quality">Quality</NuxtLink>
          </div>
        </article>

        <article class="panel">
          <h2>Inventory</h2>
          <p class="muted">
            {{ ringCount }} rings, {{ gemCount }} gems, {{ monsterCount }} monsters,
            {{ spellCount }} spells.
          </p>
          <div class="control-row">
            <NuxtLink class="button-link" to="/inventory/items">Items</NuxtLink>
            <NuxtLink class="button-link" to="/inventory/materials">Materials</NuxtLink>
            <NuxtLink class="button-link" to="/inventory/equipment">Equipment</NuxtLink>
          </div>
        </article>

        <article class="panel">
          <h2>Market</h2>
          <p class="muted">
            Material buying and selling are available. Player listings remain planned.
          </p>
          <div class="control-row">
            <NuxtLink class="button-link" to="/market/game">Game Market</NuxtLink>
            <NuxtLink class="button-link" to="/market/players">Player Market</NuxtLink>
          </div>
        </article>
      </section>
    </template>
  </main>
</template>

<script setup lang="ts">
import type { PlayerState } from "~/utils/playerState";
import {
  heroLevelFromExperience,
  inventoryCountByType,
  totalMaterialQuantity,
} from "~/utils/playerState";

const { data: state, error, pending } = await useFetch<PlayerState>("/api/player");

const ringCount = computed(() => inventoryCountByType(state.value?.inventory, "ring"));
const gemCount = computed(() => inventoryCountByType(state.value?.inventory, "gem"));
const monsterCount = computed(() => inventoryCountByType(state.value?.inventory, "monster"));
const spellCount = computed(() => inventoryCountByType(state.value?.inventory, "spell"));
</script>
