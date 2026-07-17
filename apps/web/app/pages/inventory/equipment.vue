<template>
  <main class="shell equipment-page">
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

    <header class="view-header equipment-header">
      <div class="view-title">
        <span class="eyebrow">{{ t("inventory.section") }}</span>
        <h1>{{ t("inventory.equipment.title") }}</h1>
        <p class="muted">{{ t("inventory.equipment.description") }}</p>
      </div>
      <NuxtLink class="button-link secondary-button" to="/inventory/loadouts">
        <Layers3 :size="17" aria-hidden="true" />
        {{ t("inventory.equipment.manageLoadouts") }}
        <ArrowRight :size="16" aria-hidden="true" />
      </NuxtLink>
    </header>

    <p v-if="pending" class="panel">{{ t("inventory.equipment.loading") }}</p>
    <p v-else-if="error" class="panel">{{ t("inventory.equipment.loadError") }}</p>

    <template v-else-if="equipment">
      <section class="equipment-overview" aria-labelledby="equipment-overview-title">
        <div class="equipment-overview-title">
          <span class="equipment-overview-icon"><Shield :size="24" aria-hidden="true" /></span>
          <div>
            <span class="eyebrow">{{ t("inventory.equipment.combatKit") }}</span>
            <h2 id="equipment-overview-title">{{ t("inventory.equipment.activeEquipment") }}</h2>
          </div>
        </div>
        <dl class="equipment-kpis">
          <div>
            <dt>{{ t("common.rings") }}</dt>
            <dd>
              {{ equipment.summary.ringCount }}<small>/{{ equipment.maxEquippedRings }}</small>
            </dd>
          </div>
          <div>
            <dt><Sword :size="14" aria-hidden="true" /> {{ t("stats.damage") }}</dt>
            <dd>{{ equipment.summary.totalDamage }}</dd>
          </div>
          <div>
            <dt><Gauge :size="14" aria-hidden="true" /> {{ t("stats.speed") }}</dt>
            <dd>{{ equipment.summary.totalSpeed }}</dd>
          </div>
          <div>
            <dt><Zap :size="14" aria-hidden="true" /> {{ t("inventory.equipment.efficiency") }}</dt>
            <dd>
              {{ equipment.summary.averageEnergyCost
              }}<small> / {{ equipment.summary.averageCooldown }}</small>
            </dd>
          </div>
        </dl>
      </section>

      <p v-if="feedback" class="feedback">{{ feedback }}</p>
      <p v-if="actionError" class="status-note">{{ actionError }}</p>

      <section class="detail-layout equipment-detail-layout">
        <div class="stack equipment-workspace">
          <section class="equipment-section">
            <div class="section-heading-row">
              <div>
                <span class="eyebrow">{{ t("inventory.equipment.combatKit") }}</span>
                <h2>{{ t("inventory.equipment.equippedSlots") }}</h2>
              </div>
              <span class="pill muted-pill">
                {{ equipment.summary.ringCount }} / {{ equipment.maxEquippedRings }}
              </span>
            </div>

            <div class="equipment-slot-grid">
              <article
                v-for="(ring, index) in equipmentSlots"
                :key="ring?.id ?? `empty-${index}`"
                :class="[
                  'equipment-slot',
                  ring ? `rarity-border-${ring.rarity}` : 'empty',
                  { selected: ring && selectedDetailRing?.id === ring.id },
                ]"
              >
                <span class="equipment-slot-number">{{ index + 1 }}</span>
                <template v-if="ring">
                  <ItemArtwork :definition-id="ring.definitionId" kind="ring" />
                  <div class="equipment-slot-copy">
                    <strong>{{ itemName("ring", ring.definitionId, ring.label) }}</strong>
                    <span :class="['pill', `element-${ring.element}`]">{{
                      t(`element.${ring.element}`)
                    }}</span>
                    <small>
                      {{
                        t("inventory.equipment.compactStats", {
                          damage: ring.damage,
                          energy: ring.energyCost,
                          cooldown: ring.cooldown,
                        })
                      }}
                    </small>
                  </div>
                  <div class="equipment-slot-actions">
                    <button
                      class="icon-button"
                      type="button"
                      :title="
                        t('common.inspectItem', {
                          item: itemName('ring', ring.definitionId, ring.label),
                        })
                      "
                      :aria-label="
                        t('common.inspectItem', {
                          item: itemName('ring', ring.definitionId, ring.label),
                        })
                      "
                      @click="selectedDetailRingId = ring.id"
                    >
                      <Eye :size="17" aria-hidden="true" />
                    </button>
                    <button
                      class="icon-button danger-action"
                      type="button"
                      :disabled="updating"
                      :title="
                        t('inventory.equipment.unequipRing', {
                          ring: itemName('ring', ring.definitionId, ring.label),
                        })
                      "
                      :aria-label="
                        t('inventory.equipment.unequipRing', {
                          ring: itemName('ring', ring.definitionId, ring.label),
                        })
                      "
                      @click="updateEquipment('unequip', ring.id)"
                    >
                      <X :size="17" aria-hidden="true" />
                    </button>
                  </div>
                </template>
                <template v-else>
                  <span class="empty-slot-icon"
                    ><CircleDashed :size="22" aria-hidden="true"
                  /></span>
                  <span>{{ t("inventory.equipment.emptySlot") }}</span>
                </template>
              </article>
            </div>
          </section>

          <details class="equipment-resolved-details">
            <summary>
              <span
                ><SlidersHorizontal :size="17" aria-hidden="true" />
                {{ t("inventory.equipment.resolvedMetrics") }}</span
              >
              <ChevronDown :size="17" aria-hidden="true" />
            </summary>
            <dl class="summary-grid">
              <div class="stat">
                <dt>{{ t("itemDetail.ringDamage") }}</dt>
                <dd>{{ equipment.summary.totalRingDamage }}</dd>
              </div>
              <div class="stat">
                <dt>{{ t("itemDetail.gemDamage") }}</dt>
                <dd>{{ equipment.summary.totalGemDamage }}</dd>
              </div>
              <div class="stat">
                <dt>{{ t("itemDetail.spellDamage") }}</dt>
                <dd>{{ equipment.summary.totalSpellDamage }}</dd>
              </div>
              <div class="stat">
                <dt>{{ t("itemDetail.monsterDamage") }}</dt>
                <dd>{{ equipment.summary.totalMonsterDamage }}</dd>
              </div>
              <div class="stat">
                <dt>{{ t("itemDetail.energyPenalty") }}</dt>
                <dd>{{ equipment.summary.totalEnergyPenalty }}</dd>
              </div>
              <div class="stat">
                <dt>{{ t("itemDetail.cooldownPenalty") }}</dt>
                <dd>{{ equipment.summary.totalCooldownPenalty }}</dd>
              </div>
            </dl>
          </details>

          <section class="equipment-section">
            <div class="section-heading-row">
              <div>
                <span class="eyebrow">{{ t("inventory.equipment.collection") }}</span>
                <h2>{{ t("inventory.equipment.availableArsenal") }}</h2>
              </div>
              <span class="pill muted-pill">{{ equipment.availableRings.length }}</span>
            </div>
            <div v-if="equipment.availableRings.length === 0" class="equipment-empty-state">
              <Gem :size="26" aria-hidden="true" />
              <p>{{ t("inventory.equipment.craftFirst") }}</p>
              <NuxtLink class="button-link" to="/forge/craft">{{ t("navigation.craft") }}</NuxtLink>
            </div>
            <div v-else class="equipment-arsenal-grid">
              <article
                v-for="ring in equipment.availableRings"
                :key="ring.id"
                :class="[
                  'equipment-arsenal-card',
                  `rarity-border-${ring.rarity}`,
                  { equipped: ring.equipped, selected: selectedDetailRing?.id === ring.id },
                ]"
              >
                <ItemArtwork :definition-id="ring.definitionId" kind="ring" />
                <div class="equipment-arsenal-copy">
                  <div class="card-heading">
                    <div>
                      <strong>{{ itemName("ring", ring.definitionId, ring.label) }}</strong>
                      <small>{{
                        t("inventory.equipment.levelQuality", {
                          level: ring.level,
                          quality: ring.quality,
                        })
                      }}</small>
                    </div>
                    <span :class="['pill', `element-${ring.element}`]">{{
                      t(`element.${ring.element}`)
                    }}</span>
                  </div>
                  <dl class="equipment-ring-stats">
                    <div>
                      <dt>{{ t("stats.damage") }}</dt>
                      <dd>{{ ring.damage }}</dd>
                    </div>
                    <div>
                      <dt>{{ t("stats.energy") }}</dt>
                      <dd>{{ ring.energyCost }}</dd>
                    </div>
                    <div>
                      <dt>{{ t("stats.cooldown") }}</dt>
                      <dd>{{ ring.cooldown }}</dd>
                    </div>
                    <div>
                      <dt>{{ t("inventory.equipment.sockets") }}</dt>
                      <dd>{{ ring.gems.length }}/{{ ring.socketCount }}</dd>
                    </div>
                  </dl>
                  <div class="equipment-card-actions">
                    <button
                      v-if="!ring.equipped"
                      type="button"
                      :disabled="
                        updating || equipment.summary.ringCount >= equipment.maxEquippedRings
                      "
                      :aria-label="
                        t('inventory.equipment.equipRing', {
                          ring: itemName('ring', ring.definitionId, ring.label),
                        })
                      "
                      @click="updateEquipment('equip', ring.id)"
                    >
                      <Plus :size="16" aria-hidden="true" /> {{ t("inventory.equipment.equip") }}
                    </button>
                    <button
                      v-else
                      type="button"
                      :disabled="updating"
                      :aria-label="
                        t('inventory.equipment.unequipRing', {
                          ring: itemName('ring', ring.definitionId, ring.label),
                        })
                      "
                      @click="updateEquipment('unequip', ring.id)"
                    >
                      <X :size="16" aria-hidden="true" /> {{ t("inventory.equipment.unequip") }}
                    </button>
                    <button
                      class="secondary-button"
                      type="button"
                      :aria-label="
                        t('common.inspectItem', {
                          item: itemName('ring', ring.definitionId, ring.label),
                        })
                      "
                      @click="selectedDetailRingId = ring.id"
                    >
                      <Eye :size="16" aria-hidden="true" /> {{ t("common.inspect") }}
                    </button>
                  </div>
                </div>
              </article>
            </div>
          </section>
        </div>

        <ItemDetailPanel
          :item="selectedDetailRing"
          :title="t('inventory.equipment.ringDetail')"
          :manage-to="selectedDetailManageTo"
          @clear="selectedDetailRingId = ''"
        />
      </section>
    </template>
  </main>
