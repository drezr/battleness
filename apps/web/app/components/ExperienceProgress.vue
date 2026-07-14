<template>
  <div class="experience-progress">
    <div class="experience-progress-heading">
      <span>{{ displayLabel }}</span>
      <strong v-if="progress.nextLevelExperience === null">{{ t("experience.levelCap") }}</strong>
      <strong v-else>{{
        t("experience.value", {
          current: progress.experienceIntoLevel,
          required: progress.experienceForNextLevel,
        })
      }}</strong>
    </div>
    <progress
      :aria-label="displayLabel"
      :max="progress.experienceForNextLevel ?? 1"
      :value="progress.nextLevelExperience === null ? 1 : progress.experienceIntoLevel"
    />
    <small v-if="progress.nextLevelExperience !== null">
      {{
        t("experience.toNextLevel", {
          remaining: progress.experienceRemaining,
          level: progress.level + 1,
        })
      }}
    </small>
    <small v-else>{{ t("experience.maximumReached", { level: progress.maxLevel }) }}</small>
  </div>
</template>

<script setup lang="ts">
import type { ExperienceProgressView } from "~/utils/playerState";

const props = withDefaults(
  defineProps<{
    progress: ExperienceProgressView;
    label?: string;
  }>(),
  { label: "" },
);

const { t } = useI18n();
const displayLabel = computed(() => props.label || t("experience.defaultLabel"));
</script>
