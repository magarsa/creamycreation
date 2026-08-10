import { describe, expect, it } from "vitest";
import { estimateTotal, formatPriceRange } from "./pricing";

describe("estimateTotal", () => {
  it("returns the base price alone with no add-ons", () => {
    expect(estimateTotal(6500, [])).toEqual({ minCents: 6500, maxCents: 6500 });
  });

  it("adds one add-on's range onto the base price", () => {
    const addons = [{ price_min_cents: 1000, price_max_cents: 2500 }];
    expect(estimateTotal(6500, addons)).toEqual({
      minCents: 7500,
      maxCents: 9000,
    });
  });

  it("sums multiple add-ons independently for min and max", () => {
    const addons = [
      { price_min_cents: 1000, price_max_cents: 2500 },
      { price_min_cents: 800, price_max_cents: 2000 },
      { price_min_cents: 5000, price_max_cents: 9000 },
    ];
    expect(estimateTotal(6500, addons)).toEqual({
      minCents: 13300,
      maxCents: 20000,
    });
  });
});

describe("formatPriceRange", () => {
  it("renders a single price with no dash when min equals max", () => {
    expect(formatPriceRange({ minCents: 6500, maxCents: 6500 })).toBe("$65");
  });

  it("renders a dash range when min and max differ", () => {
    expect(formatPriceRange({ minCents: 7500, maxCents: 9000 })).toBe("$75–90");
  });

  it("keeps cents when the amount isn't a whole dollar", () => {
    expect(formatPriceRange({ minCents: 7550, maxCents: 7550 })).toBe("$75.50");
  });
});
