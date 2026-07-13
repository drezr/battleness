<template>
  <aside class="panel item-detail-panel">
    <div class="card-heading">
      <div>
        <span class="eyebrow">{{ eyebrow }}</span>
        <h2>{{ title }}</h2>
      </div>
      <button v-if="item" class="secondary-button" type="button" @click="$emit('clear')">
        Clear
      </button>
    </div>

    <p v-if="!item" class="muted">No item selected.</p>

    <template v-else>
      <div class="item-detail-hero">
        <ItemArtwork :definition-id="definitionId" :kind="kind" />
        <div>
          <h3>{{ item.label ?? item.id }}</h3>
          <div class="control-row">
            <span v-if="item.type" class="pill muted-pill">{{ item.type }}</span>
            <span v-if="item.rarity" :class="['pill', `rarity-${item.rarity}`]">
              {{ item.rarity }}
            </span>
            <span v-if="item.element" :class="['pill', `element-${item.element}`]">
              {{ item.element }}
            </span>
          </div>
        </div>
      </div>

      <dl class="summary-grid item-detail-grid">
        <div v-if="hasNumber(item.level)" class="stat">
          <dt>Level</dt>
          <dd>{{ item.level }}</dd>
        </div>
        <div v-if="hasNumber(item.experience)" class="stat">
          <dt>XP</dt>
          <dd>{{ item.experience }}</dd>
        </div>
        <div v-if="hasNumber(item.quality)" class="stat">
          <dt>Quality</dt>
          <dd>
            {{ item.quality }}
            <template v-if="hasNumber(item.nextQuality)"> -> {{ item.nextQuality }}</template>
          </dd>
        </div>
        <div v-if="hasNumber(item.quantity)" class="stat">
          <dt>Quantity</dt>
          <dd>{{ item.quantity }}</dd>
        </div>
        <div v-if="hasNumber(item.socketCount)" class="stat">
          <dt>Sockets</dt>
          <dd>
            {{ item.socketCount }}
            <template v-if="hasNumber(item.nextSocketCount)">
              -> {{ item.nextSocketCount }}
            </template>
          </dd>
        </div>
        <div v-if="hasNumber(item.cost)" class="stat">
          <dt>Cost</dt>
          <dd>{{ item.cost }}</dd>
        </div>
        <div v-if="hasNumber(item.buyPrice)" class="stat">
          <dt>Buy Price</dt>
          <dd>{{ item.buyPrice }}</dd>
        </div>
        <div v-if="hasNumber(item.sellPrice)" class="stat">
          <dt>Sell Price</dt>
          <dd>{{ item.sellPrice }}</dd>
        </div>
        <div v-if="hasNumber(item.socketImprovementCost)" class="stat">
          <dt>Socket Cost</dt>
          <dd>{{ item.socketImprovementCost }}</dd>
        </div>
      </dl>

      <section v-if="primaryStats.length > 0" class="item-detail-section">
        <h3>Stats</h3>
        <dl class="summary-grid item-detail-grid">
          <div v-for="stat in primaryStats" :key="stat.label" class="stat">
            <dt>{{ stat.label }}</dt>
            <dd>{{ stat.value }}</dd>
          </div>
        </dl>
      </section>

      <section v-if="previewStats.length > 0" class="item-detail-section">
        <h3>Preview</h3>
        <div class="quality-stat-list">
          <article v-for="stat in previewStats" :key="stat.label" class="quality-stat">
            <span>{{ stat.label }}</span>
            <strong>
              {{ stat.current }}
              <template v-if="stat.next > stat.current">
                -> <span class="positive">{{ stat.next }}</span>
              </template>
              <template v-else>-> {{ stat.next }}</template>
            </strong>
          </article>
        </div>
      </section>

      <section v-if="usageEntries.length > 0" class="item-detail-section">
        <h3>Usage</h3>
        <dl class="summary-grid item-detail-grid">
          <div v-for="entry in usageEntries" :key="entry.label" class="stat">
            <dt>{{ entry.label }}</dt>
            <dd>{{ entry.value }}</dd>
          </div>
        </dl>
      </section>

      <section v-if="materialEntries.length > 0" class="item-detail-section">
        <h3>Material</h3>
        <dl class="summary-grid item-detail-grid">
          <div v-for="entry in materialEntries" :key="entry.label" class="stat">
            <dt>{{ entry.label }}</dt>
            <dd>{{ entry.value }}</dd>
          </div>
        </dl>
        <p v-if="item.description" class="muted">{{ item.description }}</p>
      </section>

      <section v-if="item.gems?.length" class="item-detail-section">
        <h3>Socketed Gems</h3>
        <ul class="detail-list">
          <li v-for="gem in item.gems" :key="gem.id">
            <ItemArtwork :definition-id="gem.definitionId" kind="gem" />
            <div>
              <strong>{{ gem.socketIndex + 1 }}. {{ gem.label }}</strong>
              <small>
                Damage {{ gem.damage }}, Energy +{{ gem.energyPenalty }}, Cooldown +{{
                  gem.cooldownPenalty
                }}
              </small>
              <small v-if="gem.enchantment">
                {{ gem.enchantment.type }}: {{ gem.enchantment.label }}
              </small>
            </div>
          </li>
        </ul>
      </section>

      <section v-if="item.enchantment" class="item-detail-section">
        <h3>Enchantment</h3>
        <div class="detail-list">
          <div>
            <ItemArtwork
              :definition-id="item.enchantment.definitionId"
              :kind="item.enchantment.type"
            />
            <div>
              <strong>{{ item.enchantment.label }}</strong>
              <small>{{ item.enchantment.type }} damage {{ item.enchantment.damage }}</small>
            </div>
          </div>
        </div>
      </section>

      <section class="item-detail-section">
        <h3>Technical</h3>
        <dl class="summary-grid item-detail-grid">
          <div v-if="item.id" class="stat">
            <dt>ID</dt>
            <dd>
              <code>{{ item.id }}</code>
            </dd>
          </div>
          <div v-if="item.definitionId" class="stat">
            <dt>Definition</dt>
            <dd>
              <code>{{ item.definitionId }}</code>
            </dd>
          </div>
        </dl>
      </section>
    </template>
  </aside>
