<template>
  <main class="shell">
    <nav v-if="view.links?.length" class="section-nav" aria-label="Section navigation">
      <NuxtLink
        v-for="link in view.links"
        :key="link.to"
        :class="{ active: isActive(link.to) }"
        :to="link.to"
      >
        {{ link.label }}
      </NuxtLink>
    </nav>

    <header class="view-header">
      <div class="view-title">
        <span class="eyebrow">{{ view.eyebrow }}</span>
        <h1>{{ view.title }}</h1>
        <p class="muted">{{ view.description }}</p>
      </div>
      <p v-if="view.status" class="status-note">{{ view.status }}</p>
    </header>

    <dl v-if="view.metrics?.length" class="metric-grid panel">
      <div v-for="metric in view.metrics" :key="metric.label" class="stat">
        <dt>{{ metric.label }}</dt>
        <dd>{{ metric.value }}</dd>
      </div>
    </dl>

    <section class="dashboard-grid">
      <article v-for="section in view.sections" :key="section.title" class="panel">
        <h2>{{ section.title }}</h2>
        <p class="muted">{{ section.body }}</p>
        <p v-if="section.status" class="status-note">{{ section.status }}</p>
        <ul v-if="section.items?.length" class="clean-list">
          <li v-for="item in section.items" :key="item" class="row-list-item">
            <span>{{ item }}</span>
          </li>
        </ul>
        <div v-if="section.actions?.length" class="control-row">
          <NuxtLink
            v-for="action in section.actions"
            :key="action.to"
            class="button-link"
            :to="action.to"
          >
            {{ action.label }}
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

function isActive(to: string): boolean {
  return route.path === to || (to !== "/" && route.path.startsWith(`${to}/`));
}
</script>
