import { describe, expect, it } from "vitest";
import { inquirySubmissionSchema } from "./order";

const valid = {
  event_date: "2026-09-01",
  occasion: "birthday",
  size: '6" round · serves 8–10',
  flavour: "Vanilla bean",
  preferred_name: "Sam",
  email: "sam@example.com",
  idempotency_key: "3f2504e0-4f89-41d3-9a0c-0305e82c3301",
};

describe("inquirySubmissionSchema", () => {
  it("accepts a minimal valid submission and defaults photo_paths to []", () => {
    const parsed = inquirySubmissionSchema.parse(valid);
    expect(parsed.occasion).toBe("birthday");
    expect(parsed.photo_paths).toEqual([]);
  });

  it("rejects a missing required field", () => {
    const { preferred_name: _omit, ...rest } = valid;
    void _omit;
    expect(inquirySubmissionSchema.safeParse(rest).success).toBe(false);
  });

  it("rejects a missing email — it's the fallback contact, not optional like ig_handle", () => {
    const { email: _omit, ...rest } = valid;
    void _omit;
    expect(inquirySubmissionSchema.safeParse(rest).success).toBe(false);
  });

  it("rejects a malformed email", () => {
    expect(
      inquirySubmissionSchema.safeParse({ ...valid, email: "not-an-email" })
        .success,
    ).toBe(false);
  });

  it("rejects an occasion outside the category enum", () => {
    expect(
      inquirySubmissionSchema.safeParse({ ...valid, occasion: "graduation" })
        .success,
    ).toBe(false);
  });

  it("rejects an empty size, but any non-empty string passes here", () => {
    // Sizes are baker-configurable (lib/db/queries.ts), not a fixed enum, so
    // the schema only checks shape. Whether a size is actually still offered
    // is checked against the live DB in the submit route — see
    // app/api/submit-inquiry/route.test.ts "rejects a size that's no longer
    // active".
    expect(inquirySubmissionSchema.safeParse({ ...valid, size: "" }).success).toBe(
      false,
    );
    expect(
      inquirySubmissionSchema.safeParse({ ...valid, size: "sheet cake" }).success,
    ).toBe(true);
  });

  it("normalizes blank optional strings to undefined", () => {
    const parsed = inquirySubmissionSchema.parse({
      ...valid,
      message: "   ",
      reference_link: "",
      ig_handle: "",
    });
    expect(parsed.message).toBeUndefined();
    expect(parsed.reference_link).toBeUndefined();
    expect(parsed.ig_handle).toBeUndefined();
  });

  it("rejects an invalid reference link but allows a valid one", () => {
    expect(
      inquirySubmissionSchema.safeParse({ ...valid, reference_link: "not a url" })
        .success,
    ).toBe(false);
    expect(
      inquirySubmissionSchema.safeParse({
        ...valid,
        reference_link: "https://pinterest.com/pin/123",
      }).success,
    ).toBe(true);
  });

  it("rejects more than 6 reference photos", () => {
    const photo_paths = Array.from({ length: 7 }, (_, i) => `pending/s/${i}.jpg`);
    expect(
      inquirySubmissionSchema.safeParse({ ...valid, photo_paths }).success,
    ).toBe(false);
  });

  it("rejects a non-uuid idempotency key", () => {
    expect(
      inquirySubmissionSchema.safeParse({ ...valid, idempotency_key: "abc" })
        .success,
    ).toBe(false);
  });
});
