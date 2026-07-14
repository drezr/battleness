<template>
  <main class="shell">
    <nav class="section-nav" :aria-label="t('accessibility.inventoryNavigation')">
      <NuxtLink
        v-for="link in sectionLinks.inventory"
        :key="link.to"
        :class="{ active: route.path === link.to }"
        :to="link.to"
      >
        {{ $t(link.labelKey) }}
      </NuxtLink>
    </nav>

    <header class="view-header">
      <div class="view-title">
        <span class="eyebrow">{{ t("inventory.section") }}</span>
        <h1>{{ t("inventory.loadouts.title") }}</h1>
        <p class="muted">{{ t("inventory.loadouts.description") }}</p>
      </div>
    </header>

    <p v-if="pending" class="panel">{{ t("inventory.loadouts.loading") }}</p>
    <p v-else-if="error" class="panel">{{ t("inventory.loadouts.loadError") }}</p>

    <template v-else-if="loadouts">
      <section class="detail-layout">
        <div class="stack">
          <section class="panel">
            <div class="card-heading">
              <div>
                <h2>{{ t("inventory.loadouts.currentEquipment") }}</h2>
                <p class="muted">{{ t("inventory.loadouts.currentDescription") }}</p>
              </div>
              <span class="pill muted-pill">
                {{ loadouts.currentEquipment.rings.length }} / {{ loadouts.maxLoadoutRings }}
              </span>
            </div>

            <section class="metric-grid equipment-metrics">
              <article class="card">
                <span class="eyebrow">{{ t("stats.speed") }}</span>
                <strong>{{ loadouts.currentEquipment.summary.totalSpeed }}</strong>
              </article>
              <article class="card">
                <span class="eyebrow">{{ t("stats.damage") }}</span>
                <strong>{{ loadouts.currentEquipment.summary.totalDamage }}</strong>
              </article>
              <article class="card">
                <span class="eyebrow">{{ t("battle.hub.averageEnergy") }}</span>
                <strong>{{ loadouts.currentEquipment.summary.averageEnergyCost }}</strong>
              </article>
              <article class="card">
                <span class="eyebrow">{{ t("battle.hub.averageCooldown") }}</span>
                <strong>{{ loadouts.currentEquipment.summary.averageCooldown }}</strong>
              </article>
            </section>

            <div v-if="loadouts.currentEquipment.rings.length > 0" class="loadout-ring-strip">
              <article
                v-for="ring in loadouts.currentEquipment.rings"
                :key="ring.id"
                :class="[
                  'mini-ring-card',
                  `rarity-border-${ring.rarity}`,
                  { selected: selectedDetailRing?.id === ring.id },
                ]"
              >
                <ItemArtwork :definition-id="ring.definitionId" kind="ring" />
                <div>
                  <strong>{{ (ring.slotIndex ?? 0) + 1 }}. {{ ringName(ring) }}</strong>
                  <small>
                    {{
                      t("inventory.loadouts.ringSummary", {
                        element: t(`element.${ring.element}`),
                        damage: ring.damage,
                        cooldown: ring.cooldown,
                      })
                    }}
                  </small>
                  <button class="secondary-button" @click="selectedDetailRingId = ring.id">
                    {{ t("common.inspect") }}
                  </button>
                </div>
              </article>
            </div>

            <form class="toolbar" @submit.prevent="saveFromEquipped">
              <label>
                <span class="field-label">{{ t("inventory.loadouts.name") }}</span>
                <input
                  v-model="loadoutName"
                  :placeholder="t('inventory.loadouts.namePlaceholder')"
                />
              </label>
              <button :disabled="updating || loadouts.currentEquipment.rings.length === 0">
                {{ t("inventory.loadouts.saveCurrent") }}
              </button>
            </form>
          </section>

          <p v-if="feedback" class="feedback">{{ feedback }}</p>
          <p v-if="actionError" class="status-note">{{ actionError }}</p>

          <section class="panel">
            <h2>{{ t("inventory.loadouts.savedLoadouts") }}</h2>
            <p v-if="loadouts.loadouts.length === 0" class="muted">
              {{ t("inventory.loadouts.noneSaved") }}
            </p>

            <div v-else class="loadout-list">
              <article
                v-for="loadout in loadouts.loadouts"
                :key="loadout.id"
                :class="['card', 'loadout-card', { active: loadout.active }]"
              >
                <div class="card-heading">
                  <div>
                    <h3>{{ loadout.name }}</h3>
                    <p class="muted">
                      {{ t("battle.campaign.ringCount", { count: loadout.ringCount }) }}
                    </p>
                  </div>
                  <span :class="['pill', loadout.active ? 'element-electric' : 'muted-pill']">
                    {{
                      t(loadout.active ? "inventory.loadouts.active" : "inventory.loadouts.saved")
                    }}
                  </span>
                </div>

                <dl class="summary-grid">
                  <div class="stat">
                    <dt>{{ t("stats.speed") }}</dt>
                    <dd>{{ loadout.summary.totalSpeed }}</dd>
                  </div>
                  <div class="stat">
                    <dt>{{ t("stats.damage") }}</dt>
                    <dd>{{ loadout.summary.totalDamage }}</dd>
                  </div>
                  <div class="stat">
                    <dt>{{ t("stats.energy") }}</dt>
                    <dd>{{ loadout.summary.averageEnergyCost }}</dd>
                  </div>
                  <div class="stat">
                    <dt>{{ t("stats.cooldown") }}</dt>
                    <dd>{{ loadout.summary.averageCooldown }}</dd>
                  </div>
                </dl>

                <div class="loadout-ring-strip">
                  <article
                    v-for="ring in loadout.rings"
                    :key="ring.id"
                    :class="[
                      'mini-ring-card',
                      `rarity-border-${ring.rarity}`,
                      { selected: selectedDetailRing?.id === ring.id },
                    ]"
                  >
                    <ItemArtwork :definition-id="ring.definitionId" kind="ring" />
                    <div>
                      <strong>{{ (ring.slotIndex ?? 0) + 1 }}. {{ ringName(ring) }}</strong>
                      <small>
                        {{
                          t("inventory.loadouts.ringSummary", {
                            element: t(`element.${ring.element}`),
                            damage: ring.damage,
                            cooldown: ring.cooldown,
                          })
                        }}
                      </small>
                      <button class="secondary-button" @click="selectedDetailRingId = ring.id">
                        {{ t("common.inspect") }}
                      </button>
                    </div>
                  </article>
                </div>

                <div class="control-row">
                  <button v-if="!loadout.active" :disabled="updating" @click="activate(loadout.id)">
                    {{ t("inventory.loadouts.activate") }}
                  </button>
                  <button
                    class="secondary-button"
                    :disabled="updating"
                    @click="deleteLoadout(loadout.id)"
                  >
                    {{ t("inventory.loadouts.delete") }}
                  </button>
                </div>
                <code>{{ loadout.id }}</code>
              </article>
            </div>
          </section>
        </div>

        <ItemDetailPanel
          :item="selectedDetailRing"
          :title="t('inventory.loadouts.ringDetail')"
          @clear="selectedDetailRingId = ''"
        />
      </section>
    </template>
  </main>
