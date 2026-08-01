<template>
  <button
    ref="triggerElement"
    class="view-help-button"
    type="button"
    aria-haspopup="dialog"
    :aria-expanded="open"
    :aria-label="t('accessibility.openViewHelp', { title })"
    @click="openDialog"
  >
    <span aria-hidden="true">?</span>
  </button>

  <Teleport to="body">
    <div v-if="open" class="view-help-backdrop" @mousedown.self="closeDialog">
      <section
        ref="dialogElement"
        class="view-help-dialog"
        role="dialog"
        aria-modal="true"
        :aria-labelledby="titleId"
        tabindex="-1"
        @keydown="handleKeydown"
      >
        <header>
          <h2 :id="titleId">{{ title }}</h2>
          <button
            class="view-help-close"
            type="button"
            :aria-label="t('accessibility.closeViewHelp', { title })"
            @click="closeDialog"
          >
            <X :size="20" aria-hidden="true" />
          </button>
        </header>
        <p>{{ description }}</p>
      </section>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { X } from "@lucide/vue";

defineProps<{
  title: string;
  description: string;
}>();

const { t } = useI18n();
const titleId = useId();
const open = ref(false);
const triggerElement = ref<HTMLButtonElement | null>(null);
const dialogElement = ref<HTMLElement | null>(null);
let previousBodyOverflow = "";
let backgroundWasInert = false;

async function openDialog(): Promise<void> {
  previousBodyOverflow = document.body.style.overflow;
  document.body.style.overflow = "hidden";
  const background = document.querySelector<HTMLElement>(".app-shell");
  backgroundWasInert = background?.inert ?? false;
  if (background) background.inert = true;
  open.value = true;
  await nextTick();
  dialogElement.value?.focus();
}

function closeDialog(): void {
  open.value = false;
  document.body.style.overflow = previousBodyOverflow;
  const background = document.querySelector<HTMLElement>(".app-shell");
  if (background) background.inert = backgroundWasInert;
  nextTick(() => triggerElement.value?.focus());
}

function handleKeydown(event: KeyboardEvent): void {
  if (event.key === "Escape") {
    closeDialog();
    return;
  }
  if (event.key !== "Tab" || !dialogElement.value) return;
  const focusable = Array.from(
    dialogElement.value.querySelectorAll<HTMLElement>(
      'button:not([disabled]), a[href], [tabindex]:not([tabindex="-1"])',
    ),
  ).filter((element) => element.getClientRects().length > 0);
  const first = focusable[0];
  const last = focusable.at(-1);
  if (!first || !last) {
    event.preventDefault();
    dialogElement.value.focus();
  } else if (event.shiftKey && document.activeElement === first) {
    event.preventDefault();
    last.focus();
  } else if (!event.shiftKey && document.activeElement === last) {
    event.preventDefault();
    first.focus();
  }
}

onBeforeUnmount(() => {
  if (!open.value) return;
  document.body.style.overflow = previousBodyOverflow;
  const background = document.querySelector<HTMLElement>(".app-shell");
  if (background) background.inert = backgroundWasInert;
});
</script>
