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
        <p class="muted">
          Manage the active ring set persisted in the Prisma development database.
        </p>
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

      <section class="panel equipment-breakdown">
        <h2>Resolved Loadout Metrics</h2>
        <dl class="summary-grid">
          <div class="stat">
            <dt>Ring Damage</dt>
            <dd>{{ equipment.summary.totalRingDamage }}</dd>
          </div>
          <div class="stat">
            <dt>Gem Damage</dt>
            <dd>{{ equipment.summary.totalGemDamage }}</dd>
          </div>
          <div class="stat">
            <dt>Spell Damage</dt>
            <dd>{{ equipment.summary.totalSpellDamage }}</dd>
          </div>
          <div class="stat">
            <dt>Monster Damage</dt>
            <dd>{{ equipment.summary.totalMonsterDamage }}</dd>
          </div>
          <div class="stat">
            <dt>Energy Penalty</dt>
            <dd>{{ equipment.summary.totalEnergyPenalty }}</dd>
          </div>
          <div class="stat">
            <dt>Cooldown Penalty</dt>
            <dd>{{ equipment.summary.totalCooldownPenalty }}</dd>
          </div>
        </dl>
      </section>

      <p v-if="feedback" class="feedback">{{ feedback }}</p>
      <p v-if="actionError" class="status-note">{{ actionError }}</p>

      <section class="detail-layout">
        <section class="split-layout equipment-layout">
          <div class="stack">
            <section class="panel">
            <h2>Equipped Rings</h2>
            <p v-if="equipment.equippedRings.length === 0" class="muted">No rings equipped yet.</p>
            <div v-else class="equipment-slot-list">
              <article
                v-for="ring in equipment.equippedRings"
                :key="ring.id"
                :class="[
                  'card',
                  'item-card',
                  `rarity-border-${ring.rarity}`,
                  { selected: selectedDetailRing?.id === ring.id },
                ]"
              >
                <ItemArtwork :definition-id="ring.definitionId" kind="ring" />
                <div class="item-card-body">
                  <div class="card-heading">
                    <h3>Slot {{ (ring.slotIndex ?? 0) + 1 }} - {{ ring.label }}</h3>
                    <span :class="['pill', `element-${ring.element}`]">{{ ring.element }}</span>
                  </div>
                  <RingStatGrid :ring="ring" />
                  <ul v-if="ring.gems.length > 0" class="gem-socket-list">
                    <li
                      v-for="gem in ring.gems"
                      :key="gem.id"
                      :class="['socket-row', `rarity-border-${gem.rarity}`]"
                    >
                      <ItemArtwork :definition-id="gem.definitionId" kind="gem" />
                      <div>
                        <strong>{{ gem.socketIndex + 1 }}. {{ gem.label }}</strong>
                        <span :class="['pill', `element-${gem.element}`]">{{ gem.element }}</span>
                        <small>
                          Damage {{ gem.damage }}, Energy +{{ gem.energyPenalty }}, Cooldown +{{
                            gem.cooldownPenalty
                          }}
                        </small>
                        <small v-if="gem.enchantment">
                          {{ gem.enchantment.type }}: {{ gem.enchantment.label }}
                          <template v-if="gem.enchantment.type === 'monster'">
                            damage {{ gem.enchantment.damage }}, health {{ gem.enchantment.health }}
                          </template>
                          <template v-else> damage {{ gem.enchantment.damage }} </template>
                        </small>
                      </div>
                    </li>
                  </ul>
                  <div class="control-row">
                    <button :disabled="updating" @click="updateEquipment('unequip', ring.id)">
                      Unequip
                    </button>
                    <button class="secondary-button" @click="selectedDetailRingId = ring.id">
                      Inspect
                    </button>
                  </div>
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
                { equipped: ring.equipped, selected: selectedDetailRing?.id === ring.id },
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
                <ul v-if="ring.gems.length > 0" class="gem-socket-list">
                  <li
                    v-for="gem in ring.gems"
                    :key="gem.id"
                    :class="['socket-row', `rarity-border-${gem.rarity}`]"
                  >
                    <ItemArtwork :definition-id="gem.definitionId" kind="gem" />
                    <div>
                      <strong>{{ gem.socketIndex + 1 }}. {{ gem.label }}</strong>
                      <span :class="['pill', `element-${gem.element}`]">{{ gem.element }}</span>
                      <small>
                        Damage {{ gem.damage }}, Energy +{{ gem.energyPenalty }}, Cooldown +{{
                          gem.cooldownPenalty
                        }}
                      </small>
                      <small v-if="gem.enchantment">
                        {{ gem.enchantment.type }}: {{ gem.enchantment.label }}
                        <template v-if="gem.enchantment.type === 'monster'">
                          damage {{ gem.enchantment.damage }}, health {{ gem.enchantment.health }}
                        </template>
                        <template v-else> damage {{ gem.enchantment.damage }} </template>
                      </small>
                    </div>
                  </li>
                </ul>
                <div class="control-row">
                  <button
                    v-if="!ring.equipped"
                    :disabled="
                      updating || equipment.summary.ringCount >= equipment.maxEquippedRings
                    "
                    @click="updateEquipment('equip', ring.id)"
                  >
                    Equip
                  </button>
                  <button v-else :disabled="updating" @click="updateEquipment('unequip', ring.id)">
                    Unequip
                  </button>
                  <button class="secondary-button" @click="selectedDetailRingId = ring.id">
                    Inspect
                  </button>
                </div>
                <code>{{ ring.id }}</code>
              </div>
            </article>
          </div>
        </section>
        </section>

        <ItemDetailPanel
          :item="selectedDetailRing"
          title="Ring Detail"
          @clear="selectedDetailRingId = ''"
        />
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
const selectedDetailRingId = ref("");
const {
  data: equipment,
  error,
  pending,
  refresh,
} = await useFetch<EquipmentState>("/api/inventory/equipment");

const selectedDetailRing = computed(
  () =>
    equipment.value?.availableRings.find((ring) => ring.id === selectedDetailRingId.value) ?? null,
);

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
