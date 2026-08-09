import { OCCASION_LABELS, type Category } from "@/lib/domain/order";
import { escapeHtml, sendEmail } from "./email";

/*
 * The new-inquiry email. The baker learns about a new inquiry from this, so the
 * caller MUST record whether it succeeded (notification_status). If it fails,
 * the inquiry is still saved and surfaces in the "unnotified" queue (Phase 2) —
 * an email failure never loses an order. Transport lives in ./email.ts.
 *
 * BAKERY_BACKUP_EMAIL, if set, is cc'd — a second person/inbox that also learns
 * about new inquiries. Optional: unset is fine, no-op.
 *
 * Dev note: Resend test mode only delivers from `onboarding@resend.dev` to your
 * own Resend account email — for ANY recipient, cc included. With placeholder
 * from/to this returns ok:false, which is the correct "failed" path — set
 * RESEND_FROM + BAKERY_PRIMARY_EMAIL to real verified values for actual delivery.
 */
export interface BakerNotification {
  inquiryId: string;
  preferredName: string;
  email: string;
  eventDate: string;
  occasion: Category;
  size: string;
  flavour: string;
  igHandle?: string;
  message?: string;
  notes?: string;
}

export async function sendBakerNotification(
  n: BakerNotification,
): Promise<{ ok: boolean; error?: string }> {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.RESEND_FROM;
  const to = process.env.BAKERY_PRIMARY_EMAIL;
  const cc = process.env.BAKERY_BACKUP_EMAIL;
  if (!apiKey || !from || !to) {
    return { ok: false, error: "Resend not configured" };
  }

  const rows: Array<[string, string | undefined]> = [
    ["Name", n.preferredName],
    ["Email", n.email],
    ["Date", n.eventDate],
    ["Occasion", OCCASION_LABELS[n.occasion]],
    ["Size", n.size],
    ["Flavour", n.flavour],
    ["Instagram", n.igHandle],
    ["Message on cake", n.message],
    ["Notes", n.notes],
  ];
  const html = `
    <h2 style="font-family:sans-serif">New cake inquiry</h2>
    <table style="font-family:sans-serif;font-size:14px;border-collapse:collapse">
      ${rows
        .filter(([, v]) => v)
        .map(
          ([k, v]) =>
            `<tr><td style="padding:4px 12px 4px 0;color:#666">${k}</td><td style="padding:4px 0"><strong>${escapeHtml(
              v!,
            )}</strong></td></tr>`,
        )
        .join("")}
    </table>
    <p style="font-family:sans-serif;font-size:13px;color:#666">Ref ${n.inquiryId}. They were handed off to Instagram DM to continue.</p>`;

  const subject = `New cake inquiry — ${n.preferredName}, ${n.eventDate}`;

  return sendEmail({ apiKey, from, to, cc, subject, html });
}