</template>

<script setup lang="ts">
import type { LoadoutState } from "~/utils/playerState";
import { sectionLinks } from "~/utils/viewData";

const route = useRoute();
const { t } = useI18n();
const contentText = useContentText();
const feedback = ref("");
const actionError = ref("");
const updating = ref(false);
const loadoutName = ref(t("inventory.loadouts.defaultName"));
const selectedDetailRingId = ref("");
const {
  data: loadouts,
  error,
  pending,
  refresh,
} = await useFetch<LoadoutState>("/api/inventory/loadouts");

const selectedDetailRing = computed(() => {
  const currentRings = loadouts.value?.currentEquipment.rings ?? [];
  const savedRings = (loadouts.value?.loadouts ?? []).flatMap((loadout) => loadout.rings);

  return (
    [...currentRings, ...savedRings].find((ring) => ring.id === selectedDetailRingId.value) ?? null
  );
});

function ringName(ring: { definitionId: string; label: string }): string {
  return contentText(`ring.${ring.definitionId}.name`, ring.label);
}

async function saveFromEquipped() {
  await updateLoadouts({
    action: "saveFromEquipped",
    name: loadoutName.value,
  });
  feedback.value = t("inventory.loadouts.savedSuccess");
}

async function activate(loadoutId: string) {
  await updateLoadouts({
    action: "activate",
    loadoutId,
  });
  feedback.value = t("inventory.loadouts.activatedSuccess");
}

async function deleteLoadout(loadoutId: string) {
  await updateLoadouts({
    action: "delete",
    loadoutId,
  });
  feedback.value = t("inventory.loadouts.deletedSuccess");
}

async function updateLoadouts(body: { action: string; loadoutId?: string; name?: string }) {
  feedback.value = "";
  actionError.value = "";
  updating.value = true;

  try {
    loadouts.value = await $fetch<LoadoutState>("/api/inventory/loadouts", {
      method: "POST",
      body,
    });
    await refresh();
  } catch (error_) {
    actionError.value =
      error_ instanceof Error ? error_.message : t("inventory.loadouts.actionError");
  } finally {
    updating.value = false;
  }
}
</script>
