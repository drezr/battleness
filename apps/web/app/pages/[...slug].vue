<template>
  <MockRouteView :view="view" />
</template>

<script setup lang="ts">
import { viewForPath } from "~/utils/viewData";

const route = useRoute();
const view = computed(() => viewForPath(route.path));
</script>
