<template>
  <main class="shell">
    <nav class="section-nav" aria-label="Inventory navigation">
      <NuxtLink
        v-for="link in sectionLinks.inventory"
        :key="link.to"
        :class="{ active: route.path === link.to }"
        :to="link.to"
      >
        {{ link.label }}
      </NuxtLink>
    </nav>

    <header class="view-header">
      <div class="view-title">
        <span class="eyebrow">Inventory</span>
        <h1>Equipment</h1>
        <p class="muted">Manage the active ring set persisted in the Prisma development database.</p>
      </div>
    </header>

    <p v-if="pending" class="panel">Loading equipment...</p>
    <p v-else-if="error" class="panel">Unable to load equipment.</p>

    <template v-else-if="equipment">
      <section class="metric-grid equipment-metrics">
        <article class="card">
          <span class="eyebrow">Rings</span>
          <strong>{{ equipment.summary.ringCount }} / {{ equipment.maxEquippedRings }}</strong>
        </article>
        <article class="card">
          <span class="eyebrow">Speed</span>
          <strong>{{ equipment.summary.totalSpeed }}</strong>
        </article>
        <article class="card">
          <span class="eyebrow">Damage</span>
          <strong>{{ equipment.summary.totalDamage }}</strong>
        </article>
        <article class="card">
          <span class="eyebrow">Avg Energy</span>
          <strong>{{ equipment.summary.averageEnergyCost }}</strong>
        </article>
        <article class="card">
          <span class="eyebrow">Avg Cooldown</span>
          <strong>{{ equipment.summary.averageCooldown }}</strong>
        </article>
      </section>

      <p v-if="feedback" class="feedback">{{ feedback }}</p>
      <p v-if="actionError" class="status-note">{{ actionError }}</p>

      <section class="split-layout equipment-layout">
        <div class="stack">
          <section class="panel">
            <h2>Equipped Rings</h2>
            <p v-if="equipment.equippedRings.length === 0" class="muted">
              No rings equipped yet.
            </p>
            <div v-else class="equipment-slot-list">
              <article
                v-for="ring in equipment.equippedRings"
                :key="ring.id"
                :class="['card', 'item-card', `rarity-border-${ring.rarity}`]"
              >
                <ItemArtwork :definition-id="ring.definitionId" kind="ring" />
                <div class="item-card-body">
                  <div class="card-heading">
                    <h3>Slot {{ (ring.slotIndex ?? 0) + 1 }} - {{ ring.label }}</h3>
                    <span :class="['pill', `element-${ring.element}`]">{{ ring.element }}</span>
                  </div>
                  <RingStatGrid :ring="ring" />
                  <button :disabled="updating" @click="updateEquipment('unequip', ring.id)">
                    Unequip
                  </button>
                </div>
              </article>
            </div>
          </section>
        </div>

        <section class="panel">
          <h2>Owned Rings</h2>
          <p v-if="equipment.availableRings.length === 0" class="muted">
            Craft rings from the forge to equip them here.
          </p>
          <div v-else class="equipment-ring-list">
            <article
              v-for="ring in equipment.availableRings"
              :key="ring.id"
              :class="[
                'card',
                'item-card',
                'equipment-ring-card',
                `rarity-border-${ring.rarity}`,
                { equipped: ring.equipped },
              ]"
            >
              <ItemArtwork :definition-id="ring.definitionId" kind="ring" />
              <div class="item-card-body">
                <div class="card-heading">
                  <h3>{{ ring.label }}</h3>
                  <span :class="['pill', ring.equipped ? 'muted-pill' : `element-${ring.element}`]">
                    {{ ring.equipped ? "equipped" : ring.element }}
                  </span>
                </div>
                <RingStatGrid :ring="ring" />
                <div class="control-row">
                  <button
                    v-if="!ring.equipped"
                    :disabled="updating || equipment.summary.ringCount >= equipment.maxEquippedRings"
                    @click="updateEquipment('equip', ring.id)"
                  >
                    Equip
                  </button>
                  <button v-else :disabled="updating" @click="updateEquipment('unequip', ring.id)">
                    Unequip
                  </button>
                </div>
                <code>{{ ring.id }}</code>
              </div>
            </article>
          </div>
        </section>
      </section>
    </template>
  </main>
</template>

<script setup lang="ts">
import type { EquipmentState } from "~/utils/playerState";
import { sectionLinks } from "~/utils/viewData";

const route = useRoute();
const feedback = ref("");
const actionError = ref("");
const updating = ref(false);
const {
  data: equipment,
  error,
  pending,
  refresh,
} = await useFetch<EquipmentState>("/api/inventory/equipment");

async function updateEquipment(action: "equip" | "unequip", ringItemId: string) {
  feedback.value = "";
  actionError.value = "";
  updating.value = true;

  try {
    equipment.value = await $fetch<EquipmentState>("/api/inventory/equipment", {
      method: "POST",
      body: { action, ringItemId },
    });
    feedback.value = action === "equip" ? "Ring equipped." : "Ring unequipped.";
    await refresh();
  } catch (error_) {
    actionError.value = error_ instanceof Error ? error_.message : "Equipment update failed.";
  } finally {
    updating.value = false;
  }
}
</script>
