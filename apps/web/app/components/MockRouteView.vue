<template>
  <main class="shell">
    <nav
      v-if="view.links?.length"
      class="section-nav"
      :aria-label="t('accessibility.sectionNavigation')"
    >
      <NuxtLink
        v-for="link in view.links"
        :key="link.to"
        :class="{ active: isActive(link.to) }"
        :to="link.to"
      >
        {{ $t(link.labelKey) }}
      </NuxtLink>
    </nav>

    <header class="view-header">
      <div class="view-title">
        <span class="eyebrow">{{ t(view.eyebrowKey) }}</span>
        <h1>{{ t(view.titleKey) }}</h1>
        <p class="muted">{{ t(view.descriptionKey) }}</p>
      </div>
      <p v-if="view.statusKey" class="status-note">{{ t(view.statusKey) }}</p>
    </header>

    <dl v-if="view.metrics?.length" class="metric-grid panel">
      <div v-for="metric in view.metrics" :key="metric.labelKey" class="stat">
        <dt>{{ t(metric.labelKey) }}</dt>
        <dd>{{ t(metric.valueKey) }}</dd>
      </div>
    </dl>

    <section class="dashboard-grid">
      <article v-for="section in view.sections" :key="section.titleKey" class="panel">
        <h2>{{ t(section.titleKey) }}</h2>
        <p class="muted">{{ t(section.bodyKey) }}</p>
        <p v-if="section.statusKey" class="status-note">{{ t(section.statusKey) }}</p>
        <ul v-if="section.itemKeys?.length" class="clean-list">
          <li v-for="itemKey in section.itemKeys" :key="itemKey" class="row-list-item">
            <span>{{ t(itemKey) }}</span>
          </li>
        </ul>
        <div v-if="section.actions?.length" class="control-row">
          <NuxtLink
            v-for="action in section.actions"
            :key="action.to"
            class="button-link"
            :to="action.to"
          >
            {{ t(action.labelKey) }}
          </NuxtLink>
        </div>
      </article>
    </section>
  </main>
</template>

<script setup lang="ts">
import type { MockView } from "~/utils/viewData";

defineProps<{
  view: MockView;
}>();

const route = useRoute();
const { t } = useI18n();

function isActive(to: string): boolean {
  return route.path === to || (to !== "/" && route.path.startsWith(`${to}/`));
}
</script>
