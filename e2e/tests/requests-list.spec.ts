// Acceptance Test
// Traces to: L2-024 ("from the list"); the full ledger is review-requests.spec.ts
// Description: The manager opens Requests and sees the pending requests of the team, each with an
//              Approve button; a member sees their own requests instead (my-requests.spec.ts).
// Data: the demo seed. Cleo Park (12-13 Nov), Ana Ruiz (16-20 Nov, "Visiting family in Seville") and
//       Dev Patel (18-19 Nov) each have a pending request.

import { test, expect } from "../fixtures/gl-test.js";

test.describe("The pending requests", () => {
  test("the manager sees every pending request with its dates, days and note", async ({ goto, pages }) => {
    await goto("requests");
    await pages.requests.waitForReady();

    await expect(pages.requests.heading()).toBeVisible();
    await expect(pages.requests.row("Ana Ruiz")).toBeVisible();
    await expect(pages.requests.summary("Ana Ruiz")).toHaveText("16–20 Nov · 5 days");
    await expect(pages.requests.note("Ana Ruiz")).toHaveText("“Visiting family in Seville”");
    await expect(pages.requests.summary("Cleo Park")).toHaveText("12–13 Nov · 2 days");
    await expect(pages.requests.summary("Dev Patel")).toHaveText("18–19 Nov · 2 days");
    await expect(pages.requests.approve("Ana Ruiz")).toHaveText("Approve");
    await expect(pages.requests.approve("Ana Ruiz")).toBeEnabled();
  });

  test("requests come oldest first, and those sent together by first day", async ({ goto, pages }) => {
    await goto("requests");
    await pages.requests.waitForReady();

    // The seed sends all three at once, so their first days decide: 12, 16 and 18 Nov.
    const names = await pages.requests.rows().locator(".request-row__title").allTextContents();
    expect(names.indexOf("Cleo Park")).toBeLessThan(names.indexOf("Ana Ruiz"));
    expect(names.indexOf("Ana Ruiz")).toBeLessThan(names.indexOf("Dev Patel"));
  });

  test("a member has no ledger: the page is their own My requests", async ({ goto, page, pages }) => {
    await goto("requests", { as: "member" });

    await pages.requests.waitForReady();
    await expect(pages.requests.mineHeading()).toBeVisible();
    await expect(page).toHaveURL(/\/requests$/);
  });

  test("a visitor with no session is sent to sign-in and back", async ({ goto, page }) => {
    await goto("requests", { signedOut: true });

    await expect(page).toHaveURL(/\/sign-in\?returnUrl=%2Frequests/);
  });

  test("the Requests link in the main navigation opens the page", async ({ goto, pages }) => {
    await goto("calendar");
    await pages.calendar.waitForReady();

    await pages.calendar.openFromMainNav("Requests");

    await pages.requests.waitForReady();
    await expect(pages.requests.heading()).toBeVisible();
  });
});
