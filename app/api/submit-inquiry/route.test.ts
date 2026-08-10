import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/db/inquiries", () => ({
  createInquiry: vi.fn(),
  markNotification: vi.fn(),
}));
vi.mock("@/lib/notifications/resend", () => ({
  sendBakerNotification: vi.fn(),
}));
vi.mock("@/lib/db/queries", () => ({
  getPublicConfig: vi.fn(),
  getBlockedDates: vi.fn(),
  getActiveSizes: vi.fn(),
  getActiveAddons: vi.fn(),
}));

import { POST } from "./route";
import { createInquiry, markNotification } from "@/lib/db/inquiries";
import {
  getActiveAddons,
  getActiveSizes,
  getBlockedDates,
  getPublicConfig,
} from "@/lib/db/queries";
import { sendBakerNotification } from "@/lib/notifications/resend";
import type { Inquiry } from "@/lib/db/inquiries";

// Pinned so the min-notice check is tested against a fixed "today" rather than
// whenever the suite happens to run.
const TODAY = new Date("2026-08-08T12:00:00Z");

const validBody = {
  event_date: "2026-09-01",
  occasion: "birthday",
  size: "Dozen cupcakes",
  flavour: "Chocolate",
  preferred_name: "Sam",
  email: "sam@example.com",
  idempotency_key: "3f2504e0-4f89-41d3-9a0c-0305e82c3301",
};

const fakeInquiry: Inquiry = {
  id: "inq-1",
  event_date: "2026-09-01",
  occasion: "birthday",
  size: "Dozen cupcakes",
  flavour: "Chocolate",
  preferred_name: "Sam",
  email: "sam@example.com",
  ig_handle: null,
  message: null,
  notes: null,
  reference_link: null,
  style_tag: null,
  status: "submitted",
  status_changed_at: "",
  internal_notes: null,
  notification_status: "pending",
  notification_last_attempt_at: null,
  idempotency_key: validBody.idempotency_key,
  submitted_at: "",
  created_at: "",
  estimated_price_min_cents: 3500,
  estimated_price_max_cents: 3500,
};

const activeSizes = [
  {
    id: "size-1",
    label: "Dozen cupcakes",
    base_price_cents: 3500,
    is_active: true,
    sort_order: 4,
    created_at: "",
  },
];

