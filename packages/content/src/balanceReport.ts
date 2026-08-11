import {
  type GemDefinition,
  type MonsterDefinition,
  type RingDefinition,
  type SpellDefinition,
} from "./schemas";
import { resolveItemStat } from "./progression";

type ElementType = RingDefinition["element"];
type Rarity = RingDefinition["rarity"];

export type BalanceDefinitions = {
  rings: readonly RingDefinition[];
  gems: readonly GemDefinition[];
  monsters: readonly MonsterDefinition[];
  spells: readonly SpellDefinition[];
};

export type BalanceProfileId = "base" | "mid" | "max";

export type BalanceProfile = {
  id: BalanceProfileId;
  level: number;
  quality: number;
};

export type BalanceItemKind = "ring" | "gem" | "monster" | "spell";

export type BalanceMetricId =
  | "damage"
  | "damagePerCooldown"
  | "damagePerEnergy"
  | "damagePerPenalty"
  | "health"
  | "healthDamageTotal";

export type BalanceProfileStats = {
  profileId: BalanceProfileId;
  stats: Record<string, number>;
  primaryMetric: BalanceMetricId;
  primaryValue: number;
};

export type BalanceItemReport = {
  kind: BalanceItemKind;
  id: string;
  nameKey: string;
  element: ElementType;
  rarity: Rarity;
  profiles: BalanceProfileStats[];
};

export type BalanceWarning = {
  type: "highOutlier";
  kind: BalanceItemKind;
  itemId: string;
  profileId: BalanceProfileId;
  metric: BalanceMetricId;
  value: number;
  average: number;
};

export type BalanceReport = {
  profiles: BalanceProfile[];
  items: BalanceItemReport[];
  warnings: BalanceWarning[];
};

export const DEFAULT_BALANCE_PROFILES: readonly BalanceProfile[] = [
  { id: "base", level: 1, quality: 0 },
  { id: "mid", level: 10, quality: 50 },
  { id: "max", level: 50, quality: 100 },
] as const;

const HIGH_OUTLIER_RATIO = 1.5;

export function createBalanceReport(
  definitions: BalanceDefinitions,
  profiles: readonly BalanceProfile[] = DEFAULT_BALANCE_PROFILES,
): BalanceReport {
  const items: BalanceItemReport[] = [
    ...definitions.rings.map((definition) => createRingReport(definition, profiles)),
    ...definitions.gems.map((definition) => createGemReport(definition, profiles)),
    ...definitions.monsters.map((definition) => createMonsterReport(definition, profiles)),
    ...definitions.spells.map((definition) => createSpellReport(definition, profiles)),
  ];

  return {
    profiles: [...profiles],
    items,
    warnings: createBalanceWarnings(items),
  };
}

function createRingReport(
  definition: RingDefinition,
  profiles: readonly BalanceProfile[],
): BalanceItemReport {
  return {
    kind: "ring",
    id: definition.id,
    nameKey: definition.nameKey,
    element: definition.element,
    rarity: definition.rarity,
    profiles: profiles.map((profile) => {
      const damage = resolveItemStat(definition.baseDamage, profile.level, profile.quality);
      const damagePerEnergy = safeRatio(damage, definition.baseEnergyCost);
      const damagePerCooldown = safeRatio(damage, definition.baseCooldown);
      return {
        profileId: profile.id,
        primaryMetric: "damagePerEnergy",
        primaryValue: damagePerEnergy,
        stats: {
          damage,
          energy: definition.baseEnergyCost,
          cooldown: definition.baseCooldown,
          speed: definition.baseSpeed,
          damagePerEnergy,
          damagePerCooldown,
        },
      };
    }),
  };
}

