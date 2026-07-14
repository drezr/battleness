<template>
  <main class="auth-page">
    <section class="auth-panel">
      <img class="auth-logo" src="/assets/brand/battleness-logo.png" :alt="t('app.brand')" />
      <div>
        <span class="eyebrow">{{ t("auth.account") }}</span>
        <h1>{{ t("auth.title") }}</h1>
        <p class="muted">{{ t("auth.description") }}</p>
      </div>

      <p v-if="displayedError" class="settings-error">{{ displayedError }}</p>
      <div class="auth-actions">
        <a
          v-if="authState?.googleAuthEnabled"
          class="button-link google-auth-button"
          href="/api/auth/google?returnTo=%2F"
        >
          {{ t("auth.googleSignIn") }}
        </a>
        <div
          v-if="authState?.googleAuthEnabled && authState.developmentAuthEnabled"
          class="auth-separator"
        >
          <span>{{ t("auth.or") }}</span>
        </div>
        <button
          v-if="authState?.developmentAuthEnabled"
          type="button"
          :disabled="pending"
          @click="signInForDevelopment('devPlayer')"
        >
          {{ pending ? t("auth.signingIn") : t("auth.developmentPlayerOne") }}
        </button>
        <button
          v-if="authState?.developmentAuthEnabled"
          type="button"
          :disabled="pending"
          @click="signInForDevelopment('devPlayer2')"
        >
          {{ pending ? t("auth.signingIn") : t("auth.developmentPlayerTwo") }}
        </button>
        <p
          v-if="!authState?.googleAuthEnabled && !authState?.developmentAuthEnabled"
          class="panel muted"
        >
          {{ t("auth.providersPending") }}
        </p>
      </div>
    </section>
  </main>
</template>

<script setup lang="ts">
import type { AuthSessionState } from "~/utils/authState";

definePageMeta({ layout: false });

const { t } = useI18n();
const route = useRoute();
const pending = ref(false);
const errorMessage = ref("");
const { data: authState } = await useFetch<AuthSessionState>("/api/auth/session", {
  key: "login-auth-session",
});

if (authState.value?.authenticated) {
  await navigateTo("/");
}

const displayedError = computed(() => {
  if (errorMessage.value) {
    return errorMessage.value;
  }
  if (route.query.error === "google_denied") {
    return t("auth.googleDenied");
  }
  if (route.query.error === "google_failed") {
    return t("auth.googleFailed");
  }
  return "";
});

async function signInForDevelopment(playerId: "devPlayer" | "devPlayer2"): Promise<void> {
  pending.value = true;
  errorMessage.value = "";
  try {
    await $fetch("/api/auth/dev-login", { method: "POST", body: { playerId } });
    await clearNuxtData();
    await navigateTo("/");
  } catch {
    errorMessage.value = t("auth.signInError");
  } finally {
    pending.value = false;
  }
}
</script>
