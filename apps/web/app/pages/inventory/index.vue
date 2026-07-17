<template>
  <main class="shell app-hub-page inventory-hub-page">
    <nav class="section-nav" :aria-label="t('accessibility.inventoryNavigation')">
      <NuxtLink
        v-for="link in sectionLinks.inventory"
        :key="link.to"
        :class="{ active: route.path === link.to }"
        :to="link.to"
        >{{ t(link.labelKey) }}</NuxtLink
      >
    </nav>

    <header class="view-header app-hub-header">
      <div class="view-title">
        <span class="eyebrow">{{ t("inventory.section") }}</span>
        <h1>{{ t("inventory.hub.title") }}</h1>
        <p class="muted">{{ t("inventory.hub.description") }}</p>
      </div>
      <NuxtLink
        :class="['hub-resource-link', activeLoadout ? 'ready' : 'attention']"
        to="/inventory/loadouts"
      >
        <ShieldCheck v-if="activeLoadout" :size="20" /><ShieldAlert v-else :size="20" />
        <span
          ><small>{{ t("inventory.hub.battleConfiguration") }}</small
          ><strong>{{ activeLoadout?.name ?? t("inventory.hub.noActiveLoadout") }}</strong></span
        >
        <ChevronRight :size="17" />
      </NuxtLink>
    </header>

    <p v-if="pending" class="panel">{{ t("inventory.hub.loading") }}</p>
    <p v-else-if="error || !player || !equipment || !loadouts" class="panel">
      {{ t("inventory.hub.loadError") }}
    </p>

    <template v-else>
      <section class="hub-stat-strip" :aria-label="t('inventory.hub.collectionOverview')">
        <NuxtLink to="/inventory/items"
          ><span class="hub-stat-icon collection"><Backpack :size="19" /></span
          ><span
            ><small>{{ t("common.items") }}</small
            ><strong>{{ player.inventory.length }}</strong
            ><em>{{ t("inventory.hub.collectibles") }}</em></span
          ></NuxtLink
        >
        <NuxtLink to="/inventory/materials"
          ><span class="hub-stat-icon materials"><Boxes :size="19" /></span
          ><span
            ><small>{{ t("common.materials") }}</small
            ><strong>{{ materialUnits }}</strong
            ><em>{{ t("inventory.hub.craftingUnits") }}</em></span
          ></NuxtLink
        >
        <NuxtLink to="/inventory/equipment"
          ><span class="hub-stat-icon equipped"><Shield :size="19" /></span
          ><span
            ><small>{{ t("inventory.equipment.equippedRings") }}</small
            ><strong>{{ equipment.summary.ringCount }} / {{ equipment.maxEquippedRings }}</strong
            ><em>{{ t("inventory.hub.combatSlots") }}</em></span
          ></NuxtLink
        >
        <NuxtLink to="/inventory/loadouts"
          ><span class="hub-stat-icon loadouts"><Layers3 :size="19" /></span
          ><span
            ><small>{{ t("inventory.loadouts.savedLoadouts") }}</small
            ><strong>{{ loadouts.loadouts.length }}</strong
            ><em>{{ t("inventory.hub.savedConfigurations") }}</em></span
          ></NuxtLink
        >
      </section>

      <section class="inventory-hub-layout">
        <div class="inventory-hub-collection">
          <div class="section-heading-row">
            <div>
              <span class="eyebrow">{{ t("inventory.hub.collection") }}</span>
              <h2>{{ t("inventory.hub.collectionBreakdown") }}</h2>
            </div>
            <NuxtLink class="text-link" to="/inventory/items"
              >{{ t("common.details") }} <ArrowRight :size="16"
            /></NuxtLink>
          </div>
          <div class="inventory-category-grid">
            <NuxtLink v-for="category in categories" :key="category.type" to="/inventory/items">
              <span :class="['inventory-category-icon', category.type]"
                ><component :is="category.icon" :size="23"
              /></span>
              <span
                ><small>{{ t(category.labelKey) }}</small
                ><strong>{{ category.count }}</strong></span
              >
              <ChevronRight :size="17" />
            </NuxtLink>
          </div>
        </div>

        <aside class="inventory-readiness-panel">
          <div class="section-heading-row">
            <div>
              <span class="eyebrow">{{ t("inventory.hub.readiness") }}</span>
              <h2>{{ t("inventory.hub.combatKit") }}</h2>
            </div>
            <span :class="['pill', activeLoadout ? 'ready-note' : 'muted-pill']">{{
              t(activeLoadout ? "inventory.hub.ready" : "inventory.hub.incomplete")
            }}</span>
          </div>
          <div v-if="activeLoadout" class="inventory-active-loadout">
            <span class="loadout-shield"><Shield :size="25" /></span>
            <span
              ><small>{{ t("inventory.loadouts.active") }}</small
              ><strong>{{ activeLoadout.name }}</strong
              ><em>{{ t("battle.hub.ringCount", { count: activeLoadout.ringCount }) }}</em></span
            >
          </div>
          <div v-else class="inventory-active-loadout empty">
            <ShieldAlert :size="25" /><span
              ><strong>{{ t("inventory.hub.noActiveLoadout") }}</strong
              ><em>{{ t("inventory.hub.loadoutHint") }}</em></span
            >
          </div>
          <dl class="inventory-combat-summary">
            <div>
              <dt>{{ t("stats.damage") }}</dt>
              <dd>{{ equipment.summary.totalDamage }}</dd>
            </div>
            <div>
              <dt>{{ t("stats.speed") }}</dt>
              <dd>{{ equipment.summary.totalSpeed }}</dd>
            </div>
            <div>
              <dt>{{ t("battle.hub.averageEnergy") }}</dt>
              <dd>{{ equipment.summary.averageEnergyCost }}</dd>
            </div>
          </dl>
          <div class="hub-panel-actions">
            <NuxtLink class="button-link secondary-button" to="/inventory/equipment">{{
              t("inventory.hub.manageEquipment")
            }}</NuxtLink
            ><NuxtLink class="button-link" to="/inventory/loadouts">{{
              t("inventory.hub.manageLoadouts")
            }}</NuxtLink>
          </div>
        </aside>
      </section>

      <section class="hub-quick-links">
        <NuxtLink to="/forge/craft"
          ><Hammer :size="19" /><span
            ><strong>{{ t("inventory.hub.craftMore") }}</strong
            ><small>{{ t("inventory.hub.craftMoreDescription") }}</small></span
          ><ChevronRight :size="17"
        /></NuxtLink>
        <NuxtLink to="/market/game"
          ><Store :size="19" /><span
            ><strong>{{ t("inventory.hub.acquireMaterials") }}</strong
            ><small>{{ t("inventory.hub.acquireMaterialsDescription") }}</small></span
          ><ChevronRight :size="17"
        /></NuxtLink>
      </section>
    </template>
  </main>
