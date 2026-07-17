<template>
  <main class="shell loadouts-page">
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

    <header class="view-header loadouts-header">
      <div class="view-title">
        <span class="eyebrow">{{ t("inventory.section") }}</span>
        <h1>{{ t("inventory.loadouts.title") }}</h1>
        <p class="muted">{{ t("inventory.loadouts.description") }}</p>
      </div>
      <NuxtLink class="button-link secondary-button" to="/inventory/equipment">
        <Shield :size="17" aria-hidden="true" />
        {{ t("inventory.loadouts.editEquipment") }}
        <ArrowRight :size="16" aria-hidden="true" />
      </NuxtLink>
    </header>

    <p v-if="pending" class="panel">{{ t("inventory.loadouts.loading") }}</p>
    <p v-else-if="error" class="panel">{{ t("inventory.loadouts.loadError") }}</p>

    <template v-else-if="loadouts">
      <p v-if="feedback" class="feedback">{{ feedback }}</p>
      <p v-if="actionError" class="status-note">{{ actionError }}</p>

      <section class="detail-layout loadouts-detail-layout">
        <div class="stack loadouts-workspace">
          <section class="loadout-builder">
            <div class="loadout-builder-heading">
              <span class="loadout-builder-icon"><Wrench :size="23" aria-hidden="true" /></span>
              <div>
                <span class="eyebrow">{{ t("inventory.loadouts.builder") }}</span>
                <h2>{{ t("inventory.loadouts.currentEquipment") }}</h2>
                <p>{{ t("inventory.loadouts.currentDescription") }}</p>
              </div>
              <span class="pill muted-pill">
                {{ loadouts.currentEquipment.rings.length }} / {{ loadouts.maxLoadoutRings }}
              </span>
            </div>

            <dl class="loadout-builder-metrics">
              <div>
                <dt><Sword :size="14" /> {{ t("stats.damage") }}</dt>
                <dd>{{ loadouts.currentEquipment.summary.totalDamage }}</dd>
              </div>
              <div>
                <dt><Gauge :size="14" /> {{ t("stats.speed") }}</dt>
                <dd>{{ loadouts.currentEquipment.summary.totalSpeed }}</dd>
              </div>
              <div>
                <dt><Zap :size="14" /> {{ t("stats.energy") }}</dt>
                <dd>{{ loadouts.currentEquipment.summary.averageEnergyCost }}</dd>
              </div>
              <div>
                <dt><Timer :size="14" /> {{ t("stats.cooldown") }}</dt>
                <dd>{{ loadouts.currentEquipment.summary.averageCooldown }}</dd>
              </div>
            </dl>

            <div v-if="loadouts.currentEquipment.rings.length > 0" class="loadout-ring-dock">
              <button
                v-for="ring in loadouts.currentEquipment.rings"
                :key="ring.id"
                :class="[
                  'loadout-dock-ring',
                  `rarity-border-${ring.rarity}`,
                  { selected: selectedDetailRing?.id === ring.id },
                ]"
                type="button"
                :aria-label="
                  t('common.inspectItem', {
                    item: ringName(ring),
                  })
                "
                @click="selectedDetailRingId = ring.id"
              >
                <span class="loadout-ring-slot">{{ (ring.slotIndex ?? 0) + 1 }}</span>
                <ItemArtwork :definition-id="ring.definitionId" kind="ring" />
                <span>
                  <strong>{{ ringName(ring) }}</strong>
                  <small>{{
                    t("inventory.loadouts.compactRingSummary", {
                      damage: ring.damage,
                      cooldown: ring.cooldown,
                    })
                  }}</small>
                </span>
              </button>
            </div>
            <div v-else class="loadout-builder-empty">
              <ShieldAlert :size="25" aria-hidden="true" />
              <span>{{ t("inventory.loadouts.noCurrentRings") }}</span>
              <NuxtLink class="text-link" to="/inventory/equipment">{{
                t("inventory.loadouts.editEquipment")
              }}</NuxtLink>
            </div>

            <form class="loadout-save-bar" @submit.prevent="saveFromEquipped">
              <label>
                <span class="field-label">{{ t("inventory.loadouts.name") }}</span>
                <input
                  v-model="loadoutName"
                  :placeholder="t('inventory.loadouts.namePlaceholder')"
                />
              </label>
              <button :disabled="updating || loadouts.currentEquipment.rings.length === 0">
                <Save :size="17" aria-hidden="true" /> {{ t("inventory.loadouts.saveCurrent") }}
              </button>
            </form>
          </section>

          <section class="loadouts-saved-section">
            <div class="section-heading-row">
              <div>
                <span class="eyebrow">{{ t("inventory.loadouts.collection") }}</span>
                <h2>{{ t("inventory.loadouts.savedLoadouts") }}</h2>
              </div>
              <span class="pill muted-pill">{{ loadouts.loadouts.length }}</span>
            </div>

            <div v-if="loadouts.loadouts.length === 0" class="loadouts-empty-state">
              <Layers3 :size="28" aria-hidden="true" />
              <div>
                <strong>{{ t("inventory.loadouts.noneSaved") }}</strong>
                <p>{{ t("inventory.loadouts.noneSavedHint") }}</p>
              </div>
            </div>

            <div v-else class="loadout-card-grid">
              <article
                v-for="loadout in loadouts.loadouts"
                :key="loadout.id"
                :class="['loadout-config-card', { active: loadout.active }]"
              >
                <div class="loadout-config-heading">
                  <span :class="['loadout-status-icon', { active: loadout.active }]">
                    <ShieldCheck v-if="loadout.active" :size="22" aria-hidden="true" />
                    <Shield v-else :size="22" aria-hidden="true" />
                  </span>
                  <div>
                    <span class="eyebrow">{{
                      t(loadout.active ? "inventory.loadouts.active" : "inventory.loadouts.saved")
                    }}</span>
                    <h3>{{ loadout.name }}</h3>
                  </div>
                  <span class="pill muted-pill">{{
                    t("battle.campaign.ringCount", { count: loadout.ringCount })
                  }}</span>
                </div>

                <dl class="loadout-config-stats">
                  <div>
                    <dt>{{ t("stats.damage") }}</dt>
                    <dd>{{ loadout.summary.totalDamage }}</dd>
                  </div>
                  <div>
                    <dt>{{ t("stats.speed") }}</dt>
                    <dd>{{ loadout.summary.totalSpeed }}</dd>
                  </div>
                  <div>
                    <dt>{{ t("stats.energy") }}</dt>
                    <dd>{{ loadout.summary.averageEnergyCost }}</dd>
                  </div>
                  <div>
                    <dt>{{ t("stats.cooldown") }}</dt>
                    <dd>{{ loadout.summary.averageCooldown }}</dd>
                  </div>
                </dl>

                <div class="loadout-config-rings">
                  <button
                    v-for="ring in loadout.rings"
                    :key="ring.id"
                    :class="[
                      `rarity-border-${ring.rarity}`,
                      { selected: selectedDetailRing?.id === ring.id },
                    ]"
                    type="button"
                    :title="ringName(ring)"
                    :aria-label="
                      t('inventory.loadouts.inspectRingSlot', {
                        ring: ringName(ring),
                        slot: (ring.slotIndex ?? 0) + 1,
                      })
                    "
                    @click="selectedDetailRingId = ring.id"
                  >
                    <ItemArtwork :definition-id="ring.definitionId" kind="ring" />
                    <span>{{ (ring.slotIndex ?? 0) + 1 }}</span>
                  </button>
                </div>

                <div class="loadout-config-actions">
                  <button
                    v-if="!loadout.active"
                    :disabled="updating"
                    type="button"
                    :aria-label="t('inventory.loadouts.activateLoadout', { name: loadout.name })"
                    @click="activate(loadout.id)"
                  >
                    <Check :size="16" aria-hidden="true" /> {{ t("inventory.loadouts.activate") }}
                  </button>
                  <span v-else class="loadout-active-label"
                    ><Check :size="16" aria-hidden="true" />
                    {{ t("inventory.loadouts.readyForBattle") }}</span
                  >
                  <button
                    v-if="pendingDeleteLoadoutId !== loadout.id"
                    class="secondary-button danger-action"
                    :disabled="updating"
                    type="button"
                    :aria-label="t('inventory.loadouts.deleteLoadout', { name: loadout.name })"
                    @click="pendingDeleteLoadoutId = loadout.id"
                  >
                    <Trash2 :size="16" aria-hidden="true" /> {{ t("inventory.loadouts.delete") }}
                  </button>
                  <div
                    v-else
                    class="loadout-delete-confirmation"
                    role="group"
                    :aria-label="t('inventory.loadouts.deleteConfirmation', { name: loadout.name })"
                  >
                    <span>{{
                      t("inventory.loadouts.deleteConfirmation", { name: loadout.name })
                    }}</span>
                    <button
                      class="danger-action"
                      :disabled="updating"
                      type="button"
                      @click="deleteLoadout(loadout.id)"
                    >
                      <Trash2 :size="16" aria-hidden="true" />
                      {{ t("inventory.loadouts.confirmDelete") }}
                    </button>
                    <button
                      class="secondary-button"
                      :disabled="updating"
                      type="button"
                      @click="pendingDeleteLoadoutId = ''"
                    >
                      {{ t("inventory.loadouts.cancelDelete") }}
                    </button>
                  </div>
                </div>
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
import {
  ArrowRight,
  Check,
  Gauge,
  Layers3,
  Save,
  Shield,
  ShieldAlert,
  ShieldCheck,
  Sword,
  Timer,
  Trash2,
  Wrench,
  Zap,
} from "@lucide/vue";
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
const pendingDeleteLoadoutId = ref("");
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
  await updateLoadouts({ action: "saveFromEquipped", name: loadoutName.value });
  if (!actionError.value) feedback.value = t("inventory.loadouts.savedSuccess");
}

async function activate(loadoutId: string) {
  await updateLoadouts({ action: "activate", loadoutId });
  if (!actionError.value) feedback.value = t("inventory.loadouts.activatedSuccess");
}

async function deleteLoadout(loadoutId: string) {
  await updateLoadouts({ action: "delete", loadoutId });
  if (!actionError.value) {
    pendingDeleteLoadoutId.value = "";
    feedback.value = t("inventory.loadouts.deletedSuccess");
  }
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
