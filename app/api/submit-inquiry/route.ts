import { NextResponse } from "next/server";
import { inquirySubmissionSchema } from "@/lib/domain/order";
import { buildInstagramDeepLink } from "@/lib/domain/instagram";
import { createInquiry, markNotification } from "@/lib/db/inquiries";
import { sendBakerNotification } from "@/lib/notifications/resend";
import { formatEventDate } from "@/lib/order/format";
import { OCCASION_LABELS } from "@/lib/domain/order";
import { bakeryIdentity } from "@/lib/bakery";

/*
 * Submit an inquiry. Flow (§5):
 *   validate → service-role insert (idempotent) → move photos → email baker
 *   (non-fatal; recorded in notification_status) → return IG deep link.
 * Rate limiting is enforced at the Cloudflare edge (a Rate Limiting rule), not
 * here, per the plan — so there is no in-code 429.
 */
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
