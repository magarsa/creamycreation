import { NextResponse } from "next/server";
import { inquirySubmissionSchema } from "@/lib/domain/order";
import { buildInstagramDeepLink } from "@/lib/domain/instagram";
import { createInquiry, markNotification, type SelectedAddon } from "@/lib/db/inquiries";
import {
  getActiveAddons,
  getActiveSizes,
  getBlockedDates,
  getPublicConfig,
} from "@/lib/db/queries";
import { dayState, todayKeyInTz } from "@/lib/domain/availability";
import { estimateTotal, type PriceRange } from "@/lib/domain/pricing";
import { sendBakerNotification } from "@/lib/notifications/resend";
import { formatEventDate } from "@/lib/order/format";
import { OCCASION_LABELS } from "@/lib/domain/order";
import { bakeryIdentity } from "@/lib/bakery";

/*
 * Submit an inquiry. Flow (§5):
 *   validate → check the date is still bookable → check size/add-ons are
 *   still active and compute the authoritative price → service-role insert
 *   (idempotent) → move photos → email baker (non-fatal; recorded in
 *   notification_status) → return IG deep link.
 * Rate limiting is enforced at the Cloudflare edge (a Rate Limiting rule), not
 * here, per the plan — so there is no in-code 429.
 */

const DEFAULT_MIN_NOTICE = 7;
export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  const parsed = inquirySubmissionSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "validation", issues: parsed.error.flatten().fieldErrors },
      { status: 422 },
    );
  }
  const sub = parsed.data;

  // The picker greys these dates out, but the endpoint is public: re-check here
  // so a stale sessionStorage draft, or a hand-rolled POST, can't book a day the
  // baker has already given away.
  const dateError = await checkDateBookable(sub.event_date);
  if (dateError) {
    return NextResponse.json(
      { error: "validation", issues: { event_date: [dateError] } },
      { status: 422 },
    );
  }

  // Same idea for price: the size/add-on the customer picked, and the price
  // shown for it, must still be what the baker currently offers — never trust
  // a client-sent price.
  const pricing = await resolvePricing(sub.size, sub.addon_ids ?? []);
  if (!pricing.ok) {
    return NextResponse.json(
      { error: "validation", issues: { size: [pricing.error] } },
      { status: 422 },
    );
  }

  let inquiry;
  let duplicate;
  try {
    ({ inquiry, duplicate } = await createInquiry(
      sub,
      pricing.estimate,
      pricing.addons,
    ));
  } catch (err) {
    console.error("createInquiry failed:", err);
    return NextResponse.json({ error: "server" }, { status: 500 });
  }

  // Email only on the first submit; a duplicate already notified.
  if (!duplicate) {
    const notif = await sendBakerNotification({
      inquiryId: inquiry.id,
      preferredName: inquiry.preferred_name,
      // The DB column is nullable only for pre-migration rows; the Zod schema
      // guarantees sub.email on every new submission, so this always exists here.
      email: inquiry.email ?? "",
      eventDate: inquiry.event_date,
      occasion: inquiry.occasion,
      size: inquiry.size,
      flavour: inquiry.flavour,
      igHandle: inquiry.ig_handle ?? undefined,
      message: inquiry.message ?? undefined,
      notes: inquiry.notes ?? undefined,
    });
    await markNotification(inquiry.id, notif.ok ? "sent" : "failed");
  }

  const igDeepLink = buildInstagramDeepLink(
    bakeryIdentity().igHandle,
    {
      name: inquiry.preferred_name,
      date: formatEventDate(inquiry.event_date),
      occasion: OCCASION_LABELS[inquiry.occasion],
      size: inquiry.size,
      flavour: inquiry.flavour,
    },
    inquiry.id,
  );

  return NextResponse.json({
    inquiry_id: inquiry.id,
    ig_deep_link: igDeepLink,
    duplicate,
    // The server-computed estimate, so /order/sent can show exactly what was
    // recorded rather than recomputing from (possibly stale) client state.
    estimated_price_min_cents: inquiry.estimated_price_min_cents,
    estimated_price_max_cents: inquiry.estimated_price_max_cents,
  });
}

/** A customer-facing reason the date can't be taken, or null if it's fine. */
async function checkDateBookable(eventDate: string): Promise<string | null> {
  const todayKey = todayKeyInTz(bakeryIdentity().timezone);

  const [config, blockedDates] = await Promise.all([
    getPublicConfig(),
    getBlockedDates(eventDate, eventDate),
  ]);

  // Vacation mode isn't a date property, but it's the same "not taking this" answer.
  if (config?.vacation_mode) {
    return config.vacation_message ?? "Not taking new dates right now.";
  }

  const state = dayState(eventDate, {
    todayKey,
    minNoticeDays: config?.min_notice_days ?? DEFAULT_MIN_NOTICE,
    blockedDates: new Set(blockedDates),
  });
  if (state === "unavailable") {
    return "That date isn't available any more — please pick another.";
  }
  return null;
}

type PricingResult =
  | { ok: true; estimate: PriceRange; addons: SelectedAddon[] }
  | { ok: false; error: string };

/** Re-checks the submitted size/add-ons against what's actually active right
 * now, and computes the estimate server-side from those live prices. */
async function resolvePricing(
  sizeLabel: string,
  addonIds: string[],
): Promise<PricingResult> {
  const [sizes, addons] = await Promise.all([getActiveSizes(), getActiveAddons()]);

  const size = sizes.find((s) => s.label === sizeLabel);
  if (!size) {
    return { ok: false, error: "That size isn't available any more — please pick another." };
  }

  const requested = new Set(addonIds);
  const selected = addons.filter((a) => requested.has(a.id));
  if (selected.length !== requested.size) {
    return { ok: false, error: "One of the add-ons you picked isn't available any more." };
  }

  return {
    ok: true,
    estimate: estimateTotal(size.base_price_cents, selected),
    addons: selected.map((a) => ({
      addon_id: a.id,
      label: a.label,
      price_min_cents: a.price_min_cents,
      price_max_cents: a.price_max_cents,
    })),
  };
}
