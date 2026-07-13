<template>
  <dl class="summary-grid">
    <div class="stat">
      <dt>Damage</dt>
      <dd>
        {{ ring.damage }}
        <span v-if="ring.damage > ring.baseDamage" class="positive"
          >+{{ ring.damage - ring.baseDamage }}</span
        >
      </dd>
    </div>
    <div class="stat">
      <dt>Energy</dt>
      <dd>
        {{ ring.energyCost }}
        <span v-if="ring.energyPenalty > 0" class="status-note-inline"
          >+{{ ring.energyPenalty }}</span
        >
      </dd>
    </div>
    <div class="stat">
      <dt>Cooldown</dt>
      <dd>
        {{ ring.cooldown }}
        <span v-if="ring.cooldownPenalty > 0" class="status-note-inline"
          >+{{ ring.cooldownPenalty }}</span
        >
      </dd>
    </div>
    <div class="stat">
      <dt>Speed</dt>
      <dd>{{ ring.baseSpeed }}</dd>
    </div>
    <div class="stat">
      <dt>Sockets</dt>
      <dd>{{ ring.gems.length }} / {{ ring.socketCount ?? 0 }}</dd>
    </div>
    <div class="stat">
      <dt>Level</dt>
      <dd>{{ ring.level }}</dd>
    </div>
    <div class="stat">
      <dt>Quality</dt>
      <dd>{{ ring.quality }}</dd>
    </div>
  </dl>
</template>

<script setup lang="ts">
import type { EquipmentRingView } from "~/utils/playerState";

defineProps<{
  ring: EquipmentRingView;
}>();
</script>
