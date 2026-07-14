<template>
  <main class="shell">
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

    <header class="view-header">
      <div class="view-title">
        <span class="eyebrow">{{ t("battle.section") }}</span>
        <h1>{{ t("battle.campaign.title") }}</h1>
        <p class="muted">{{ t("battle.campaign.description") }}</p>
      </div>
      <p :class="['status-note', campaign?.player.activeLoadoutId ? 'ready-note' : '']">
        {{
          campaign?.player.activeLoadoutId
            ? t("battle.hub.loadoutReady")
            : t("battle.hub.selectActiveLoadout")
        }}
      </p>
    </header>

    <p v-if="pending" class="panel">{{ t("battle.campaign.loading") }}</p>
    <p v-else-if="error" class="panel">{{ t("battle.campaign.loadError") }}</p>

    <template v-else-if="campaign">
      <section class="metric-grid equipment-metrics">
        <article class="card">
          <span class="eyebrow">{{ t("battle.campaign.progress") }}</span>
          <strong
            >{{ campaign.progress.completedCount }} / {{ campaign.progress.totalCount }}</strong
          >
        </article>
        <article class="card">
          <span class="eyebrow">{{ t("battle.campaign.unlocked") }}</span>
          <strong>{{ campaign.progress.unlockedCount }}</strong>
        </article>
        <article class="card">
          <span class="eyebrow">{{ t("common.heroLevel") }}</span>
          <strong>{{ campaign.player.level }}</strong>
        </article>
      </section>

      <section class="campaign-layout">
        <section class="panel campaign-track">
          <h2>{{ t("battle.campaign.opponents") }}</h2>
          <button
            v-for="opponent in campaign.opponents"
            :key="opponent.id"
            :class="[
              'campaign-opponent-card',
              `campaign-opponent-${opponent.status}`,
              { selected: selectedOpponent?.id === opponent.id },
            ]"
            type="button"
            @click="selectedOpponentId = opponent.id"
          >
            <span :class="['campaign-order', `element-${opponent.element}`]">
              {{ opponent.order }}
            </span>
            <span class="campaign-opponent-copy">
              <strong>{{ contentText(`campaign.${opponent.id}.name`, opponent.label) }}</strong>
              <small>{{
                t("battle.campaign.recommendedLevel", { level: opponent.recommendedLevel })
              }}</small>
            </span>
            <span class="pill muted-pill">{{
              t(`battle.campaign.status.${opponent.status}`)
            }}</span>
          </button>
        </section>

        <section v-if="selectedOpponent" class="panel campaign-detail">
          <div class="card-heading">
            <div>
              <span class="eyebrow">{{
                t("battle.campaign.opponentNumber", { number: selectedOpponent.order })
              }}</span>
              <h2>
                {{ contentText(`campaign.${selectedOpponent.id}.name`, selectedOpponent.label) }}
              </h2>
            </div>
            <span :class="['pill', `element-${selectedOpponent.element}`]">
              {{ t(`element.${selectedOpponent.element}`) }}
            </span>
          </div>
          <p class="muted">
            {{
              contentText(
                `campaign.${selectedOpponent.id}.description`,
                selectedOpponent.description,
              )
            }}
          </p>

          <dl class="summary-grid">
            <div class="stat">
              <dt>{{ t("battle.campaign.opponentLevel") }}</dt>
              <dd>{{ selectedOpponent.opponentLevel }}</dd>
            </div>
            <div class="stat">
              <dt>{{ t("battle.campaign.recommended") }}</dt>
              <dd>{{ selectedOpponent.recommendedLevel }}</dd>
            </div>
            <div class="stat">
              <dt>{{ t("battle.campaign.repeatable") }}</dt>
              <dd>{{ t(selectedOpponent.repeatable ? "common.yes" : "common.no") }}</dd>
            </div>
            <div class="stat">
              <dt>{{ t("battle.campaign.victories") }}</dt>
              <dd>{{ selectedOpponent.victoryCount }}</dd>
            </div>
            <div class="stat">
              <dt>{{ t("battle.campaign.unlock") }}</dt>
              <dd>
                {{
                  selectedOpponent.prerequisite
                    ? contentText(
                        `campaign.${selectedOpponent.prerequisite.id}.name`,
                        selectedOpponent.prerequisite.label,
                      )
                    : t("battle.campaign.available")
                }}
              </dd>
            </div>
          </dl>

          <section v-if="selectedOpponent.loadoutVisibility !== 'hidden'" class="campaign-section">
            <div class="card-heading">
              <h3>{{ t("battle.campaign.knownLoadout") }}</h3>
              <span class="pill muted-pill">{{
                t("battle.campaign.ringCount", { count: selectedOpponent.rings.length })
              }}</span>
            </div>
            <div v-if="selectedOpponent.loadoutVisibility === 'full'" class="campaign-ring-grid">
              <article
                v-for="ring in selectedOpponent.rings"
                :key="ring.definitionId"
                :class="['card', `rarity-border-${ring.rarity}`]"
              >
                <div class="item-detail-hero">
                  <ItemArtwork :definition-id="ring.definitionId" kind="ring" />
                  <div>
                    <strong>{{ contentText(`ring.${ring.definitionId}.name`, ring.label) }}</strong>
                    <small>{{
                      t("battle.campaign.levelQuality", {
                        level: ring.level,
                        quality: ring.quality,
                      })
                    }}</small>
                  </div>
                </div>
                <ul class="detail-list">
                  <li v-for="gem in ring.gems" :key="gem.definitionId">
                    <ItemArtwork :definition-id="gem.definitionId" kind="gem" />
                    <span>
                      <strong>{{ contentText(`gem.${gem.definitionId}.name`, gem.label) }}</strong>
                      <small v-if="gem.enchantment">
                        {{ gem.enchantment.type }}:
                        {{
                          contentText(
                            `${gem.enchantment.type}.${gem.enchantment.definitionId}.name`,
                            gem.enchantment.label,
                          )
                        }}
                      </small>
                    </span>
                  </li>
                </ul>
              </article>
            </div>
          </section>

          <section class="campaign-reward-grid">
            <CampaignRewardPreview
              :title="t('battle.campaign.firstClear')"
              :reward="selectedOpponent.firstClearReward"
            />
            <CampaignRewardPreview
              :title="t('battle.campaign.repeatVictory')"
              :reward="selectedOpponent.repeatVictoryReward"
            />
          </section>

          <div class="control-row">
            <button
              v-if="campaign.player.activeLoadoutId"
              :disabled="selectedOpponent.status === 'locked' || creatingBattle"
              type="button"
              @click="startCampaignBattle"
            >
              {{ t(creatingBattle ? "battle.campaign.starting" : "battle.campaign.start") }}
            </button>
            <NuxtLink v-else class="button-link" to="/inventory/loadouts">{{
              t("battle.campaign.selectLoadout")
            }}</NuxtLink>
          </div>
          <p v-if="battleFeedback" class="status-note">{{ battleFeedback }}</p>
        </section>
      </section>
    </template>
  </main>
</template>

<script setup lang="ts">
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

async function startCampaignBattle(): Promise<void> {
  if (!selectedOpponent.value || selectedOpponent.value.status === "locked") {
    return;
  }

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
