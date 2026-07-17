<template>
  <div class="app-shell" :class="preferenceClasses">
    <aside class="app-sidebar">
      <NuxtLink class="shell-brand" to="/" :aria-label="t('app.brand')">
        <img src="/assets/brand/battleness-icon.png" :alt="t('app.brand')" />
        <span>
          <strong>{{ t("app.brand") }}</strong>
          <small>{{ t("app.gameApp") }}</small>
        </span>
      </NuxtLink>

      <nav class="sidebar-nav" :aria-label="t('accessibility.mainNavigation')">
        <NuxtLink
          v-for="item in navigationItems"
          :key="item.to"
          :class="{ active: isActive(item.to) }"
          :to="item.to"
          :aria-current="isActive(item.to) ? 'page' : undefined"
        >
          <component :is="item.icon" :size="19" stroke-width="1.9" aria-hidden="true" />
          <span>{{ t(item.labelKey) }}</span>
        </NuxtLink>
      </nav>

      <div class="sidebar-account">
        <span class="player-avatar">{{ playerInitials }}</span>
        <span>
          <strong>{{ state?.player.displayName ?? t("common.loading") }}</strong>
          <small>{{ t("shell.levelValue", { level: playerLevel }) }}</small>
        </span>
        <button
          class="icon-button"
          type="button"
          :title="t('auth.signOut')"
          :aria-label="t('auth.signOut')"
          @click="signOut"
        >
          <LogOut :size="18" aria-hidden="true" />
        </button>
      </div>
    </aside>

    <div class="app-workspace">
      <header class="app-topbar">
        <div class="topbar-context">
          <span>{{ t("app.gameApp") }}</span>
          <strong>{{ currentSectionLabel }}</strong>
        </div>
        <div class="topbar-resources" :aria-label="t('accessibility.playerSummary')">
          <NuxtLink class="topbar-resource" to="/profile/progression">
            <Zap :size="17" aria-hidden="true" />
            <span>{{ t("common.level") }}</span>
            <strong>{{ playerLevel }}</strong>
          </NuxtLink>
          <NuxtLink class="topbar-resource credits" to="/market/game">
            <Coins :size="17" aria-hidden="true" />
            <span>{{ t("common.credits") }}</span>
            <strong>{{ formattedCredits }}</strong>
          </NuxtLink>
          <NuxtLink
            class="topbar-profile"
            to="/profile"
            :title="t('navigation.profile')"
            :aria-label="t('navigation.profile')"
          >
            {{ playerInitials }}
          </NuxtLink>
        </div>
      </header>

      <div class="app-content">
        <slot />
      </div>
    </div>

    <nav class="mobile-nav" :aria-label="t('accessibility.mainNavigation')">
      <NuxtLink
        v-for="item in navigationItems"
        :key="item.to"
        :class="{ active: isActive(item.to) }"
        :to="item.to"
        :aria-current="isActive(item.to) ? 'page' : undefined"
      >
        <component :is="item.icon" :size="19" stroke-width="2" aria-hidden="true" />
        <span>{{ t(item.labelKey) }}</span>
      </NuxtLink>
    </nav>
  </div>
</template>

<script setup lang="ts">
import { Anvil, Backpack, Coins, House, LogOut, Shield, Swords, UserRound, Zap } from "@lucide/vue";
import type { PlayerState, ProfileSettingsState } from "~/utils/playerState";
import type { AuthSessionState } from "~/utils/authState";
import { mainNavigation } from "~/utils/viewData";

const route = useRoute();
const { locale, setLocale, t } = useI18n();
const icons = [House, Swords, Anvil, Backpack, Coins, UserRound];
const navigationItems = mainNavigation.map((item, index) => ({
  ...item,
  icon: icons[index] ?? Shield,
}));

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
const formattedCredits = computed(() =>
  state.value ? new Intl.NumberFormat(locale.value).format(state.value.player.credits) : "-",
);
const playerInitials = computed(() => {
  const name = state.value?.player.displayName ?? "BN";
  return name
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join("");
});
const currentSectionLabel = computed(() => {
  const item = [...navigationItems].reverse().find((entry) => isActive(entry.to));
  return t(item?.labelKey ?? "navigation.home");
});
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