</template>

<script setup lang="ts">
type DetailStat = {
  label: string;
  current: number;
  next: number;
};

type DetailGem = {
  id: string;
  definitionId: string;
  label: string;
  socketIndex: number;
  damage: number;
  energyPenalty: number;
  cooldownPenalty: number;
  enchantment?: {
    id: string;
    type: string;
    definitionId: string;
    label: string;
    damage: number;
  } | null;
};

type DetailItem = {
  id?: string;
  type?: string;
  definitionId?: string;
  label?: string;
  description?: string;
  rarity?: string;
  element?: string;
  craftingFamily?: string;
  realWorldType?: string;
  chemicalSymbol?: string | null;
  atomicNumber?: number | null;
  experience?: number;
  level?: number;
  quality?: number;
  nextQuality?: number;
  quantity?: number;
  socketCount?: number | null;
  nextSocketCount?: number | null;
  socketImprovementCost?: number | null;
  cost?: number | null;
  buyPrice?: number;
  sellPrice?: number;
  equipped?: boolean;
  slotIndex?: number | null;
  socketedRingId?: string | null;
  socketIndex?: number | null;
  enchantedGemId?: string | null;
  damage?: number;
  ringDamage?: number;
  gemDamage?: number;
  spellDamage?: number;
  monsterDamage?: number;
  health?: number;
  energyCost?: number;
  cooldown?: number;
  energyPenalty?: number;
  cooldownPenalty?: number;
  baseDamage?: number;
  baseEnergyCost?: number;
  baseCooldown?: number;
  baseSpeed?: number;
  skill?: string | null;
  stats?: DetailStat[];
  gems?: DetailGem[];
  enchantment?: DetailGem["enchantment"];
};

type DetailEntry = {
  label: string;
  value: string | number;
};

const props = withDefaults(
  defineProps<{
    item: DetailItem | null;
    title?: string;
    eyebrow?: string;
  }>(),
  {
    title: "Detail",
    eyebrow: "Inspect",
  },
);

defineEmits<{
  clear: [];
}>();

const kind = computed(() => props.item?.type ?? "material");
const definitionId = computed(() => props.item?.definitionId ?? props.item?.id ?? "");

const primaryStats = computed(() => {
  const item = props.item;
  if (!item) {
    return [];
  }

  const entries: { label: string; value: string | number | undefined }[] = [
    { label: "Damage", value: item.damage },
    { label: "Ring Damage", value: item.ringDamage },
    { label: "Gem Damage", value: item.gemDamage },
    { label: "Spell Damage", value: item.spellDamage },
    { label: "Monster Damage", value: item.monsterDamage },
    { label: "Health", value: item.health },
    { label: "Energy Cost", value: item.energyCost },
    { label: "Cooldown", value: item.cooldown },
    { label: "Energy Penalty", value: item.energyPenalty },
    { label: "Cooldown Penalty", value: item.cooldownPenalty },
    { label: "Base Damage", value: item.baseDamage },
    { label: "Base Energy", value: item.baseEnergyCost },
    { label: "Base Cooldown", value: item.baseCooldown },
    { label: "Base Speed", value: item.baseSpeed },
    { label: "Skill", value: item.skill ?? undefined },
  ];

  return entries.filter(isDetailEntry);
});

const previewStats = computed(() => props.item?.stats ?? []);

const usageEntries = computed(() => {
  const item = props.item;
  if (!item) {
    return [];
  }

  const entries: { label: string; value: string | number | undefined }[] = [
    {
      label: "Equipped",
      value: item.equipped === undefined ? undefined : item.equipped ? "Yes" : "No",
    },
    {
      label: "Slot",
      value:
        item.slotIndex === null || item.slotIndex === undefined ? undefined : item.slotIndex + 1,
    },
    { label: "Socketed Ring", value: item.socketedRingId ?? undefined },
    {
      label: "Socket Index",
      value:
        item.socketIndex === null || item.socketIndex === undefined
          ? undefined
          : item.socketIndex + 1,
    },
    { label: "Enchanted Gem", value: item.enchantedGemId ?? undefined },
  ];

  return entries.filter(isDetailEntry);
});

const materialEntries = computed(() => {
  const item = props.item;
  if (!item) {
    return [];
  }

  const entries: { label: string; value: string | number | undefined }[] = [
    { label: "Family", value: item.craftingFamily },
    { label: "Real Type", value: item.realWorldType },
    { label: "Symbol", value: item.chemicalSymbol ?? undefined },
    { label: "Atomic Number", value: item.atomicNumber ?? undefined },
  ];

  return entries.filter(isDetailEntry);
});

function isDetailEntry(entry: {
  label: string;
  value: string | number | undefined;
}): entry is DetailEntry {
  return entry.value !== undefined;
}

function hasNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}
</script>