function post(body: unknown): Request {
  return new Request("http://localhost/api/submit-inquiry", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("POST /api/submit-inquiry", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    vi.setSystemTime(TODAY);
    // Default: nothing blocked, no config row → the handler's own defaults apply.
    vi.mocked(getPublicConfig).mockResolvedValue(null);
    vi.mocked(getBlockedDates).mockResolvedValue([]);
    // Default: the one size validBody submits is active; no add-ons offered.
    vi.mocked(getActiveSizes).mockResolvedValue(activeSizes as never);
    vi.mocked(getActiveAddons).mockResolvedValue([]);
  });

  afterEach(() => vi.useRealTimers());

  it("returns 422 on an invalid payload", async () => {
    const res = await POST(post({ occasion: "birthday" }));
    expect(res.status).toBe(422);
    expect(createInquiry).not.toHaveBeenCalled();
  });

  it("returns 200 with the inquiry id and IG deep link on success", async () => {
    vi.mocked(createInquiry).mockResolvedValue({
      inquiry: fakeInquiry,
      duplicate: false,
    });
    vi.mocked(sendBakerNotification).mockResolvedValue({ ok: true });

    const res = await POST(post(validBody));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.inquiry_id).toBe("inq-1");
    expect(json.ig_deep_link).toContain("ig.me/m/");
    expect(json.ig_deep_link).toContain("ref=inquiry_inq-1");
    expect(json.duplicate).toBe(false);
    expect(markNotification).toHaveBeenCalledWith("inq-1", "sent");
  });

  it("still returns 200 but marks notification failed when the email fails", async () => {
    vi.mocked(createInquiry).mockResolvedValue({
      inquiry: fakeInquiry,
      duplicate: false,
    });
    vi.mocked(sendBakerNotification).mockResolvedValue({ ok: false });

    const res = await POST(post(validBody));
    expect(res.status).toBe(200); // order is never lost on email failure
    expect(markNotification).toHaveBeenCalledWith("inq-1", "failed");
  });

  it("does not re-send email on a duplicate submit", async () => {
    vi.mocked(createInquiry).mockResolvedValue({
      inquiry: fakeInquiry,
      duplicate: true,
    });

    const res = await POST(post(validBody));
    expect(res.status).toBe(200);
    expect((await res.json()).duplicate).toBe(true);
    expect(sendBakerNotification).not.toHaveBeenCalled();
    expect(markNotification).not.toHaveBeenCalled();
  });

  it("returns 500 when the insert throws", async () => {
    vi.mocked(createInquiry).mockRejectedValue(new Error("db down"));
    const res = await POST(post(validBody));
    expect(res.status).toBe(500);
  });

  it("rejects a date the calendar has since blocked", async () => {
    vi.mocked(getBlockedDates).mockResolvedValue(["2026-09-01"]);

    const res = await POST(post(validBody));
    expect(res.status).toBe(422);
    expect((await res.json()).issues.event_date).toBeDefined();
    expect(createInquiry).not.toHaveBeenCalled();
  });

  it("rejects a size that's no longer active", async () => {
    vi.mocked(getActiveSizes).mockResolvedValue([]);

    const res = await POST(post(validBody));
    expect(res.status).toBe(422);
    expect((await res.json()).issues.size).toBeDefined();
    expect(createInquiry).not.toHaveBeenCalled();
  });

  it("computes the estimate from live size + add-on prices, not the client", async () => {
    vi.mocked(getActiveAddons).mockResolvedValue([
      {
        id: "a1a2a3a4-0000-4000-8000-000000000001",
        label: "Fresh flowers",
        price_min_cents: 1000,
        price_max_cents: 2500,
        is_active: true,
        sort_order: 0,
        created_at: "",
      },
    ] as never);
    vi.mocked(createInquiry).mockResolvedValue({
      inquiry: fakeInquiry,
      duplicate: false,
    });
    vi.mocked(sendBakerNotification).mockResolvedValue({ ok: true });

    await POST(
      post({
        ...validBody,
        addon_ids: ["a1a2a3a4-0000-4000-8000-000000000001"],
      }),
    );

    expect(createInquiry).toHaveBeenCalledWith(
      expect.objectContaining({ size: "Dozen cupcakes" }),
      { minCents: 4500, maxCents: 6000 },
      [
        {
          addon_id: "a1a2a3a4-0000-4000-8000-000000000001",
          label: "Fresh flowers",
          price_min_cents: 1000,
          price_max_cents: 2500,
        },
      ],
    );
  });

  it("rejects a missing email", async () => {
    const { email: _omit, ...rest } = validBody;
    void _omit;
    const res = await POST(post(rest));
    expect(res.status).toBe(422);
    expect(createInquiry).not.toHaveBeenCalled();
  });

  it("rejects a malformed email", async () => {
    const res = await POST(post({ ...validBody, email: "not-an-email" }));
    expect(res.status).toBe(422);
    expect(createInquiry).not.toHaveBeenCalled();
  });

  it("rejects a date inside the min-notice window", async () => {
    const res = await POST(post({ ...validBody, event_date: "2026-08-10" })); // 2 days out
    expect(res.status).toBe(422);
    expect(createInquiry).not.toHaveBeenCalled();
  });

  it("rejects every date while vacation mode is on", async () => {
    vi.mocked(getPublicConfig).mockResolvedValue({
      vacation_mode: true,
      vacation_message: "Back on the 15th",
      min_notice_days: 7,
    } as never);

    const res = await POST(post(validBody));
    expect(res.status).toBe(422);
    expect((await res.json()).issues.event_date).toEqual(["Back on the 15th"]);
    expect(createInquiry).not.toHaveBeenCalled();
  });

  it("returns 400 on non-JSON body", async () => {
    const res = await POST(
      new Request("http://localhost/api/submit-inquiry", {
        method: "POST",
        body: "not json",
      }),
    );
    expect(res.status).toBe(400);
  });
});
