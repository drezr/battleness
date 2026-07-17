<template>
  <main class="shell profile-settings-page">
    <nav class="section-nav" :aria-label="t('accessibility.profileNavigation')">
      <NuxtLink
        v-for="link in sectionLinks.profile"
        :key="link.to"
        :class="{ active: route.path === link.to }"
        :to="link.to"
      >
        {{ t(link.labelKey) }}
      </NuxtLink>
    </nav>

    <header class="view-header settings-header">
      <div class="view-title">
        <span class="eyebrow">{{ t("profile.section") }}</span>
        <h1>{{ t("settings.title") }}</h1>
        <p class="muted">{{ t("settings.description") }}</p>
      </div>
    </header>

    <p v-if="pending" class="panel">{{ t("settings.loading") }}</p>
    <p v-else-if="error || !state" class="panel">{{ t("settings.loadError") }}</p>

    <form v-else class="settings-workspace" @submit.prevent="saveSettings">
      <aside class="settings-account-summary">
        <span class="settings-avatar" aria-hidden="true">{{ profileInitials }}</span>
        <div>
          <span class="eyebrow">{{ t("settings.accountSummary") }}</span>
          <h2>{{ form.displayName }}</h2>
          <p>@{{ state.profile.username }}</p>
        </div>
        <dl>
          <div>
            <dt><UserRound :size="14" /> {{ t("settings.profile.visibility") }}</dt>
            <dd>{{ t(`settings.profile.${form.profileVisibility}`) }}</dd>
          </div>
          <div>
            <dt><CalendarDays :size="14" /> {{ t("settings.profile.createdAt") }}</dt>
            <dd>{{ formatDate(state.profile.createdAt) }}</dd>
          </div>
          <div>
            <dt><Activity :size="14" /> {{ t("settings.profile.lastActiveAt") }}</dt>
            <dd>{{ formatDate(state.profile.lastActiveAt) }}</dd>
          </div>
        </dl>
        <p class="settings-account-note">
          <ShieldCheck :size="16" /> {{ t("settings.accountManaged") }}
        </p>
      </aside>

      <div class="settings-preference-stack">
        <section class="settings-preference-section">
          <div class="settings-section-icon"><UserRound :size="20" /></div>
          <div class="settings-section-content">
            <div class="settings-section-heading">
              <div>
                <span class="eyebrow">{{ t("settings.profile.section") }}</span>
                <h2>{{ t("settings.profile.title") }}</h2>
              </div>
              <p class="muted">{{ t("settings.profile.description") }}</p>
            </div>
            <div class="settings-field-grid">
              <label>
                <span class="field-label">{{ t("settings.profile.displayName") }}</span>
                <input
                  v-model="form.displayName"
                  autocomplete="nickname"
                  minlength="2"
                  maxlength="32"
                  required
                />
              </label>
              <label>
                <span class="field-label">{{ t("settings.profile.visibility") }}</span>
                <select v-model="form.profileVisibility">
                  <option value="public">{{ t("settings.profile.public") }}</option>
                  <option value="private">{{ t("settings.profile.private") }}</option>
                </select>
              </label>
            </div>
          </div>
        </section>

        <section class="settings-preference-section">
          <div class="settings-section-icon"><Languages :size="20" /></div>
          <div class="settings-section-content">
            <div class="settings-section-heading">
              <div>
                <span class="eyebrow">{{ t("settings.language.section") }}</span>
                <h2>{{ t("settings.language.title") }}</h2>
              </div>
              <p class="muted">{{ t("settings.language.description") }}</p>
            </div>
            <label class="settings-narrow-field">
              <span class="field-label">{{ t("settings.language.label") }}</span>
              <select v-model="form.locale">
                <option v-for="entry in availableLocales" :key="entry.code" :value="entry.code">
                  {{ entry.name }}
                </option>
              </select>
            </label>
          </div>
        </section>

        <section class="settings-preference-section">
          <div class="settings-section-icon"><MonitorCog :size="20" /></div>
          <div class="settings-section-content">
            <div class="settings-section-heading">
              <div>
                <span class="eyebrow">{{ t("settings.appearance.section") }}</span>
                <h2>{{ t("settings.appearance.title") }}</h2>
              </div>
              <p class="muted">{{ t("settings.appearance.description") }}</p>
            </div>
            <div class="settings-field-grid">
              <fieldset>
                <legend class="field-label">{{ t("settings.appearance.theme") }}</legend>
                <div class="segmented-control settings-three-options">
                  <button
                    v-for="theme in themeOptions"
                    :key="theme"
                    type="button"
                    :class="{ active: form.theme === theme }"
                    :aria-pressed="form.theme === theme"
                    @click="form.theme = theme"
                  >
                    {{ t(`settings.appearance.${theme}`) }}
                  </button>
                </div>
              </fieldset>
              <fieldset>
                <legend class="field-label">{{ t("settings.appearance.density") }}</legend>
                <div class="segmented-control">
                  <button
                    v-for="density in densityOptions"
                    :key="density"
                    type="button"
                    :class="{ active: form.interfaceDensity === density }"
                    :aria-pressed="form.interfaceDensity === density"
                    @click="form.interfaceDensity = density"
                  >
                    {{ t(`settings.appearance.${density}`) }}
                  </button>
                </div>
              </fieldset>
            </div>
            <label class="settings-toggle-row">
              <input v-model="form.reducedMotion" type="checkbox" />
              <span
                ><strong>{{ t("settings.appearance.reducedMotion") }}</strong
                ><small>{{ t("settings.appearance.reducedMotionDescription") }}</small></span
              >
            </label>
          </div>
        </section>

        <section class="settings-preference-section">
          <div class="settings-section-icon"><Volume2 :size="20" /></div>
          <div class="settings-section-content">
            <div class="settings-section-heading">
              <div>
                <span class="eyebrow">{{ t("settings.audio.section") }}</span>
                <h2>{{ t("settings.audio.title") }}</h2>
              </div>
              <p class="muted">{{ t("settings.audio.description") }}</p>
            </div>
            <label class="settings-toggle-row settings-mute-toggle">
              <input v-model="form.muted" type="checkbox" />
              <span
                ><strong>{{ t("settings.audio.muted") }}</strong
                ><small>{{ t("settings.audio.mutedDescription") }}</small></span
              >
            </label>
            <div class="settings-slider-list" :class="{ disabled: form.muted }">
              <label v-for="volume in volumeOptions" :key="volume.field">
                <span class="settings-slider-label"
                  ><span>{{ t(volume.labelKey) }}</span
                  ><output>{{
                    t("settings.audio.percent", { value: form[volume.field] })
                  }}</output></span
                >
                <input
                  v-model.number="form[volume.field]"
                  type="range"
                  min="0"
                  max="100"
                  step="1"
                  :disabled="form.muted"
                />
              </label>
            </div>
          </div>
        </section>
      </div>

      <div class="settings-save-bar">
        <p v-if="saveMessage" class="positive" role="status">{{ saveMessage }}</p>
        <p v-else-if="saveError" class="settings-error" role="alert">{{ saveError }}</p>
        <span v-else />
        <button type="submit" :disabled="saving">
          <Save :size="17" aria-hidden="true" />
          {{ saving ? t("settings.saving") : t("settings.save") }}
        </button>
      </div>
    </form>
  </main>
