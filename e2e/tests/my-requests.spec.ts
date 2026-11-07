// Acceptance Test
// Traces to: L2-020 (My requests)
// Description: A member opens Requests and sees only their own requests, pending ones under Upcoming and
//              decided or cancelled ones under Past, each with its status.
// Data: the demo seed. Ana Ruiz has a pending 16-20 Nov request ("Visiting family in Seville", Dev is also out
//       18-19 Nov) and a cancelled 5-6 Oct one ("Short trip", sent 20 Sep, decided 25 Sep). Cleo and Dev have
//       pending requests of their own, which Ana must not see.

import { test, expect } from "../fixtures/gl-test.js";

const NOV = "16–20 Nov · 5 days";
const OCT = "5–6 Oct · 2 days";

const declined = {
  id: "00000000-0000-4000-8000-000000000001",
  memberId: "00000000-0000-4000-8000-000000000002",
  memberName: "Ana Ruiz",
  firstDay: "2026-12-21",
  lastDay: "2026-12-22",
  days: 2,
  note: "Christmas",
  status: "Declined",
  sentUtc: "2026-10-30T12:00:00Z",
  decidedUtc: "2026-11-02T12:00:00Z",
  declineReason: "Three people are already out that week.",
  overlaps: [],
};

test.describe("My requests", () => {
  test("a member's Requests page is titled My requests with a New request button (AC1)", async ({ goto, pages }) => {
    await goto("myRequests", { as: "member" });
    await pages.requests.waitForReady();

    await expect(pages.requests.mineHeading()).toBeVisible();
    await expect(pages.requests.mineIntro()).toHaveText("You can also request days straight from the calendar.");
    await expect(pages.requests.newRequest()).toBeVisible();
    await expect(pages.requests.tabs()).toHaveCount(0);
  });

  test("a pending request is listed under Upcoming with its details and Cancel request (AC2)", async ({ goto, pages }) => {
    await goto("myRequests", { as: "member" });
    await pages.requests.waitForReady();

    const row = pages.requests.myRequest("Upcoming", NOV);
    await expect(row).toHaveCount(1);
    await expect(pages.requests.mySummary(row)).toHaveText(NOV);
    await expect(pages.requests.mySent(row)).toHaveText(/^Sent \d{1,2} [A-Z][a-z]{2}$/);
    await expect(row.locator(".request-row__note")).toHaveText("“Visiting family in Seville”");
    await expect(row.locator(".request-row__meta")).toHaveText("Dev also out 18–19 Nov");
    await expect(row.locator(".req-status")).toHaveText("Pending");
    await expect(pages.requests.cancelRequest(row)).toBeVisible();
  });

  test("a member sees only their own requests (AC2)", async ({ goto, pages }) => {
    await goto("myRequests", { as: "member" });
    await pages.requests.waitForReady();

    await expect(pages.requests.mine("Upcoming").filter({ hasText: "12–13 Nov" })).toHaveCount(0);
    await expect(pages.requests.mine("Upcoming").filter({ hasText: "18–19 Nov · 2 days" })).toHaveCount(0);
    await expect(pages.requests.row("Cleo Park")).toHaveCount(0);
  });

  test("a cancelled request is listed under Past with its status and dates, and no Cancel request (AC3)", async ({ goto, pages }) => {
    await goto("myRequests", { as: "member" });
    await pages.requests.waitForReady();

    const row = pages.requests.myRequest("Past", OCT);
    await expect(row).toHaveCount(1);
    await expect(pages.requests.mySent(row)).toHaveText("Sent 20 Sep");
    await expect(row.locator(".request-row__note")).toHaveText("“Short trip”");
    await expect(row.locator(".request-row__meta")).toHaveText("Sent 20 Sep · decided 25 Sep");
    await expect(row.locator(".req-status")).toHaveText("Cancelled");
    await expect(pages.requests.cancelRequest(row)).toHaveCount(0);
  });

  test("with no requests both groups say so (AC4)", async ({ goto, pages, requestsApi }) => {
    await requestsApi.stubMine({ managerName: "Maya Chen", upcoming: [], past: [] });
    await goto("myRequests", { as: "member" });
    await pages.requests.waitForReady();

    await expect(pages.requests.groupEmpty("Upcoming")).toHaveText("Nothing planned yet.");
    await expect(pages.requests.groupEmpty("Past")).toHaveText("No past requests.");
  });

  test("a declined request shows the manager's reason after Reason: (AC5)", async ({ goto, pages, requestsApi }) => {
    await requestsApi.stubMine({ managerName: "Maya Chen", upcoming: [], past: [declined] });
    await goto("myRequests", { as: "member" });
    await pages.requests.waitForReady();

    const row = pages.requests.myRequest("Past", "21–22 Dec · 2 days");
    await expect(row.locator(".request-row__meta")).toHaveText("Reason: Three people are already out that week.");
    await expect(row.locator(".req-status")).toHaveText("Declined");
  });

  test("when the requests cannot be loaded the page says so and Try again reads them again", async ({ goto, pages, page }) => {
    await page.route("**/api/requests/mine", (route) => route.fulfill({ status: 500, body: "" }));
    await goto("myRequests", { as: "member" });
    await pages.requests.waitForReady();
    await expect(pages.requests.loadError()).toBeVisible();
    await expect(pages.requests.loadError()).toContainText("We couldn't load your requests");

    await page.unroute("**/api/requests/mine");
    await pages.requests.loadError().getByRole("button", { name: "Try again", exact: true }).click();

    await expect(pages.requests.myRequest("Upcoming", NOV)).toHaveCount(1);
  });

  test("New request opens the Request time off dialog", async ({ goto, pages }) => {
    await goto("myRequests", { as: "member" });
    await pages.requests.waitForReady();

    await pages.requests.newRequest().click();

    await expect(pages.newRequest.dialog()).toBeVisible();
    await expect(pages.newRequest.description()).toHaveText("Maya Chen will be asked to approve it.");
  });
});
