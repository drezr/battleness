<template>
  <main class="shell profile-page">
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

    <p v-if="pending" class="panel">{{ t("profile.overview.loading") }}</p>
    <p v-else-if="error || !player || !settings || !history || !campaign" class="panel">
      {{ t("profile.overview.loadError") }}
    </p>

    <template v-else>
      <header class="profile-command-header">
        <div class="profile-identity">
          <span class="profile-avatar" aria-hidden="true">
            {{ profileInitials }}
          </span>
          <div>
            <span class="eyebrow">{{ t("profile.overview.playerIdentity") }}</span>
            <h1>{{ player.player.displayName }}</h1>
            <p>
              <span>@{{ settings.profile.username }}</span>
              <span class="profile-visibility">
                <Globe2 v-if="settings.profile.visibility === 'public'" :size="14" />
                <LockKeyhole v-else :size="14" />
                {{ t(`settings.profile.${settings.profile.visibility}`) }}
              </span>
            </p>
          </div>
        </div>
        <div class="profile-header-actions">
          <NuxtLink class="button-link secondary-button" to="/profile/settings">
            <Settings2 :size="17" aria-hidden="true" />
            {{ t("profile.overview.editProfile") }}
          </NuxtLink>
          <NuxtLink class="button-link" to="/battle">
            <Swords :size="17" aria-hidden="true" />
            {{ t("profile.overview.findBattle") }}
          </NuxtLink>
        </div>
      </header>

      <section class="profile-stat-strip" :aria-label="t('profile.overview.accountSummary')">
        <div>
          <span class="profile-stat-icon level"><Zap :size="19" /></span>
          <span
            ><small>{{ t("common.heroLevel") }}</small
            ><strong>{{ player.player.level }}</strong></span
          >
        </div>
        <div>
          <span class="profile-stat-icon victories"><Trophy :size="19" /></span>
          <span
            ><small>{{ t("battle.history.victories") }}</small
            ><strong>{{ winCount }}</strong></span
          >
        </div>
        <div>
          <span class="profile-stat-icon matches"><History :size="19" /></span>
          <span
            ><small>{{ t("battle.history.totalBattles") }}</small
            ><strong>{{ history.records.length }}</strong></span
          >
        </div>
        <div>
          <span class="profile-stat-icon collection"><Backpack :size="19" /></span>
          <span
            ><small>{{ t("common.items") }}</small
            ><strong>{{ player.inventory.length }}</strong></span
          >
        </div>
      </section>

      <section class="profile-dashboard-grid">
        <article class="profile-progress-panel">
          <div class="section-heading-row">
            <div>
              <span class="eyebrow">{{ t("profile.overview.progression") }}</span>
              <h2>{{ t("profile.overview.heroDevelopment") }}</h2>
            </div>
            <NuxtLink class="text-link" to="/profile/progression">
              {{ t("common.details") }} <ArrowRight :size="16" />
            </NuxtLink>
          </div>
          <ExperienceProgress
            :progress="player.player.progression"
            :label="t('progression.heroExperience')"
          />
          <dl class="profile-progress-metrics">
            <div>
              <dt>{{ t("common.campaign") }}</dt>
              <dd>{{ campaign.progress.completedCount }} / {{ campaign.progress.totalCount }}</dd>
            </div>
            <div>
              <dt>{{ t("progression.averageQuality") }}</dt>
              <dd>{{ averageQuality }}<small>/100</small></dd>
            </div>
            <div>
              <dt>{{ t("progression.highestItem") }}</dt>
              <dd>{{ t("common.level") }} {{ highestItemLevel }}</dd>
            </div>
          </dl>
        </article>

        <article class="profile-record-panel">
          <div class="section-heading-row">
            <div>
              <span class="eyebrow">{{ t("profile.overview.combatRecord") }}</span>
              <h2>{{ t("profile.overview.performance") }}</h2>
            </div>
            <strong class="profile-win-rate">{{ winRate }}%</strong>
          </div>
          <div class="profile-outcomes" :aria-label="t('profile.overview.outcomeBreakdown')">
            <div class="win">
              <span>{{ t("battle.outcome.win") }}</span
              ><strong>{{ winCount }}</strong>
            </div>
            <div class="draw">
              <span>{{ t("battle.outcome.draw") }}</span
              ><strong>{{ drawCount }}</strong>
            </div>
            <div class="loss">
              <span>{{ t("battle.outcome.loss") }}</span
              ><strong>{{ lossCount }}</strong>
            </div>
          </div>
          <NuxtLink class="button-link secondary-button profile-record-link" to="/battle/history">
            <History :size="16" /> {{ t("profile.overview.openBattleHistory") }}
          </NuxtLink>
        </article>
      </section>

      <section class="profile-activity-section">
        <div class="section-heading-row">
          <div>
            <span class="eyebrow">{{ t("profile.overview.activity") }}</span>
            <h2>{{ t("profile.overview.recentBattles") }}</h2>
          </div>
          <NuxtLink class="text-link" to="/profile/history">
            {{ t("navigation.history") }} <ArrowRight :size="16" />
          </NuxtLink>
        </div>

        <div v-if="recentRecords.length" class="profile-activity-list">
          <NuxtLink
            v-for="record in recentRecords"
            :key="record.id"
            :class="['profile-activity-row', `outcome-${record.outcome}`]"
            :to="`/battle/result/${record.id}`"
          >
            <span class="profile-outcome-icon">
              <Trophy v-if="record.outcome === 'win'" :size="18" />
              <Scale v-else-if="record.outcome === 'draw'" :size="18" />
              <ShieldX v-else :size="18" />
            </span>
            <span class="profile-activity-copy">
              <strong>{{ t(`battle.outcome.${record.outcome}`) }}</strong>
              <small>{{ t(`battle.mode.${record.mode.toLowerCase()}`, record.mode) }}</small>
            </span>
            <span class="profile-activity-metric">
              <small>{{ t("stats.turns") }}</small
              ><strong>{{ record.turnCount }}</strong>
            </span>
            <time :datetime="record.createdAt">{{ formatDate(record.createdAt) }}</time>
            <ChevronRight :size="18" aria-hidden="true" />
          </NuxtLink>
        </div>
        <div v-else class="profile-empty-activity">
          <Swords :size="26" />
          <strong>{{ t("battle.noCompleted") }}</strong>
          <NuxtLink class="button-link" to="/battle">{{
            t("profile.overview.findBattle")
          }}</NuxtLink>
        </div>
      </section>
    </template>
  </main>
