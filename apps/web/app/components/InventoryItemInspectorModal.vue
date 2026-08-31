<template>
  <Teleport to="body">
    <div
      v-if="item"
      class="item-detail-modal-backdrop"
      role="presentation"
      @click.self="closeModal"
    >
      <aside
        ref="dialogElement"
        class="panel item-detail-panel item-detail-modal inventory-inspector-modal"
        role="dialog"
        aria-modal="true"
        :aria-label="t('inventory.items.detail')"
        tabindex="-1"
      >
        <div class="card-heading item-detail-modal-heading">
          <div>
            <span class="eyebrow">{{ t("inventory.items.selectedItem") }}</span>
            <h2>{{ t("inventory.items.detail") }}</h2>
          </div>
          <button
            class="icon-button item-detail-modal-close"
            type="button"
            :aria-label="t('itemDetail.close')"
            :title="t('itemDetail.close')"
            @click="closeModal"
          >
            <X :size="19" aria-hidden="true" />
          </button>
        </div>

        <InventoryItemInspector :item="item" compact @select-item="emit('selectItem', $event)" />
      </aside>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { X } from "@lucide/vue";
import type { InventoryItemView } from "~/utils/playerState";

const props = defineProps<{ item: InventoryItemView | null }>();
const emit = defineEmits<{ clear: []; selectItem: [itemId: string] }>();
const { t } = useI18n();
const dialogElement = ref<HTMLElement | null>(null);
let triggerElement: HTMLElement | null = null;
let backgroundElement: HTMLElement | null = null;
let backgroundWasInert = false;
let previousBodyOverflow = "";
let pageLocked = false;

watch(
  () => props.item,
  async (item) => {
    if (item) await openModal();
    else restorePageState();
  },
);

onMounted(async () => {
  window.addEventListener("keydown", handleKeydown);
  if (props.item) await openModal();
});

onBeforeUnmount(() => {
  window.removeEventListener("keydown", handleKeydown);
  restorePageState();
});

function closeModal(): void {
  emit("clear");
}

async function openModal(): Promise<void> {
  if (!pageLocked) {
    if (document.activeElement instanceof HTMLElement) triggerElement = document.activeElement;
    previousBodyOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    backgroundElement = document.querySelector<HTMLElement>(".app-shell");
    backgroundWasInert = backgroundElement?.inert ?? false;
    if (backgroundElement) backgroundElement.inert = true;
    pageLocked = true;
  }
  await nextTick();
  if (dialogElement.value) dialogElement.value.scrollTop = 0;
  dialogElement.value?.focus();
}

function restorePageState(): void {
  if (!pageLocked) return;
  document.body.style.overflow = previousBodyOverflow;
  if (backgroundElement) backgroundElement.inert = backgroundWasInert;
  backgroundElement = null;
  pageLocked = false;
  const element = triggerElement;
  triggerElement = null;
  nextTick(() => element?.focus());
}

function handleKeydown(event: KeyboardEvent): void {
  if (!props.item) return;
  if (event.key === "Escape") {
    closeModal();
    return;
  }
  if (event.key !== "Tab" || !dialogElement.value) return;
  const focusable = Array.from(
    dialogElement.value.querySelectorAll<HTMLElement>(
      'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
    ),
  ).filter((element) => !element.hidden && element.getClientRects().length > 0);
  if (focusable.length === 0) {
    event.preventDefault();
    dialogElement.value.focus();
    return;
  }
  const first = focusable[0];
  const last = focusable.at(-1);
  if (!event.shiftKey && document.activeElement === dialogElement.value) {
    event.preventDefault();
    first?.focus();
  } else if (
    event.shiftKey &&
    (document.activeElement === first || document.activeElement === dialogElement.value)
  ) {
    event.preventDefault();
    last?.focus();
  } else if (!event.shiftKey && document.activeElement === last) {
    event.preventDefault();
    first?.focus();
  }
}
</script>
