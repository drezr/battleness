<template>
  <dl class="summary-grid">
    <div class="stat">
      <dt>Damage</dt>
      <dd>{{ ring.baseDamage }}</dd>
    </div>
    <div class="stat">
      <dt>Energy</dt>
      <dd>{{ ring.baseEnergyCost }}</dd>
    </div>
    <div class="stat">
      <dt>Cooldown</dt>
      <dd>{{ ring.baseCooldown }}</dd>
    </div>
    <div class="stat">
      <dt>Speed</dt>
      <dd>{{ ring.baseSpeed }}</dd>
    </div>
    <div class="stat">
      <dt>Sockets</dt>
      <dd>{{ ring.socketCount ?? 0 }}</dd>
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
