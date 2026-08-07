import { describe, expect, it } from "vitest";
import { canTransition, STATUS_FLOW } from "./status";

describe("inquiry status flow", () => {
  it("allows a new request straight to confirmed", () => {
    expect(canTransition("submitted", "confirmed")).toBe(true);
  });

  it("does not allow moving backwards", () => {
    expect(canTransition("confirmed", "submitted")).toBe(false);
    expect(canTransition("quoted", "needs_quote")).toBe(false);
  });

  it("has no transitions out of terminal states", () => {
    expect(STATUS_FLOW.completed).toEqual([]);
    expect(STATUS_FLOW.cancelled).toEqual([]);
  });

  it("can cancel from any active state", () => {
    for (const s of ["submitted", "needs_quote", "quoted", "confirmed"] as const) {
      expect(canTransition(s, "cancelled")).toBe(true);
    }
  });

  it("only completes from confirmed", () => {
    expect(canTransition("confirmed", "completed")).toBe(true);
    expect(canTransition("quoted", "completed")).toBe(false);
  });
});