</template>

<script setup lang="ts">
import {
  ArrowRight,
  Backpack,
  Boxes,
  ChevronRight,
  Gem,
  Hammer,
  Layers3,
  Package,
  Scroll,
  Shield,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  Store,
} from "@lucide/vue";
import type { EquipmentState, LoadoutState, PlayerState } from "~/utils/playerState";
import { inventoryCountByType, totalMaterialQuantity } from "~/utils/playerState";
import { sectionLinks } from "~/utils/viewData";

const route = useRoute();
const { t } = useI18n();
const [playerRequest, equipmentRequest, loadoutRequest] = await Promise.all([
  useFetch<PlayerState>("/api/player", { key: "inventory-hub-player" }),
  useFetch<EquipmentState>("/api/inventory/equipment", { key: "inventory-hub-equipment" }),
  useFetch<LoadoutState>("/api/inventory/loadouts", { key: "inventory-hub-loadouts" }),
]);
const player = playerRequest.data;
const equipment = equipmentRequest.data;
const loadouts = loadoutRequest.data;
const pending = computed(
  () =>
    playerRequest.pending.value || equipmentRequest.pending.value || loadoutRequest.pending.value,
);
const error = computed(
  () => playerRequest.error.value || equipmentRequest.error.value || loadoutRequest.error.value,
);
const materialUnits = computed(() => totalMaterialQuantity(player.value?.materials));
const activeLoadout = computed(
  () => loadouts.value?.loadouts.find((loadout) => loadout.active) ?? null,
);
const categories = computed(() => [
  {
    type: "ring",
    labelKey: "common.rings",
    icon: Gem,
    count: inventoryCountByType(player.value?.inventory, "ring"),
  },
  {
    type: "gem",
    labelKey: "common.gems",
    icon: Sparkles,
    count: inventoryCountByType(player.value?.inventory, "gem"),
  },
  {
    type: "monster",
    labelKey: "common.monsters",
    icon: Package,
    count: inventoryCountByType(player.value?.inventory, "monster"),
  },
  {
    type: "spell",
    labelKey: "common.spells",
    icon: Scroll,
    count: inventoryCountByType(player.value?.inventory, "spell"),
  },
]);
</script>
