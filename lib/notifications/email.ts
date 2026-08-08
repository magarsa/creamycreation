/*
 * The Resend transport, split out from resend.ts in Phase 3 so the cron worker
 * can send its sync-failure alert through the same path. Config is passed in
 * rather than read from process.env, because the worker gets its values from a
 * Cloudflare `env` binding, not the Node environment.
 *
 * Transport only — no message content, no notification_status bookkeeping. That
 * stays with the callers, who know what a failed send means for their flow.
 */

export interface EmailPayload {
  apiKey: string;
  from: string;
  to: string;
  cc?: string;
  subject: string;
  html: string;
}

export async function sendEmail(
  payload: EmailPayload,
): Promise<{ ok: boolean; error?: string }> {
  const { apiKey, cc, ...rest } = payload;
  try {
    // Resend's test mode (no verified domain) 403s the ENTIRE send if any
    // recipient — cc included — isn't the account owner, so a bad backup address
    // must never take down the primary message: retry once without cc.
    let res = await postEmail(apiKey, { ...rest, cc });
    if (!res.ok && cc) {
      res = await postEmail(apiKey, rest);
    }
    if (!res.ok) return { ok: false, error: `Resend ${res.status}` };
    return { ok: true };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : "fetch failed",
    };
  }
}

function postEmail(
  apiKey: string,
  body: { from: string; to: string; cc?: string; subject: string; html: string },
) {
  return fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
}

/** Escapes interpolated values so a cake note can't inject markup into an email. */
export function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
