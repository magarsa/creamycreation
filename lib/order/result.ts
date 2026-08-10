import type { Category } from "@/lib/domain/order";

/** Handed from the review page to /order/sent via sessionStorage. */
export const RESULT_KEY = "cc_order_result";

export interface OrderResult {
  inquiry_id: string;
  ig_deep_link: string;
  event_date: string;
  occasion: Category;
  size: string;
  flavour: string;
  estimated_price_min_cents: number | null;
  estimated_price_max_cents: number | null;
}
