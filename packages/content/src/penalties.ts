const PENALTY_SCALE = 10;

export function sumItemPenalties(values: readonly number[]): number {
  return sumPenaltyTenths(values) / PENALTY_SCALE;
}

export function resolveItemPenaltyIncrease(values: readonly number[]): number {
  return Math.floor(sumPenaltyTenths(values) / PENALTY_SCALE);
}

function sumPenaltyTenths(values: readonly number[]): number {
  return values.reduce((total, value) => total + penaltyTenths(value), 0);
}

function penaltyTenths(value: number): number {
  if (!Number.isFinite(value) || value < 0) {
    throw new RangeError("Item penalties must be finite nonnegative numbers.");
  }
  const tenths = Math.round(value * PENALTY_SCALE);
  if (Math.abs(value * PENALTY_SCALE - tenths) > Number.EPSILON * 100) {
    throw new RangeError("Item penalties must use increments of one tenth.");
  }
  return tenths;
}
