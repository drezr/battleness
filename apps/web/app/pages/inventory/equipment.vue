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
        <h1>{{ t("inventory.equipment.title") }}</h1>
        <p class="muted">{{ t("inventory.equipment.description") }}</p>
      </div>
    </header>

    <p v-if="pending" class="panel">{{ t("inventory.equipment.loading") }}</p>
    <p v-else-if="error" class="panel">{{ t("inventory.equipment.loadError") }}</p>

    <template v-else-if="equipment">
      <section class="metric-grid equipment-metrics">
        <article class="card">
          <span class="eyebrow">{{ t("common.rings") }}</span>
          <strong>{{ equipment.summary.ringCount }} / {{ equipment.maxEquippedRings }}</strong>
        </article>
        <article class="card">
          <span class="eyebrow">{{ t("stats.speed") }}</span>
          <strong>{{ equipment.summary.totalSpeed }}</strong>
        </article>
        <article class="card">
          <span class="eyebrow">{{ t("stats.damage") }}</span>
          <strong>{{ equipment.summary.totalDamage }}</strong>
        </article>
        <article class="card">
          <span class="eyebrow">{{ t("battle.hub.averageEnergy") }}</span>
          <strong>{{ equipment.summary.averageEnergyCost }}</strong>
        </article>
        <article class="card">
          <span class="eyebrow">{{ t("battle.hub.averageCooldown") }}</span>
          <strong>{{ equipment.summary.averageCooldown }}</strong>
        </article>
      </section>

      <section class="panel equipment-breakdown">
        <h2>{{ t("inventory.equipment.resolvedMetrics") }}</h2>
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
      </section>

      <p v-if="feedback" class="feedback">{{ feedback }}</p>
      <p v-if="actionError" class="status-note">{{ actionError }}</p>

      <section class="detail-layout">
        <section class="split-layout equipment-layout">
          <div class="stack">
            <section class="panel">
              <h2>{{ t("inventory.equipment.equippedRings") }}</h2>
              <p v-if="equipment.equippedRings.length === 0" class="muted">
                {{ t("inventory.equipment.noneEquipped") }}
              </p>
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
                      <h3>
                        {{
                          t("inventory.equipment.slotRing", {
                            slot: (ring.slotIndex ?? 0) + 1,
                            ring: itemName("ring", ring.definitionId, ring.label),
                          })
                        }}
                      </h3>
                      <span :class="['pill', `element-${ring.element}`]">{{
                        t(`element.${ring.element}`)
                      }}</span>
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
                          <strong
                            >{{ gem.socketIndex + 1 }}.
                            {{ itemName("gem", gem.definitionId, gem.label) }}</strong
                          >
                          <span :class="['pill', `element-${gem.element}`]">{{
                            t(`element.${gem.element}`)
                          }}</span>
                          <small>
                            {{
                              t("forge.socket.gemStats", {
                                damage: gem.damage,
                                energy: gem.energyPenalty,
                                cooldown: gem.cooldownPenalty,
                              })
                            }}
                          </small>
                          <small v-if="gem.enchantment">
                            {{ t(`itemType.${gem.enchantment.type}`) }}:
                            {{
                              itemName(
                                gem.enchantment.type,
                                gem.enchantment.definitionId,
                                gem.enchantment.label,
                              )
                            }}
                            <template v-if="gem.enchantment.type === 'monster'">
                              {{
                                t("inventory.equipment.damageHealth", {
                                  damage: gem.enchantment.damage,
                                  health: gem.enchantment.health,
                                })
                              }}
                            </template>
                            <template v-else>
                              {{
                                t("battle.summary.damageValue", { count: gem.enchantment.damage })
                              }}
                            </template>
                          </small>
                        </div>
                      </li>
                    </ul>
                    <div class="control-row">
                      <button :disabled="updating" @click="updateEquipment('unequip', ring.id)">
                        {{ t("inventory.equipment.unequip") }}
                      </button>
                      <button class="secondary-button" @click="selectedDetailRingId = ring.id">
                        {{ t("common.inspect") }}
                      </button>
                    </div>
                  </div>
                </article>
              </div>
            </section>
          </div>

          <section class="panel">
            <h2>{{ t("inventory.equipment.ownedRings") }}</h2>
            <p v-if="equipment.availableRings.length === 0" class="muted">
              {{ t("inventory.equipment.craftFirst") }}
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
                    <h3>{{ itemName("ring", ring.definitionId, ring.label) }}</h3>
                    <span
                      :class="['pill', ring.equipped ? 'muted-pill' : `element-${ring.element}`]"
                    >
                      {{
                        ring.equipped
                          ? t("inventory.equipment.equipped")
                          : t(`element.${ring.element}`)
                      }}
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
                        <strong
                          >{{ gem.socketIndex + 1 }}.
                          {{ itemName("gem", gem.definitionId, gem.label) }}</strong
                        >
                        <span :class="['pill', `element-${gem.element}`]">{{
                          t(`element.${gem.element}`)
                        }}</span>
                        <small>
                          {{
                            t("forge.socket.gemStats", {
                              damage: gem.damage,
                              energy: gem.energyPenalty,
                              cooldown: gem.cooldownPenalty,
                            })
                          }}
                        </small>
                        <small v-if="gem.enchantment">
                          {{ t(`itemType.${gem.enchantment.type}`) }}:
                          {{
                            itemName(
                              gem.enchantment.type,
                              gem.enchantment.definitionId,
                              gem.enchantment.label,
                            )
                          }}
                          <template v-if="gem.enchantment.type === 'monster'">
                            {{
                              t("inventory.equipment.damageHealth", {
                                damage: gem.enchantment.damage,
                                health: gem.enchantment.health,
                              })
                            }}
                          </template>
                          <template v-else>
                            {{ t("battle.summary.damageValue", { count: gem.enchantment.damage }) }}
                          </template>
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
                      {{ t("inventory.equipment.equip") }}
                    </button>
                    <button
                      v-else
                      :disabled="updating"
                      @click="updateEquipment('unequip', ring.id)"
                    >
                      {{ t("inventory.equipment.unequip") }}
                    </button>
                    <button class="secondary-button" @click="selectedDetailRingId = ring.id">
                      {{ t("common.inspect") }}
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
          :title="t('inventory.equipment.ringDetail')"
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

const selectedDetailRing = computed(
  () =>
    equipment.value?.availableRings.find((ring) => ring.id === selectedDetailRingId.value) ?? null,
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
