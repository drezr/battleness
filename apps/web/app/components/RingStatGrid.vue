<template>
  <dl class="summary-grid">
    <div class="stat">
      <dt>{{ t("stats.damage") }}</dt>
      <dd>
        {{ ring.damage }}
        <span v-if="ring.damage > ring.baseDamage" class="positive"
          >+{{ ring.damage - ring.baseDamage }}</span
        >
      </dd>
    </div>
    <div class="stat">
      <dt>{{ t("stats.energy") }}</dt>
      <dd>
        {{ ring.energyCost }}
        <span v-if="ring.energyPenalty > 0" class="status-note-inline"
          >+{{ ring.energyPenalty }}</span
        >
      </dd>
    </div>
    <div class="stat">
      <dt>{{ t("stats.cooldown") }}</dt>
      <dd>
        {{ ring.cooldown }}
        <span v-if="ring.cooldownPenalty > 0" class="status-note-inline"
          >+{{ ring.cooldownPenalty }}</span
        >
      </dd>
    </div>
    <div class="stat">
      <dt>{{ t("stats.speed") }}</dt>
      <dd>{{ ring.baseSpeed }}</dd>
    </div>
    <div class="stat">
      <dt>{{ t("stats.sockets") }}</dt>
      <dd>{{ ring.gems.length }} / {{ ring.socketCount ?? 0 }}</dd>
    </div>
    <div class="stat">
      <dt>{{ t("common.level") }}</dt>
      <dd>{{ ring.level }}</dd>
    </div>
    <div class="stat">
      <dt>{{ t("common.quality") }}</dt>
      <dd>{{ ring.quality }}</dd>
    </div>
  </dl>
</template>

<script setup lang="ts">
import type { EquipmentRingView } from "~/utils/playerState";

defineProps<{
  ring: EquipmentRingView;
}>();
const { t } = useI18n();
</script>
