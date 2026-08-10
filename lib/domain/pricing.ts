/*
 * The one price calculator: turns a size's base price plus selected add-ons
 * into a range estimate. Pure (no framework/db imports) so both the order
 * flow and the public /flavours page can call it and never drift apart —
 * that's the whole point of this module existing.
 */

export interface PriceRange {
  minCents: number;
  maxCents: number;
}

export interface AddonPrice {
  price_min_cents: number;
  price_max_cents: number;
}

export function estimateTotal(baseCents: number, addons: AddonPrice[]): PriceRange {
  return addons.reduce(
    (acc, a) => ({
      minCents: acc.minCents + a.price_min_cents,
      maxCents: acc.maxCents + a.price_max_cents,
    }),
    { minCents: baseCents, maxCents: baseCents },
  );
}

/** "$65" when min === max, otherwise "$65–90" (one leading "$", not two). */
export function formatPriceRange({ minCents, maxCents }: PriceRange): string {
  if (minCents === maxCents) return `$${formatDollars(minCents)}`;
  return `$${formatDollars(minCents)}–${formatDollars(maxCents)}`;
}

function formatDollars(cents: number): string {
  const dollars = cents / 100;
  return Number.isInteger(dollars) ? String(dollars) : dollars.toFixed(2);
}
