import { describe, expect, it } from "vitest";
import { resolveItemPenaltyIncrease, sumItemPenalties } from "./penalties";

describe("item penalties", () => {
  it("sums decimal penalties before flooring the final increase", () => {
    expect(sumItemPenalties([0.7, 0.6, 0.5])).toBe(1.8);
    expect(resolveItemPenaltyIncrease([0.7, 0.6, 0.5])).toBe(1);
    expect(resolveItemPenaltyIncrease([1.4, 0.8, 0.7])).toBe(2);
  });
});
