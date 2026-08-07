import { describe, expect, it } from "vitest";
import { buildInstagramDeepLink, buildPrefilledMessage } from "./instagram";

const summary = {
  name: "Sam",
  date: "Sat, Sep 5",
  occasion: "Birthday",
  size: '6" round',
  flavour: "Vanilla bean",
};
const id = "3f2504e0-4f89-41d3-9a0c-0305e82c3301";

describe("buildInstagramDeepLink", () => {
  it("targets the handle's ig.me messaging URL", () => {
    const link = buildInstagramDeepLink("creamycreation", summary, id);
    expect(link.startsWith("https://ig.me/m/creamycreation?")).toBe(true);
  });

  it("carries the ref param for webhook auto-linking", () => {
    const link = buildInstagramDeepLink("creamycreation", summary, id);
    const url = new URL(link);
    expect(url.searchParams.get("ref")).toBe(`inquiry_${id}`);
  });

  it("prefills the message text with the summary and ref", () => {
    const link = buildInstagramDeepLink("creamycreation", summary, id);
    const text = new URL(link).searchParams.get("text") ?? "";
    expect(text).toContain("Name: Sam");
    expect(text).toContain("Flavour: Vanilla bean");
    expect(text).toContain(`(ref ${id})`);
  });
});

describe("buildPrefilledMessage", () => {
  it("includes every summary field", () => {
    const text = buildPrefilledMessage(summary, id);
    for (const v of Object.values(summary)) expect(text).toContain(v);
  });
});
