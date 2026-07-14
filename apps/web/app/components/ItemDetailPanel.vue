<template>
  <aside class="panel item-detail-panel">
    <div class="card-heading">
      <div>
        <span class="eyebrow">{{ eyebrow ?? t("common.inspect") }}</span>
        <h2>{{ title ?? t("itemDetail.title") }}</h2>
      </div>
      <button v-if="item" class="secondary-button" type="button" @click="$emit('clear')">
        {{ t("itemDetail.clear") }}
      </button>
    </div>

    <p v-if="!item" class="muted">{{ t("itemDetail.noneSelected") }}</p>

    <template v-else>
      <div class="item-detail-hero">
        <ItemArtwork :definition-id="definitionId" :kind="kind" />
        <div>
          <h3>{{ localizedItemName }}</h3>
          <div class="control-row">
            <span v-if="item.type" class="pill muted-pill">{{ t(`itemType.${item.type}`) }}</span>
            <span v-if="item.rarity" :class="['pill', `rarity-${item.rarity}`]">
              {{ t(`rarity.${item.rarity}`) }}
            </span>
            <span v-if="item.element" :class="['pill', `element-${item.element}`]">
              {{ t(`element.${item.element}`) }}
            </span>
          </div>
        </div>
      </div>

      <dl class="summary-grid item-detail-grid">
        <div v-if="hasNumber(item.level)" class="stat">
          <dt>{{ t("common.level") }}</dt>
          <dd>{{ item.level }}</dd>
        </div>
        <div v-if="hasNumber(item.experience)" class="stat">
          <dt>XP</dt>
          <dd>{{ item.experience }}</dd>
        </div>
        <div v-if="hasNumber(item.quality)" class="stat">
          <dt>{{ t("common.quality") }}</dt>
          <dd>
            {{ item.quality }}
            <template v-if="hasNumber(item.nextQuality)"> -> {{ item.nextQuality }}</template>
          </dd>
        </div>
        <div v-if="hasNumber(item.quantity)" class="stat">
          <dt>{{ t("itemDetail.quantity") }}</dt>
          <dd>{{ item.quantity }}</dd>
        </div>
        <div v-if="hasNumber(item.socketCount)" class="stat">
          <dt>{{ t("stats.sockets") }}</dt>
          <dd>
            {{ item.socketCount }}
            <template v-if="hasNumber(item.nextSocketCount)">
              -> {{ item.nextSocketCount }}
            </template>
          </dd>
        </div>
        <div v-if="hasNumber(item.cost)" class="stat">
          <dt>{{ t("common.cost") }}</dt>
          <dd>{{ item.cost }}</dd>
        </div>
        <div v-if="hasNumber(item.buyPrice)" class="stat">
          <dt>{{ t("itemDetail.buyPrice") }}</dt>
          <dd>{{ item.buyPrice }}</dd>
        </div>
        <div v-if="hasNumber(item.sellPrice)" class="stat">
          <dt>{{ t("itemDetail.sellPrice") }}</dt>
          <dd>{{ item.sellPrice }}</dd>
        </div>
        <div v-if="hasNumber(item.socketImprovementCost)" class="stat">
          <dt>{{ t("itemDetail.socketCost") }}</dt>
          <dd>{{ item.socketImprovementCost }}</dd>
        </div>
      </dl>

      <section v-if="item.progression" class="item-detail-section">
        <h3>{{ t("progression.title") }}</h3>
        <ExperienceProgress
          :progress="item.progression"
          :label="t('progression.itemExperience', { item: localizedItemName })"
        />
        <p v-if="hasNumber(item.bonusPercent)" class="muted">
          {{ t("itemDetail.currentBonus") }}
          <strong class="positive">+{{ item.bonusPercent }}%</strong>
          {{ t("itemDetail.bonusSource") }}
        </p>
      </section>

      <section v-if="primaryStats.length > 0" class="item-detail-section">
        <h3>{{ t("itemDetail.stats") }}</h3>
        <dl class="summary-grid item-detail-grid">
          <div v-for="stat in primaryStats" :key="stat.label" class="stat">
            <dt>{{ stat.label }}</dt>
            <dd>{{ stat.value }}</dd>
          </div>
        </dl>
      </section>

      <section v-if="previewStats.length > 0" class="item-detail-section">
        <h3>{{ t("itemDetail.preview") }}</h3>
        <div class="quality-stat-list">
          <article v-for="stat in previewStats" :key="stat.label" class="quality-stat">
            <span>{{ localizeStatLabel(stat.label) }}</span>
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
        <h3>{{ t("itemDetail.usage") }}</h3>
        <dl class="summary-grid item-detail-grid">
          <div v-for="entry in usageEntries" :key="entry.label" class="stat">
            <dt>{{ entry.label }}</dt>
            <dd>{{ entry.value }}</dd>
          </div>
        </dl>
      </section>

      <section v-if="materialEntries.length > 0" class="item-detail-section">
        <h3>{{ t("itemType.material") }}</h3>
        <dl class="summary-grid item-detail-grid">
          <div v-for="entry in materialEntries" :key="entry.label" class="stat">
            <dt>{{ entry.label }}</dt>
            <dd>{{ entry.value }}</dd>
          </div>
        </dl>
        <p v-if="item.description" class="muted">{{ localizedDescription }}</p>
      </section>

      <section v-if="item.gems?.length" class="item-detail-section">
        <h3>{{ t("itemDetail.socketedGems") }}</h3>
        <ul class="detail-list">
          <li v-for="gem in item.gems" :key="gem.id">
            <ItemArtwork :definition-id="gem.definitionId" kind="gem" />
            <div>
              <strong
                >{{ gem.socketIndex + 1 }}.
                {{ itemName("gem", gem.definitionId, gem.label) }}</strong
              >
              <small>
                {{
                  t("forge.socket.gemStats", {
                    damage: gem.damage,
                    energy: gem.energyPenalty,
                    cooldown: gem.cooldownPenalty,
                  })
                }}
              </small>
              <small v-if="gem.enchantment">
                {{ t(`itemType.${gem.enchantment.type}`) }}:
                {{
                  itemName(
                    gem.enchantment.type,
                    gem.enchantment.definitionId,
                    gem.enchantment.label,
                  )
                }}
              </small>
            </div>
          </li>
        </ul>
      </section>

      <section v-if="item.enchantment" class="item-detail-section">
        <h3>{{ t("itemDetail.enchantment") }}</h3>
        <div class="detail-list">
          <div>
            <ItemArtwork
              :definition-id="item.enchantment.definitionId"
              :kind="item.enchantment.type"
            />
            <div>
              <strong>{{
                itemName(
                  item.enchantment.type,
                  item.enchantment.definitionId,
                  item.enchantment.label,
                )
              }}</strong>
              <small>{{
                t("itemDetail.enchantmentDamage", {
                  type: t(`itemType.${item.enchantment.type}`),
                  damage: item.enchantment.damage,
                })
              }}</small>
            </div>
          </div>
        </div>
      </section>

      <section class="item-detail-section">
        <h3>{{ t("itemDetail.technical") }}</h3>
        <dl class="summary-grid item-detail-grid">
          <div v-if="item.id" class="stat">
            <dt>ID</dt>
            <dd>
              <code>{{ item.id }}</code>
            </dd>
          </div>
          <div v-if="item.definitionId" class="stat">
            <dt>{{ t("itemDetail.definition") }}</dt>
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
  progression?: import("~/utils/playerState").ExperienceProgressView;
  bonusPercent?: number;
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

