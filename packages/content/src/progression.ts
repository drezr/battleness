export const MAX_LEVEL = 50;
export const MAX_QUALITY = 100;

const EXPERIENCE_FACTOR = 100;
const ITEM_LEVEL_BONUS_PERCENT = 2;
const QUALITY_BONUS_DIVISOR = 4;
const HERO_BASE_HEALTH = 30;

export function experienceForLevel(level: number): number {
  assertLevel(level);
  return EXPERIENCE_FACTOR * level ** 2;
}

export function levelFromExperience(experience: number): number {
  assertNonnegativeInteger(experience, "Experience");
  return Math.min(MAX_LEVEL, Math.floor(Math.sqrt(experience / EXPERIENCE_FACTOR)));
}

export function itemBonusPercent(level: number, quality: number): number {
  assertLevel(level);
  assertQuality(quality);
  return (
    Math.max(0, level - 1) * ITEM_LEVEL_BONUS_PERCENT + Math.floor(quality / QUALITY_BONUS_DIVISOR)
  );
}

export function resolveItemStat(baseStat: number, level: number, quality: number): number {
  assertNonnegativeInteger(baseStat, "Base stat");
  return Math.floor((baseStat * (100 + itemBonusPercent(level, quality))) / 100);
}

export function resolveHeroMaxHealth(level: number): number {
  assertLevel(level);
  return HERO_BASE_HEALTH + Math.floor((HERO_BASE_HEALTH * level) / MAX_LEVEL);
}

export function spellPenaltyReduction(level: number, quality: number): number {
  assertLevel(level);
  assertQuality(quality);
  return 0;
}

export function resolveSpellPenalty(basePenalty: number, level: number, quality: number): number {
  assertNonnegativeInteger(basePenalty, "Base penalty");
  return Math.max(0, basePenalty - spellPenaltyReduction(level, quality));
}

function assertLevel(level: number): void {
  assertNonnegativeInteger(level, "Level");
  if (level > MAX_LEVEL) {
    throw new RangeError(`Level cannot exceed ${MAX_LEVEL}.`);
  }
}

function assertQuality(quality: number): void {
  assertNonnegativeInteger(quality, "Quality");
  if (quality > MAX_QUALITY) {
    throw new RangeError(`Quality cannot exceed ${MAX_QUALITY}.`);
  }
}

function assertNonnegativeInteger(value: number, label: string): void {
  if (!Number.isInteger(value) || value < 0) {
    throw new RangeError(`${label} must be a nonnegative integer.`);
  }
}
