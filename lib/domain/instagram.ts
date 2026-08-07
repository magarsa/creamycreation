/*
 * Instagram DM handoff. Builds the ig.me deep link that carries a prefilled
 * message plus a `ref` the Messaging webhook echoes back in v1.5 (`inquiry_{id}`),
 * so a DM can be auto-linked to its inquiry. Also exposes the raw prefilled text
 * for the desktop / no-Instagram fallback (copy-to-clipboard).
 */

export interface InquirySummary {
  name: string;
  date: string; // human-readable, e.g. "Sat, Aug 15"
  occasion: string;
  size: string;
  flavour: string;
}

export function buildPrefilledMessage(
  summary: InquirySummary,
  inquiryId: string,
): string {
  return [
    "Hi! I just sent a cake inquiry through your site 🎂",
    `Name: ${summary.name}`,
    `Date: ${summary.date}`,
    `Occasion: ${summary.occasion}`,
    `Size: ${summary.size}`,
    `Flavour: ${summary.flavour}`,
    `(ref ${inquiryId})`,
  ].join("\n");
}

export function buildInstagramDeepLink(
  handle: string,
  summary: InquirySummary,
  inquiryId: string,
): string {
  const params = new URLSearchParams({
    text: buildPrefilledMessage(summary, inquiryId),
    ref: `inquiry_${inquiryId}`,
  });
  return `https://ig.me/m/${encodeURIComponent(handle)}?${params.toString()}`;
}
