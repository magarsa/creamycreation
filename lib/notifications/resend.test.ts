import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { sendBakerNotification, type BakerNotification } from "./resend";

const n: BakerNotification = {
  inquiryId: "inq-1",
  preferredName: "Sam",
  eventDate: "2026-09-01",
  occasion: "birthday",
  size: "Dozen cupcakes",
  flavour: "Chocolate",
};

const ORIGINAL_ENV = { ...process.env };

beforeEach(() => {
  process.env.RESEND_API_KEY = "test_key";
  process.env.RESEND_FROM = "onboarding@resend.dev";
  process.env.BAKERY_PRIMARY_EMAIL = "baker@example.com";
});

afterEach(() => {
  process.env = { ...ORIGINAL_ENV };
  vi.unstubAllGlobals();
});

describe("sendBakerNotification", () => {
  it("returns ok:false without hitting the network when unconfigured", async () => {
    delete process.env.RESEND_FROM;
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    const result = await sendBakerNotification(n);
    expect(result.ok).toBe(false);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("sends once, no cc, when BAKERY_BACKUP_EMAIL is unset", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(null, { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);

    const result = await sendBakerNotification(n);
    expect(result.ok).toBe(true);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const body = JSON.parse(fetchMock.mock.calls[0][1].body);
    expect(body.cc).toBeUndefined();
  });

  it("includes cc on the first attempt when BAKERY_BACKUP_EMAIL is set", async () => {
    process.env.BAKERY_BACKUP_EMAIL = "backup@example.com";
    const fetchMock = vi.fn().mockResolvedValue(new Response(null, { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);

    const result = await sendBakerNotification(n);
    expect(result.ok).toBe(true);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const body = JSON.parse(fetchMock.mock.calls[0][1].body);
    expect(body.cc).toBe("backup@example.com");
  });

  it("retries once without cc if the cc'd send is rejected, and still succeeds", async () => {
    process.env.BAKERY_BACKUP_EMAIL = "backup@example.com";
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(new Response(null, { status: 403 }))
      .mockResolvedValueOnce(new Response(null, { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);

    const result = await sendBakerNotification(n);
    expect(result.ok).toBe(true);
    expect(fetchMock).toHaveBeenCalledTimes(2);
    const secondBody = JSON.parse(fetchMock.mock.calls[1][1].body);
    expect(secondBody.cc).toBeUndefined();
  });

  it("reports failure if both the cc'd and retry sends fail", async () => {
    process.env.BAKERY_BACKUP_EMAIL = "backup@example.com";
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(new Response(null, { status: 403 }))
      .mockResolvedValueOnce(new Response(null, { status: 500 }));
    vi.stubGlobal("fetch", fetchMock);

    const result = await sendBakerNotification(n);
    expect(result.ok).toBe(false);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("does not retry when there was no cc to begin with", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(null, { status: 500 }));
    vi.stubGlobal("fetch", fetchMock);

    const result = await sendBakerNotification(n);
    expect(result.ok).toBe(false);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});
