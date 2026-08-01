<template>
  <NuxtLink class="section-back-link" :to="to" :aria-label="label" :title="label">
    <ArrowLeft :size="23" aria-hidden="true" />
  </NuxtLink>
</template>

<script setup lang="ts">
import { ArrowLeft } from "@lucide/vue";

defineProps<{
  to: string;
  label: string;
}>();
</script>
