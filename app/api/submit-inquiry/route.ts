import { NextResponse } from "next/server";
import { inquirySubmissionSchema } from "@/lib/domain/order";
import { buildInstagramDeepLink } from "@/lib/domain/instagram";
import { createInquiry, markNotification } from "@/lib/db/inquiries";
import { getBlockedDates, getPublicConfig } from "@/lib/db/queries";
import { dayState, todayKeyInTz } from "@/lib/domain/availability";
import { sendBakerNotification } from "@/lib/notifications/resend";
import { formatEventDate } from "@/lib/order/format";
import { OCCASION_LABELS } from "@/lib/domain/order";
import { bakeryIdentity } from "@/lib/bakery";

/*
 * Submit an inquiry. Flow (§5):
 *   validate → check the date is still bookable → service-role insert
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

  let inquiry;
  let duplicate;
  try {
    ({ inquiry, duplicate } = await createInquiry(sub));
  } catch (err) {
    console.error("createInquiry failed:", err);
    return NextResponse.json({ error: "server" }, { status: 500 });
  }

  // Email only on the first submit; a duplicate already notified.
  if (!duplicate) {
    const notif = await sendBakerNotification({
      inquiryId: inquiry.id,
      preferredName: inquiry.preferred_name,
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
