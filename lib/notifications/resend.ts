import { OCCASION_LABELS, type Category } from "@/lib/domain/order";

/*
 * Resend email — called via fetch (no SDK dependency). The baker learns about a
 * new inquiry from this email, so the caller MUST record whether it succeeded
 * (notification_status). If it fails, the inquiry is still saved and surfaces in
 * the nightly "unnotified" alert (Phase 2) — an email failure never loses an order.
 *
 * Dev note: Resend test mode only delivers from `onboarding@resend.dev` to your
 * own Resend account email. With placeholder from/to this returns ok:false, which
 * is the correct "failed" path — set RESEND_FROM + BAKERY_PRIMARY_EMAIL to real
 * verified values for actual delivery.
 */
export interface BakerNotification {
  inquiryId: string;
  preferredName: string;
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
  if (!apiKey || !from || !to) {
    return { ok: false, error: "Resend not configured" };
  }

  const rows: Array<[string, string | undefined]> = [
    ["Name", n.preferredName],
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

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from,
        to,
        subject: `New cake inquiry — ${n.preferredName}, ${n.eventDate}`,
        html,
      }),
    });
    if (!res.ok) {
      return { ok: false, error: `Resend ${res.status}` };
    }
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "fetch failed" };
  }
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
