<template>
  <div class="app-shell" :class="preferenceClasses">
    <header class="app-header">
      <div class="app-header-inner">
        <NuxtLink class="brand-row" to="/">
          <img class="brand-logo" src="/assets/brand/battleness-logo.png" :alt="t('app.brand')" />
          <span class="brand-title">
            <strong>{{ t("app.brand") }}</strong>
            <span>{{ $t("app.gameApp") }}</span>
          </span>
        </NuxtLink>

        <div class="player-strip" :aria-label="t('accessibility.playerSummary')">
          <div class="resource-chip">
            <span>{{ $t("common.player") }}</span>
            <strong>{{ state?.player.displayName ?? t("common.loading") }}</strong>
          </div>
          <div class="resource-chip">
            <span>{{ $t("common.credits") }}</span>
            <strong>{{ state?.player.credits ?? "-" }}</strong>
          </div>
          <div class="resource-chip">
            <span>{{ $t("common.level") }}</span>
            <strong>{{ playerLevel }}</strong>
          </div>
          <button class="session-button secondary-button" type="button" @click="signOut">
            {{ t("auth.signOut") }}
          </button>
        </div>
      </div>

      <nav class="main-nav" :aria-label="t('accessibility.mainNavigation')">
        <NuxtLink
          v-for="item in mainNavigation"
          :key="item.to"
          :class="{ active: isActive(item.to) }"
          :to="item.to"
        >
          {{ $t(item.labelKey) }}
        </NuxtLink>
      </nav>
    </header>

    <slot />
  </div>
</template>

<script setup lang="ts">
import type { PlayerState, ProfileSettingsState } from "~/utils/playerState";
import type { AuthSessionState } from "~/utils/authState";
import { mainNavigation } from "~/utils/viewData";

const route = useRoute();
const { locale, setLocale, t } = useI18n();
const { data: authState } = await useFetch<AuthSessionState>("/api/auth/session", {
  key: "auth-session",
});

if (authState.value && !authState.value.authenticated) {
  await navigateTo("/login");
}

const { data: state } = await useFetch<PlayerState>("/api/player", {
  key: "shell-player-state",
});
const { data: profileSettings } = await useFetch<ProfileSettingsState>("/api/profile/settings", {
  key: "profile-settings",
});

const playerLevel = computed(() => (state.value ? String(state.value.player.level) : "-"));
const preferenceClasses = computed(() => {
  const preferences = profileSettings.value?.preferences;
  return [
    `theme-${preferences?.theme ?? "system"}`,
    `density-${preferences?.interfaceDensity ?? "comfortable"}`,
    { "reduced-motion": preferences?.reducedMotion ?? false },
  ];
});

onMounted(() => {
  watch(
    () => profileSettings.value?.preferences.locale,
    async (preferredLocale) => {
      if (preferredLocale && preferredLocale !== locale.value) {
        await setLocale(preferredLocale);
      }
    },
    { immediate: true },
  );
});

function isActive(to: string): boolean {
  return route.path === to || (to !== "/" && route.path.startsWith(`${to}/`));
}

async function signOut(): Promise<void> {
  await $fetch("/api/auth/logout", { method: "POST" });
  await clearNuxtData();
  await navigateTo("/login");
}
</script>