</template>

<script setup lang="ts">
import {
  Activity,
  CalendarDays,
  Languages,
  MonitorCog,
  Save,
  ShieldCheck,
  UserRound,
  Volume2,
} from "@lucide/vue";
import type { ProfileSettingsState } from "~/utils/playerState";
import { sectionLinks } from "~/utils/viewData";

type SettingsForm = {
  displayName: string;
  profileVisibility: "public" | "private";
  locale: "en" | "fr";
  theme: "system" | "dark" | "light";
  reducedMotion: boolean;
  interfaceDensity: "comfortable" | "compact";
  muted: boolean;
  masterVolume: number;
  musicVolume: number;
  effectsVolume: number;
};

const route = useRoute();
const { locale, locales, setLocale, t } = useI18n();
const {
  data: state,
  error,
  pending,
} = await useFetch<ProfileSettingsState>("/api/profile/settings", { key: "profile-settings" });
const saving = ref(false);
const saveMessage = ref("");
const saveError = ref("");
const themeOptions = ["system", "dark", "light"] as const;
const densityOptions = ["comfortable", "compact"] as const;
const volumeOptions = [
  { field: "masterVolume", labelKey: "settings.audio.master" },
  { field: "musicVolume", labelKey: "settings.audio.music" },
  { field: "effectsVolume", labelKey: "settings.audio.effects" },
] as const;
const form = reactive<SettingsForm>({
  displayName: "",
  profileVisibility: "public",
  locale: "en",
  theme: "system",
  reducedMotion: false,
  interfaceDensity: "comfortable",
  muted: false,
  masterVolume: 100,
  musicVolume: 70,
  effectsVolume: 80,
});
const availableLocales = computed(() =>
  locales.value.map((entry) =>
    typeof entry === "string"
      ? { code: entry, name: entry }
      : { code: entry.code, name: entry.name },
  ),
);
const profileInitials = computed(() =>
  (form.displayName || "BN")
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join(""),
);

watch(
  state,
  (value) => {
    if (!value) {
      return;
    }
    Object.assign(form, {
      displayName: value.profile.displayName,
      profileVisibility: value.profile.visibility,
      locale: value.preferences.locale,
      theme: value.preferences.theme,
      reducedMotion: value.preferences.reducedMotion,
      interfaceDensity: value.preferences.interfaceDensity,
      muted: value.preferences.muted,
      masterVolume: value.preferences.masterVolume,
      musicVolume: value.preferences.musicVolume,
      effectsVolume: value.preferences.effectsVolume,
    });
  },
  { immediate: true },
);

async function saveSettings(): Promise<void> {
  saving.value = true;
  saveMessage.value = "";
  saveError.value = "";
  try {
    const response = await $fetch<ProfileSettingsState>("/api/profile/settings", {
      method: "POST",
      body: form,
    });
    state.value = response;
    if (locale.value !== response.preferences.locale) {
      await setLocale(response.preferences.locale);
    }
    await refreshNuxtData("shell-player-state");
    saveMessage.value = t("settings.saveSuccess");
  } catch {
    saveError.value = t("settings.saveError");
  } finally {
    saving.value = false;
  }
}

function formatDate(value: string): string {
  return new Date(value).toLocaleString(locale.value);
}
</script>
