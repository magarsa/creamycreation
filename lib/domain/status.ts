import type { Database } from "@/lib/db/types";
import type { ChipVariant } from "@/lib/ui/chip";

export type InquiryStatus = Database["public"]["Enums"]["inquiry_status"];

export const STATUS_LABELS: Record<InquiryStatus, string> = {
  submitted: "New request",
  needs_quote: "Needs a quote",
  quoted: "Quoted",
  confirmed: "Confirmed",
  completed: "Completed",
  cancelled: "Cancelled",
};

// Colors follow the state-color rule (PLAN.md §6): coral = needs attention
// (new), amber = done (confirmed/completed), violet = in progress (quoted),
// neutral grey = parked (needs-quote/cancelled).
export const STATUS_VARIANT: Record<InquiryStatus, ChipVariant> = {
  submitted: "coral",
  needs_quote: "category-just_because",
  quoted: "violet",
  confirmed: "amber",
  completed: "amber",
  cancelled: "category-just_because",
};

/** Allowed forward transitions from each status. */
export const STATUS_FLOW: Record<InquiryStatus, InquiryStatus[]> = {
  submitted: ["needs_quote", "quoted", "confirmed", "cancelled"],
  needs_quote: ["quoted", "confirmed", "cancelled"],
  quoted: ["confirmed", "cancelled"],
  confirmed: ["completed", "cancelled"],
  completed: [],
  cancelled: [],
};

export function canTransition(from: InquiryStatus, to: InquiryStatus): boolean {
  return STATUS_FLOW[from].includes(to);
}
