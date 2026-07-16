<template>
  <main class="shell pvp-hub-page">
    <nav class="section-nav" :aria-label="t('accessibility.pvpNavigation')">
      <NuxtLink
        v-for="link in sectionLinks.pvp"
        :key="link.to"
        :class="{ active: route.path === link.to }"
        :to="link.to"
      >
        {{ t(link.labelKey) }}
      </NuxtLink>
    </nav>

    <header class="view-header pvp-view-header">
      <div class="view-title">
        <span class="eyebrow">{{ t("pvpHub.eyebrow") }}</span>
        <h1>{{ t("pvpHub.title") }}</h1>
        <p class="muted">{{ t("pvpHub.description") }}</p>
      </div>
      <NuxtLink class="pvp-readiness-link" to="/inventory/loadouts">
        <ShieldCheck :size="18" />
        <span>
          <small>{{ t("pvpHub.loadoutLabel") }}</small>
          <strong>{{ t("pvpHub.loadoutAction") }}</strong>
        </span>
        <ChevronRight :size="17" />
      </NuxtLink>
    </header>

    <section class="pvp-mode-grid" :aria-label="t('pvpHub.modeSelection')">
      <article class="pvp-mode-tile private-mode-tile">
        <div class="pvp-mode-emblem"><KeyRound :size="26" /></div>
        <div class="pvp-mode-content">
          <span class="eyebrow">{{ t("pvpHub.private.kicker") }}</span>
          <h2>{{ t("privateMatch.title") }}</h2>
          <p>{{ t("pvpHub.private.description") }}</p>
        </div>
        <ul class="pvp-feature-list">
          <li><Users :size="15" /> {{ t("pvpHub.private.players") }}</li>
          <li><Link2 :size="15" /> {{ t("pvpHub.private.access") }}</li>
          <li><Shield :size="15" /> {{ t("pvpHub.private.impact") }}</li>
        </ul>
        <NuxtLink class="button-link pvp-mode-button" to="/battle/pvp/private">
          {{ t("pvpHub.private.action") }} <ArrowRight :size="17" />
        </NuxtLink>
      </article>

      <article class="pvp-mode-tile casual-mode-tile">
        <div class="pvp-mode-emblem"><Swords :size="26" /></div>
        <div class="pvp-mode-content">
          <span class="eyebrow">{{ t("pvpHub.casual.kicker") }}</span>
          <h2>{{ t("casualMatch.title") }}</h2>
          <p>{{ t("pvpHub.casual.description") }}</p>
        </div>
        <ul class="pvp-feature-list">
          <li><Search :size="15" /> {{ t("pvpHub.casual.players") }}</li>
          <li><Radio :size="15" /> {{ t("pvpHub.casual.access") }}</li>
          <li><Shield :size="15" /> {{ t("pvpHub.casual.impact") }}</li>
        </ul>
        <NuxtLink class="button-link pvp-mode-button primary" to="/battle/pvp/casual">
          {{ t("pvpHub.casual.action") }} <ArrowRight :size="17" />
        </NuxtLink>
      </article>

      <article class="pvp-mode-tile ranked-mode-tile">
        <div class="pvp-mode-emblem"><Trophy :size="26" /></div>
        <div class="pvp-mode-content">
          <span class="eyebrow">{{ t("pvpHub.ranked.kicker") }}</span>
          <h2>{{ t("rankedMatch.title") }}</h2>
          <p>{{ t("pvpHub.ranked.description") }}</p>
        </div>
        <ul class="pvp-feature-list">
          <li><Target :size="15" /> {{ t("pvpHub.ranked.players") }}</li>
          <li><Gauge :size="15" /> {{ t("pvpHub.ranked.access") }}</li>
          <li><TrendingUp :size="15" /> {{ t("pvpHub.ranked.impact") }}</li>
        </ul>
        <NuxtLink class="button-link pvp-mode-button" to="/battle/pvp/ranked">
          {{ t("pvpHub.ranked.action") }} <ArrowRight :size="17" />
        </NuxtLink>
      </article>
    </section>

    <section class="pvp-system-strip">
      <div>
        <Wifi :size="17" /><span>{{ t("pvpHub.authoritative") }}</span>
      </div>
      <div>
        <RefreshCw :size="17" /><span>{{ t("pvpHub.reconnect") }}</span>
      </div>
      <div>
        <LockKeyhole :size="17" /><span>{{ t("pvpHub.snapshot") }}</span>
      </div>
    </section>
  </main>
</template>

<script setup lang="ts">
import {
  ArrowRight,
  ChevronRight,
  Gauge,
  KeyRound,
  Link2,
  LockKeyhole,
  Radio,
  RefreshCw,
  Search,
  Shield,
  ShieldCheck,
  Swords,
  Target,
  TrendingUp,
  Trophy,
  Users,
  Wifi,
} from "@lucide/vue";
import { sectionLinks } from "~/utils/viewData";

const { t } = useI18n();
const route = useRoute();
</script>
