<template>
  <main class="shell public-pvp-profile-page">
    <nav class="section-nav" :aria-label="t('accessibility.pvpNavigation')">
      <NuxtLink v-for="link in sectionLinks.pvp" :key="link.to" :to="link.to">
        {{ t(link.labelKey) }}
      </NuxtLink>
    </nav>

    <p v-if="pending" class="panel">{{ t("publicPvpProfile.loading") }}</p>
    <p v-else-if="error || !state" class="panel">{{ t("publicPvpProfile.notFound") }}</p>

    <template v-else>
      <section class="public-pvp-profile-hero">
        <div class="public-pvp-profile-avatar"><UserRound :size="34" /></div>
        <div>
          <span class="eyebrow">{{ t("publicPvpProfile.section") }}</span>
          <h1>{{ state.profile.displayName }}</h1>
          <p>{{ t("publicPvpProfile.description") }}</p>
        </div>
        <span v-if="state.profile.isCurrentPlayer" class="pill">
          {{ t("publicPvpProfile.you") }}
        </span>
        <NuxtLink class="button-link secondary-button" to="/battle/pvp/ranked">
          <ArrowLeft :size="16" /> {{ t("publicPvpProfile.backToRanked") }}
        </NuxtLink>
      </section>

      <section v-if="!state.season" class="panel public-pvp-profile-empty">
        <CalendarClock :size="24" />
        <div>
          <h2>{{ t("publicPvpProfile.noSeason") }}</h2>
          <p>{{ t("publicPvpProfile.noSeasonDescription") }}</p>
        </div>
      </section>

      <template v-else>
        <section class="public-pvp-season-line">
          <span>
            <Trophy :size="17" />
            <strong>{{ t("publicPvpProfile.currentSeason") }}</strong>
            {{ state.season.id }}
          </span>
          <span>
            {{ t("publicPvpProfile.seasonEnds", { date: formatDate(state.season.endsAt) }) }}
          </span>
        </section>

        <section v-if="!state.rating" class="panel public-pvp-profile-empty">
          <ShieldQuestion :size="24" />
          <div>
            <h2>{{ t("publicPvpProfile.noRating") }}</h2>
            <p>{{ t("publicPvpProfile.noRatingDescription") }}</p>
          </div>
        </section>

        <template v-else>
          <section class="public-pvp-rank-panel">
            <div class="public-pvp-rank-mark"><Shield :size="31" /></div>
            <div>
              <span class="eyebrow">{{ t("publicPvpProfile.currentRank") }}</span>
              <h2>{{ rankLabel(state.rating.standing) }}</h2>
              <p v-if="state.rating.value !== null">
                {{ t("publicPvpProfile.ratingValue", { rating: state.rating.value }) }}
              </p>
              <p v-else>
                {{
                  t("publicPvpProfile.placements", {
                    current: state.rating.placementMatches,
                    target: state.rating.placementTarget,
                  })
                }}
              </p>
            </div>
            <div class="public-pvp-peak">
              <span>{{ t("publicPvpProfile.peakRank") }}</span>
              <strong>{{ rankLabel(state.rating.peakStanding) }}</strong>
              <small v-if="state.rating.peakRating !== null">
                {{ t("publicPvpProfile.ratingValue", { rating: state.rating.peakRating }) }}
              </small>
            </div>
          </section>

          <section class="public-pvp-record-grid" :aria-label="t('publicPvpProfile.record')">
            <article>
              <Swords :size="20" />
              <span>{{ t("publicPvpProfile.matches") }}</span>
              <strong>{{ state.rating.matchCount }}</strong>
            </article>
            <article class="wins">
              <Trophy :size="20" />
              <span>{{ t("publicPvpProfile.wins") }}</span>
              <strong>{{ state.rating.wins }}</strong>
            </article>
            <article class="losses">
              <ShieldX :size="20" />
              <span>{{ t("publicPvpProfile.losses") }}</span>
              <strong>{{ state.rating.losses }}</strong>
            </article>
          </section>

          <p class="public-pvp-privacy-note">
            <LockKeyhole :size="15" /> {{ t("publicPvpProfile.privacyNote") }}
          </p>
        </template>
      </template>
    </template>
  </main>
</template>

<script setup lang="ts">
import {
  ArrowLeft,
  CalendarClock,
  LockKeyhole,
  Shield,
  ShieldQuestion,
  ShieldX,
  Swords,
  Trophy,
  UserRound,
} from "@lucide/vue";
import type { PublicPvpProfileState, PvpVisibleRank } from "~/utils/playerState";
import { sectionLinks } from "~/utils/viewData";

const route = useRoute();
const { locale, t } = useI18n();
const { formatDateTime: formatLocalizedDateTime } = useDateTimeFormatter();
const playerId = computed(() => String(route.params.playerId));
const {
  data: state,
  error,
  pending,
} = await useFetch<PublicPvpProfileState>(
  () => `/api/pvp/profile/${encodeURIComponent(playerId.value)}`,
  { key: `public-pvp-profile-${playerId.value}` },
);

function rankLabel(rank: PvpVisibleRank): string {
  if (!rank) {
    return t("publicPvpProfile.unranked");
  }
  const tier = t(`rankedMatch.tiers.${rank.tier}`);
  return rank.division ? t("rankedMatch.rankName", { tier, division: rank.division }) : tier;
}

function formatDate(value: string): string {
  return formatLocalizedDateTime(value, { dateStyle: "medium" });
}
</script>
