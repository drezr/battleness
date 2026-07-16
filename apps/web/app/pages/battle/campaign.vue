<template>
  <main class="shell campaign-page">
    <nav class="section-nav" :aria-label="t('accessibility.battleNavigation')">
      <NuxtLink
        v-for="link in sectionLinks.battle"
        :key="link.to"
        :class="{ active: route.path === link.to }"
        :to="link.to"
      >
        {{ $t(link.labelKey) }}
      </NuxtLink>
    </nav>

    <header class="view-header campaign-header">
      <div class="view-title">
        <span class="eyebrow">{{ t("battle.section") }}</span>
        <h1>{{ t("battle.campaign.title") }}</h1>
        <p class="muted">{{ t("battle.campaign.description") }}</p>
      </div>
      <NuxtLink
        :class="['battle-readiness', campaign?.player.activeLoadoutId ? 'ready' : 'blocked']"
        to="/inventory/loadouts"
      >
        <span class="readiness-icon">
          <Check v-if="campaign?.player.activeLoadoutId" :size="18" aria-hidden="true" />
          <AlertTriangle v-else :size="18" aria-hidden="true" />
        </span>
        <span>
          <small>{{ t("battle.hub.readiness") }}</small>
          <strong>{{
            campaign?.player.activeLoadoutId
              ? t("battle.hub.loadoutReady")
              : t("battle.hub.selectActiveLoadout")
          }}</strong>
        </span>
        <ChevronRight :size="17" aria-hidden="true" />
      </NuxtLink>
    </header>

    <p v-if="pending" class="panel">{{ t("battle.campaign.loading") }}</p>
    <p v-else-if="error" class="panel">{{ t("battle.campaign.loadError") }}</p>

    <template v-else-if="campaign">
      <section class="campaign-progress-strip">
        <div class="campaign-progress-copy">
          <span class="campaign-progress-icon"><Map :size="22" aria-hidden="true" /></span>
          <span>
            <small>{{ t("battle.campaign.progress") }}</small>
            <strong>{{
              t("battle.campaign.completedProgress", {
                completed: campaign.progress.completedCount,
                total: campaign.progress.totalCount,
              })
            }}</strong>
          </span>
        </div>
        <div class="campaign-progress-bar" aria-hidden="true">
          <i :style="{ width: `${campaignProgressPercent}%` }" />
        </div>
        <dl>
          <div>
            <dt>{{ t("battle.campaign.unlocked") }}</dt>
            <dd>{{ campaign.progress.unlockedCount }}</dd>
          </div>
          <div>
            <dt>{{ t("common.heroLevel") }}</dt>
            <dd>{{ campaign.player.level }}</dd>
          </div>
        </dl>
      </section>

      <section class="campaign-workspace">
        <aside class="campaign-path">
          <div class="campaign-path-heading">
            <span class="eyebrow">{{ t("battle.campaign.journey") }}</span>
            <h2>{{ t("battle.campaign.opponents") }}</h2>
          </div>
          <div class="campaign-path-list">
            <button
              v-for="opponent in campaign.opponents"
              :key="opponent.id"
              :class="[
                'campaign-path-node',
                `campaign-opponent-${opponent.status}`,
                { selected: selectedOpponent?.id === opponent.id },
              ]"
              type="button"
              @click="selectedOpponentId = opponent.id"
            >
              <span :class="['campaign-node-order', `element-${opponent.element}`]">
                <component :is="statusIcon(opponent.status)" :size="17" aria-hidden="true" />
              </span>
              <span class="campaign-opponent-copy">
                <strong>{{ contentText(`campaign.${opponent.id}.name`, opponent.label) }}</strong>
                <small>{{
                  t("battle.campaign.recommendedLevel", { level: opponent.recommendedLevel })
                }}</small>
              </span>
              <span :class="['campaign-node-status', opponent.status]">
                {{ t(`battle.campaign.status.${opponent.status}`) }}
              </span>
            </button>
          </div>
        </aside>

        <section v-if="selectedOpponent" class="campaign-encounter">
          <header class="campaign-encounter-hero">
            <div class="campaign-element-emblem" :class="`element-${selectedOpponent.element}`">
              <component
                :is="elementIcon(selectedOpponent.element)"
                :size="48"
                aria-hidden="true"
              />
            </div>
            <div class="campaign-encounter-title">
              <span class="eyebrow">{{
                t("battle.campaign.opponentNumber", { number: selectedOpponent.order })
              }}</span>
              <h2>
                {{ contentText(`campaign.${selectedOpponent.id}.name`, selectedOpponent.label) }}
              </h2>
              <p>
                {{
                  contentText(
                    `campaign.${selectedOpponent.id}.description`,
                    selectedOpponent.description,
                  )
                }}
              </p>
            </div>
            <div class="campaign-threat-level">
              <small>{{ t("battle.campaign.threatLevel") }}</small>
              <strong>{{ selectedOpponent.opponentLevel }}</strong>
              <span :class="['pill', `element-${selectedOpponent.element}`]">
                {{ t(`element.${selectedOpponent.element}`) }}
              </span>
            </div>
          </header>

          <section class="campaign-readiness-grid">
            <article :class="['campaign-readiness-card', levelReadiness]">
              <span><UserRound :size="19" aria-hidden="true" /></span>
              <div>
                <small>{{ t("battle.campaign.yourLevel") }}</small>
                <strong>{{ campaign.player.level }}</strong>
              </div>
              <p>{{ levelReadinessText }}</p>
            </article>
            <article class="campaign-readiness-card">
              <span><Target :size="19" aria-hidden="true" /></span>
              <div>
                <small>{{ t("battle.campaign.recommended") }}</small>
                <strong>{{ selectedOpponent.recommendedLevel }}</strong>
              </div>
              <p>
                {{ t("battle.campaign.victoryCount", { count: selectedOpponent.victoryCount }) }}
              </p>
            </article>
            <article class="campaign-readiness-card">
              <span><RotateCcw :size="19" aria-hidden="true" /></span>
              <div>
                <small>{{ t("battle.campaign.repeatable") }}</small>
                <strong>{{ t(selectedOpponent.repeatable ? "common.yes" : "common.no") }}</strong>
              </div>
              <p>{{ prerequisiteText }}</p>
            </article>
          </section>

          <section class="campaign-rewards-section">
            <div class="section-heading-row">
              <div>
                <span class="eyebrow">{{ t("battle.rewards") }}</span>
                <h3>{{ t("battle.campaign.rewardPreview") }}</h3>
              </div>
            </div>
            <div class="campaign-reward-grid">
              <CampaignRewardPreview
                :title="t('battle.campaign.firstClear')"
                :reward="selectedOpponent.firstClearReward"
              />
              <CampaignRewardPreview
                :title="t('battle.campaign.repeatVictory')"
                :reward="selectedOpponent.repeatVictoryReward"
              />
            </div>
          </section>

          <details v-if="selectedOpponent.loadoutVisibility !== 'hidden'" class="campaign-intel">
            <summary>
              <span><ScanSearch :size="18" aria-hidden="true" /></span>
              <strong>{{ t("battle.campaign.knownLoadout") }}</strong>
              <small>{{
                t("battle.campaign.ringCount", { count: selectedOpponent.rings.length })
              }}</small>
            </summary>
            <div v-if="selectedOpponent.loadoutVisibility === 'full'" class="campaign-ring-grid">
              <article
                v-for="ring in selectedOpponent.rings"
                :key="ring.definitionId"
                :class="['campaign-intel-ring', `rarity-border-${ring.rarity}`]"
              >
                <ItemArtwork :definition-id="ring.definitionId" kind="ring" />
                <div>
                  <strong>{{ contentText(`ring.${ring.definitionId}.name`, ring.label) }}</strong>
                  <small>{{
                    t("battle.campaign.levelQuality", {
                      level: ring.level,
                      quality: ring.quality,
                    })
                  }}</small>
                  <span>{{ t("battle.campaign.gemCount", { count: ring.gems.length }) }}</span>
                </div>
              </article>
            </div>
          </details>

          <footer class="campaign-encounter-actions">
            <div>
              <Lock v-if="selectedOpponent.status === 'locked'" :size="18" aria-hidden="true" />
              <CheckCircle2 v-else :size="18" aria-hidden="true" />
              <span>{{ encounterAvailability }}</span>
            </div>
            <button
              v-if="campaign.player.activeLoadoutId"
              :disabled="selectedOpponent.status === 'locked' || creatingBattle"
              type="button"
              @click="startCampaignBattle"
            >
              <Swords :size="18" aria-hidden="true" />
              {{ t(creatingBattle ? "battle.campaign.starting" : "battle.campaign.start") }}
            </button>
            <NuxtLink v-else class="button-link" to="/inventory/loadouts">
              {{ t("battle.campaign.selectLoadout") }}
            </NuxtLink>
          </footer>
          <p v-if="battleFeedback" class="status-note">{{ battleFeedback }}</p>
        </section>
      </section>
    </template>
  </main>
