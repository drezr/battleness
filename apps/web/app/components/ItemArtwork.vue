<template>
  <span
    v-if="hasArtwork"
    :class="['item-artwork', `${kind}-artwork`, rarityClass]"
    :data-asset-kind="kind"
    :data-asset-id="definitionId"
    :style="style"
    aria-hidden="true"
  />
</template>

<script setup lang="ts">
import { hasItemArtwork, itemArtworkRarityClass, itemArtworkStyle } from "~/utils/itemAssets";

const props = withDefaults(
  defineProps<{
    kind: string;
    definitionId: string;
    rarity?: string;
    rarityBorder?: boolean;
  }>(),
  {
    rarity: undefined,
    rarityBorder: true,
  },
);

const style = computed(() => itemArtworkStyle(props.kind, props.definitionId));
const hasArtwork = computed(() => hasItemArtwork(props.kind, props.definitionId));
const rarityClass = computed(() =>
  props.rarityBorder
    ? itemArtworkRarityClass(props.kind, props.definitionId, props.rarity)
    : undefined,
);
</script>