</template>

<script setup lang="ts">
import {
  ArrowRight,
  ChevronDown,
  CircleDashed,
  Eye,
  Gauge,
  Gem,
  Layers3,
  Plus,
  Shield,
  SlidersHorizontal,
  Sword,
  X,
  Zap,
} from "@lucide/vue";
import type { EquipmentRingView, EquipmentState } from "~/utils/playerState";
import { sectionLinks } from "~/utils/viewData";

const route = useRoute();
const { t } = useI18n();
const contentText = useContentText();
const feedback = ref("");
const actionError = ref("");
const updating = ref(false);
const selectedDetailRingId = ref("");
const {
  data: equipment,
  error,
  pending,
  refresh,
} = await useFetch<EquipmentState>("/api/inventory/equipment");

const equipmentSlots = computed<(EquipmentRingView | null)[]>(() => {
  if (!equipment.value) return [];
  const slots = Array<EquipmentRingView | null>(equipment.value.maxEquippedRings).fill(null);
  for (const ring of equipment.value.equippedRings) {
    const index = ring.slotIndex ?? slots.findIndex((slot) => slot === null);
    if (index >= 0 && index < slots.length) slots[index] = ring;
  }
  return slots;
});

const selectedDetailRing = computed(
  () =>
    equipment.value?.availableRings.find((ring) => ring.id === selectedDetailRingId.value) ?? null,
);
const selectedDetailManageTo = computed(() =>
  selectedDetailRing.value
    ? `/forge/socket?ringId=${encodeURIComponent(selectedDetailRing.value.id)}`
    : undefined,
);

function itemName(type: string, definitionId: string, fallback: string): string {
  return contentText(`${type}.${definitionId}.name`, fallback);
}

async function updateEquipment(action: "equip" | "unequip", ringItemId: string) {
  feedback.value = "";
  actionError.value = "";
  updating.value = true;
  try {
    equipment.value = await $fetch<EquipmentState>("/api/inventory/equipment", {
      method: "POST",
      body: { action, ringItemId },
    });
    feedback.value = t(
      action === "equip"
        ? "inventory.equipment.equippedSuccess"
        : "inventory.equipment.unequippedSuccess",
    );
    await refresh();
  } catch (error_) {
    actionError.value =
      error_ instanceof Error ? error_.message : t("inventory.equipment.actionError");
  } finally {
    updating.value = false;
  }
}
</script>
