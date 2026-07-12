<template>
  <span
    v-if="hasArtwork"
    :class="['item-artwork', `${kind}-artwork`]"
    :data-asset-kind="kind"
    :data-asset-id="definitionId"
    :style="style"
    aria-hidden="true"
  />
</template>

<script setup lang="ts">
import { hasItemArtwork, itemArtworkStyle } from "~/utils/itemAssets";

const props = defineProps<{
  kind: string;
  definitionId: string;
}>();

const style = computed(() => itemArtworkStyle(props.kind, props.definitionId));
const hasArtwork = computed(() => hasItemArtwork(props.kind, props.definitionId));
</script>
