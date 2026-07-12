<template>
  <div class="app-shell">
    <header class="app-header">
      <div class="app-header-inner">
        <NuxtLink class="brand-row" to="/">
          <img class="brand-logo" src="/assets/brand/battleness-logo.png" alt="BattleNess" />
          <span class="brand-title">
            <strong>BattleNess</strong>
            <span>Game App</span>
          </span>
        </NuxtLink>

        <div class="player-strip" aria-label="Player summary">
          <div class="resource-chip">
            <span>Player</span>
            <strong>{{ state?.player.username ?? "Loading" }}</strong>
          </div>
          <div class="resource-chip">
            <span>Credits</span>
            <strong>{{ state?.player.credits ?? "-" }}</strong>
          </div>
          <div class="resource-chip">
            <span>Level</span>
            <strong>{{ playerLevel }}</strong>
          </div>
        </div>
      </div>

      <nav class="main-nav" aria-label="Main navigation">
        <NuxtLink
          v-for="item in mainNavigation"
          :key="item.to"
          :class="{ active: isActive(item.to) }"
          :to="item.to"
        >
          {{ item.label }}
        </NuxtLink>
      </nav>
    </header>

    <slot />
  </div>
</template>

<script setup lang="ts">
import type { PlayerState } from "~/utils/playerState";
import { heroLevelFromExperience } from "~/utils/playerState";
import { mainNavigation } from "~/utils/viewData";

const route = useRoute();
const { data: state } = await useFetch<PlayerState>("/api/player");

const playerLevel = computed(() =>
  state.value ? String(heroLevelFromExperience(state.value.player.experience)) : "-",
);

function isActive(to: string): boolean {
  return route.path === to || (to !== "/" && route.path.startsWith(`${to}/`));
}
</script>