const props = defineProps<{
  item: DetailItem | null;
  title?: string;
  eyebrow?: string;
}>();
const { t } = useI18n();
const contentText = useContentText();

defineEmits<{
  clear: [];
}>();

const kind = computed(() => {
  const item = props.item;
  if (!item) {
    return "material";
  }
  if (item.type) {
    return item.type;
  }
  if (item.gems || item.ringDamage !== undefined || item.baseEnergyCost !== undefined) {
    return "ring";
  }
  if (item.socketedRingId !== undefined || item.socketIndex !== undefined) {
    return "gem";
  }
  if (item.health !== undefined) {
    return "monster";
  }
  if (item.energyPenalty !== undefined) {
    return "spell";
  }
  return "material";
});
const definitionId = computed(() => props.item?.definitionId ?? props.item?.id ?? "");
const localizedItemName = computed(() => {
  const item = props.item;
  if (!item) {
    return "";
  }
  return itemName(kind.value, definitionId.value, item.label ?? item.id ?? "");
});
const localizedDescription = computed(() => {
  const item = props.item;
  if (!item?.description) {
    return "";
  }
  return contentText(`${kind.value}.${definitionId.value}.description`, item.description);
});

const primaryStats = computed(() => {
  const item = props.item;
  if (!item) {
    return [];
  }

  const entries: { label: string; value: string | number | undefined }[] = [
    { label: t("stats.damage"), value: item.damage },
    { label: t("itemDetail.ringDamage"), value: item.ringDamage },
    { label: t("itemDetail.gemDamage"), value: item.gemDamage },
    { label: t("itemDetail.spellDamage"), value: item.spellDamage },
    { label: t("itemDetail.monsterDamage"), value: item.monsterDamage },
    { label: t("stats.health"), value: item.health },
    { label: t("itemDetail.energyCost"), value: item.energyCost },
    { label: t("stats.cooldown"), value: item.cooldown },
    { label: t("itemDetail.energyPenalty"), value: item.energyPenalty },
    { label: t("itemDetail.cooldownPenalty"), value: item.cooldownPenalty },
    { label: t("itemDetail.baseDamage"), value: item.baseDamage },
    { label: t("itemDetail.baseEnergy"), value: item.baseEnergyCost },
    { label: t("itemDetail.baseCooldown"), value: item.baseCooldown },
    { label: t("itemDetail.baseSpeed"), value: item.baseSpeed },
    { label: t("itemDetail.skill"), value: item.skill ?? undefined },
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
      label: t("itemDetail.equipped"),
      value:
        item.equipped === undefined ? undefined : t(item.equipped ? "common.yes" : "common.no"),
    },
    {
      label: t("itemDetail.slot"),
      value:
        item.slotIndex === null || item.slotIndex === undefined ? undefined : item.slotIndex + 1,
    },
    { label: t("itemDetail.socketedRing"), value: item.socketedRingId ?? undefined },
    {
      label: t("itemDetail.socketIndex"),
      value:
        item.socketIndex === null || item.socketIndex === undefined
          ? undefined
          : item.socketIndex + 1,
    },
    { label: t("itemDetail.enchantedGem"), value: item.enchantedGemId ?? undefined },
  ];

  return entries.filter(isDetailEntry);
});

const materialEntries = computed(() => {
  const item = props.item;
  if (!item) {
    return [];
  }

  const entries: { label: string; value: string | number | undefined }[] = [
    { label: t("itemDetail.family"), value: item.craftingFamily },
    { label: t("itemDetail.realType"), value: item.realWorldType },
    { label: t("itemDetail.symbol"), value: item.chemicalSymbol ?? undefined },
    { label: t("itemDetail.atomicNumber"), value: item.atomicNumber ?? undefined },
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

function itemName(type: string, id: string, fallback: string): string {
  return contentText(`${type}.${id}.name`, fallback);
}

function localizeStatLabel(label: string): string {
  const key = label.toLowerCase().replaceAll(" ", "");
  return t(`itemDetail.stat.${key}`, label);
}
</script>