</template>

<script setup lang="ts">
import {
  AlertTriangle,
  Check,
  CheckCircle2,
  ChevronRight,
  Flame,
  Lock,
  Map,
  RotateCcw,
  ScanSearch,
  Snowflake,
  Swords,
  Target,
  UserRound,
  Zap,
} from "@lucide/vue";
import type { CampaignState } from "~/utils/playerState";
import { sectionLinks } from "~/utils/viewData";

const route = useRoute();
const { t } = useI18n();
const contentText = useContentText();
const { data: campaign, error, pending } = await useFetch<CampaignState>("/api/campaign");
const selectedOpponentId = ref("");
const creatingBattle = ref(false);
const battleFeedback = ref("");
const selectedOpponent = computed(
  () =>
    campaign.value?.opponents.find((opponent) => opponent.id === selectedOpponentId.value) ??
    campaign.value?.opponents[0] ??
    null,
);
const campaignProgressPercent = computed(() => {
  if (!campaign.value?.progress.totalCount) return 0;
  return Math.round(
    (campaign.value.progress.completedCount / campaign.value.progress.totalCount) * 100,
  );
});
const levelReadiness = computed(() => {
  if (!selectedOpponent.value || !campaign.value) return "neutral";
  return campaign.value.player.level >= selectedOpponent.value.recommendedLevel
    ? "ready"
    : "warning";
});
const levelReadinessText = computed(() =>
  t(
    levelReadiness.value === "ready"
      ? "battle.campaign.levelReady"
      : "battle.campaign.levelWarning",
  ),
);
const prerequisiteText = computed(() => {
  if (!selectedOpponent.value?.prerequisite) return t("battle.campaign.available");
  return t("battle.campaign.requiresVictory", {
    opponent: contentText(
      `campaign.${selectedOpponent.value.prerequisite.id}.name`,
      selectedOpponent.value.prerequisite.label,
    ),
  });
});
const encounterAvailability = computed(() => {
  if (!selectedOpponent.value) return "";
  if (selectedOpponent.value.status === "locked") return prerequisiteText.value;
  if (!campaign.value?.player.activeLoadoutId) return t("battle.hub.selectActiveLoadout");
  return t("battle.campaign.readyToFight");
});

function statusIcon(status: string) {
  if (status === "completed") return Check;
  if (status === "locked") return Lock;
  return Swords;
}

function elementIcon(element: string) {
  if (element === "fire") return Flame;
  if (element === "ice") return Snowflake;
  return Zap;
}

async function startCampaignBattle(): Promise<void> {
  if (!selectedOpponent.value || selectedOpponent.value.status === "locked") return;
  creatingBattle.value = true;
  battleFeedback.value = "";
  try {
    const battle = await $fetch<{ id: string }>("/api/battle/campaign/start", {
      method: "POST",
      body: {
        opponentId: selectedOpponent.value.id,
        requestId: crypto.randomUUID(),
      },
    });
    await navigateTo(`/battle/live/${battle.id}`);
  } catch (error_) {
    battleFeedback.value =
      error_ instanceof Error ? error_.message : t("battle.campaign.creationError");
  } finally {
    creatingBattle.value = false;
  }
}
</script>