</template>

<script setup lang="ts">
import {
  ArrowRight,
  Backpack,
  ChevronRight,
  Globe2,
  History,
  LockKeyhole,
  Scale,
  Settings2,
  ShieldX,
  Swords,
  Trophy,
  Zap,
} from "@lucide/vue";
import type {
  BattleHistoryState,
  CampaignState,
  PlayerState,
  ProfileSettingsState,
} from "~/utils/playerState";
import { sectionLinks } from "~/utils/viewData";

const route = useRoute();
const { locale, t } = useI18n();
const [playerRequest, settingsRequest, historyRequest, campaignRequest] = await Promise.all([
  useFetch<PlayerState>("/api/player"),
  useFetch<ProfileSettingsState>("/api/profile/settings", { key: "profile-overview-settings" }),
  useFetch<BattleHistoryState>("/api/battle/history", { key: "profile-overview-history" }),
  useFetch<CampaignState>("/api/campaign", { key: "profile-overview-campaign" }),
]);

const player = playerRequest.data;
const settings = settingsRequest.data;
const history = historyRequest.data;
const campaign = campaignRequest.data;
const pending = computed(
  () =>
    playerRequest.pending.value ||
    settingsRequest.pending.value ||
    historyRequest.pending.value ||
    campaignRequest.pending.value,
);
const error = computed(
  () =>
    playerRequest.error.value ||
    settingsRequest.error.value ||
    historyRequest.error.value ||
    campaignRequest.error.value,
);
const winCount = computed(
  () => history.value?.records.filter((record) => record.outcome === "win").length ?? 0,
);
const drawCount = computed(
  () => history.value?.records.filter((record) => record.outcome === "draw").length ?? 0,
);
const lossCount = computed(
  () => history.value?.records.filter((record) => record.outcome === "loss").length ?? 0,
);
const winRate = computed(() =>
  history.value?.records.length
    ? Math.round((winCount.value / history.value.records.length) * 100)
    : 0,
);
const recentRecords = computed(() => history.value?.records.slice(0, 4) ?? []);
const highestItemLevel = computed(() =>
  Math.max(0, ...(player.value?.inventory.map((item) => item.level) ?? [])),
);
const averageQuality = computed(() => {
  const items = player.value?.inventory ?? [];
  return items.length === 0
    ? 0
    : Math.round(items.reduce((total, item) => total + item.quality, 0) / items.length);
});
const profileInitials = computed(() =>
  (player.value?.player.displayName ?? "BN")
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join(""),
);

function formatDate(value: string): string {
  return new Intl.DateTimeFormat(locale.value, { dateStyle: "medium" }).format(new Date(value));
}
</script>