function createGemReport(
  definition: GemDefinition,
  profiles: readonly BalanceProfile[],
): BalanceItemReport {
  return {
    kind: "gem",
    id: definition.id,
    nameKey: definition.nameKey,
    element: definition.element,
    rarity: definition.rarity,
    profiles: profiles.map((profile) => {
      const damage = resolveItemStat(definition.baseDamage, profile.level, profile.quality);
      const damagePerPenalty = safeRatio(
        damage,
        1 + definition.baseEnergyPenalty + definition.baseCooldownPenalty,
      );
      return {
        profileId: profile.id,
        primaryMetric: "damagePerPenalty",
        primaryValue: damagePerPenalty,
        stats: {
          damage,
          energyPenalty: definition.baseEnergyPenalty,
          cooldownPenalty: definition.baseCooldownPenalty,
          damagePerPenalty,
        },
      };
    }),
  };
}

function createMonsterReport(
  definition: MonsterDefinition,
  profiles: readonly BalanceProfile[],
): BalanceItemReport {
  return {
    kind: "monster",
    id: definition.id,
    nameKey: definition.nameKey,
    element: definition.element,
    rarity: definition.rarity,
    profiles: profiles.map((profile) => {
      const health = resolveItemStat(definition.baseHealth, profile.level, profile.quality);
      const damage = resolveItemStat(definition.baseDamage, profile.level, profile.quality);
      const damagePerCooldown = safeRatio(damage, definition.baseCooldown);
      const healthDamageTotal = health + damage;
      return {
        profileId: profile.id,
        primaryMetric: "healthDamageTotal",
        primaryValue: healthDamageTotal,
        stats: {
          health,
          damage,
          cooldown: definition.baseCooldown,
          speed: definition.baseSpeed,
          damagePerCooldown,
          healthDamageTotal,
        },
      };
    }),
  };
}

function createSpellReport(
  definition: SpellDefinition,
  profiles: readonly BalanceProfile[],
): BalanceItemReport {
  const baseDamage = definition.effects.reduce(
    (sum, effect) =>
      sum +
      (effect.type === "dealDamage" || effect.type === "dealDamageToAll"
        ? (effect.amount ?? 0)
        : 0),
    0,
  );
  return {
    kind: "spell",
    id: definition.id,
    nameKey: definition.nameKey,
    element: definition.element,
    rarity: definition.rarity,
    profiles: profiles.map((profile) => {
      const damage = resolveItemStat(baseDamage, profile.level, profile.quality);
      const damagePerPenalty = safeRatio(
        damage,
        1 + definition.baseEnergyPenalty + definition.baseCooldownPenalty,
      );
      return {
        profileId: profile.id,
        primaryMetric: "damagePerPenalty",
        primaryValue: damagePerPenalty,
        stats: {
          damage,
          energyPenalty: definition.baseEnergyPenalty,
          cooldownPenalty: definition.baseCooldownPenalty,
          damagePerPenalty,
        },
      };
    }),
  };
}

function createBalanceWarnings(items: readonly BalanceItemReport[]): BalanceWarning[] {
  const warnings: BalanceWarning[] = [];

  for (const item of items) {
    for (const profile of item.profiles) {
      const peers = items
        .filter(
          (candidate) =>
            candidate.kind === item.kind &&
            candidate.rarity === item.rarity &&
            candidate.id !== item.id,
        )
        .map((candidate) =>
          candidate.profiles.find(
            (candidateProfile) => candidateProfile.profileId === profile.profileId,
          ),
        )
        .filter((candidateProfile): candidateProfile is BalanceProfileStats =>
          Boolean(candidateProfile),
        );

      if (peers.length === 0) {
        continue;
      }

      const average =
        peers.reduce((sum, candidateProfile) => sum + candidateProfile.primaryValue, 0) /
        peers.length;
      if (average > 0 && profile.primaryValue >= average * HIGH_OUTLIER_RATIO) {
        warnings.push({
          type: "highOutlier",
          kind: item.kind,
          itemId: item.id,
          profileId: profile.profileId,
          metric: profile.primaryMetric,
          value: profile.primaryValue,
          average,
        });
      }
    }
  }

  return warnings.sort((first, second) => second.value - first.value);
}

function safeRatio(numerator: number, denominator: number): number {
  return denominator <= 0 ? numerator : numerator / denominator;
}
