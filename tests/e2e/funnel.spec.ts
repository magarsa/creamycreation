import { expect, test } from "@playwright/test";

/*
 * Full order funnel, mobile viewport. The submit API is mocked so the E2E has no
 * DB side-effects — it verifies the client flow (navigation, validation gating,
 * the review summary, and the Instagram handoff on the sent page). The server
 * handler is covered separately by its unit tests.
 */
test("order funnel: home → date → details → review → sent", async ({ page }) => {
  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: /Simple, elegant cakes/i }),
  ).toBeVisible();

  // Home → date
  await page.getByRole("link", { name: /Check a date/i }).click();
  await expect(page.getByRole("heading", { name: /When.s it for\?/ })).toBeVisible();

  // The Continue button is gated until a date is chosen.
  await expect(page.getByRole("button", { name: "Continue" })).toBeDisabled();

  // Pick the last selectable (open) day of the month, then continue.
  const openDays = page
    .locator("button:not([disabled])")
    .filter({ hasText: /^\d+$/ });
  await openDays.last().click();
  await expect(page.getByRole("button", { name: "Continue" })).toBeEnabled();
  await page.getByRole("button", { name: "Continue" }).click();

  // Details — Next gated until occasion + size + flavour are chosen.
  await expect(page.getByRole("heading", { name: "What kind of cake?" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Next", exact: true })).toBeDisabled();
  await page.getByRole("button", { name: "Birthday" }).click();
  await page.getByRole("button", { name: /Dozen cupcakes/ }).click();
  await page.getByRole("button", { name: "Chocolate" }).click();
  await expect(page.getByRole("button", { name: "Next", exact: true })).toBeEnabled();
  await page.getByRole("button", { name: "Next", exact: true }).click();

  // References — all optional; skip straight to review.
  await expect(
    page.getByRole("heading", { name: /Anything to picture it by/i }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Review" }).click();

  // Review — summary reflects the choices; Send gated until name + email are entered.
  await expect(page.getByRole("heading", { name: "Before it sends" })).toBeVisible();
  await expect(page.getByText("Birthday")).toBeVisible();
  await expect(page.getByText("Dozen cupcakes")).toBeVisible();
  await expect(page.getByText("Chocolate")).toBeVisible();
  await expect(page.getByRole("button", { name: /Send in a DM/i })).toBeDisabled();
  await page.getByPlaceholder(/who I'm talking to/i).fill("E2E Tester");
  await expect(page.getByRole("button", { name: /Send in a DM/i })).toBeDisabled();
  await page.getByPlaceholder(/reach you if the DM/i).fill("e2e@example.com");
  await expect(page.getByRole("button", { name: /Send in a DM/i })).toBeEnabled();

  // Mock the submit so there's no DB write, then send.
  await page.route("**/api/submit-inquiry", (route) =>
    route.fulfill({
      json: {
        inquiry_id: "e2e-1",
        ig_deep_link:
          "https://ig.me/m/creamycreation?text=hi&ref=inquiry_e2e-1",
        duplicate: false,
      },
    }),
  );
  await page.getByRole("button", { name: /Send in a DM/i }).click();

  // Sent — confirmation + Instagram handoff.
  await expect(page.getByRole("heading", { name: "Request sent" })).toBeVisible();
  const dm = page.getByRole("link", { name: "Open the DM" });
  await expect(dm).toHaveAttribute("href", /ig\.me\/m\/creamycreation/);
});
