// Acceptance Test
// Traces to: L2-024 (Approve a request), L2-042 AC2 (coverage warning), L2-043 AC3 (decision email)
// Description: The manager approves a pending request from the list or its detail: the days turn green,
//              the member is emailed, a warning says when the team will be short, and Undo puts it back.
// Data: the demo seed, November 2026. Ana's 16-20 Nov request is pending; Dev has requested 18-19 Nov;
//       the team wants 4 of 7 in. Every test puts Ana's request back to pending, clears the days it
//       adds and so leaves the shared database as it found it.

import { test, expect, GRID_ONLY } from "../fixtures/gl-test.js";
import { clearDays } from "../fixtures/days.js";
import { confirmDays, emailsTo, logMark, memberId, reopenApproved } from "../fixtures/requests.js";

const WEEK = ["Mon 16 Nov", "Tue 17 Nov", "Wed 18 Nov", "Thu 19 Nov", "Fri 20 Nov"];

test.describe("Approving a request", () => {
  test.beforeEach(async ({ request }) => {
    await reopenApproved(request, "Ana Ruiz", "2026-11-16");
  });
  test.afterEach(async ({ request }) => {
    await reopenApproved(request, "Ana Ruiz", "2026-11-16");
    await clearDays(request, "Ben Okafor", ["2026-11-18"]);
    await clearDays(request, "Cleo Park", ["2026-11-18"]);
  });

  test("approving from the list turns the days green, emails Ana and says so (L2-024 AC1, AC2)", async ({ goto, pages, isMobile }) => {
    test.skip(isMobile, GRID_ONLY);
    const mark = await logMark();
    await goto("requests");
    await pages.requests.waitForReady();

    await pages.requests.approve("Ana Ruiz").click();

    const toast = "Approved Ana’s time off";
    await expect(pages.requests.toast(toast)).toBeVisible();
    await expect(pages.requests.toastText(toast)).toHaveText("16–20 Nov is green on the calendar and Ana has been emailed.");
    await expect(pages.requests.toastAction(toast, "Undo")).toBeVisible();
    await expect(pages.requests.row("Ana Ruiz")).toHaveCount(0);
    await expect(pages.requests.row("Cleo Park")).toBeVisible();

    const emails = await emailsTo("ana@northwind.studio", mark);
    expect(emails).toHaveLength(1);
    expect(emails[0]).toContain("Your time off was approved");
    expect(emails[0]).toContain("Maya Chen approved your request for 16–20 Nov.");

    await goto("calendar", { month: "2026-11" });
    await pages.calendar.waitForReady();
    for (const day of WEEK) await expect(pages.calendar.cell("Ana Ruiz", day)).toHaveAttribute("data-status", "confirmed");
  });

  test("the button says Approving… and cannot be pressed twice while the decision is recorded (L2-024 AC1)", async ({ goto, pages, requestsApi }) => {
    const release = await requestsApi.holdApprove();
    await goto("requests");
    await pages.requests.waitForReady();

    await pages.requests.approve("Ana Ruiz").click();

    await expect(pages.requests.approve("Ana Ruiz")).toHaveText("Approving…");
    await expect(pages.requests.approve("Ana Ruiz")).toHaveAttribute("aria-busy", "true");
    await expect(pages.requests.approve("Ana Ruiz")).toBeDisabled();
    await expect(pages.requests.approve("Cleo Park")).toBeEnabled();
    expect(requestsApi.approvals()).toBe(1);

    release();
    await expect(pages.requests.toast("Approved Ana’s time off")).toBeVisible();
    expect(requestsApi.approvals()).toBe(1);
  });

  test("Undo puts the request back to pending and its days back to yellow (L2-024 AC3)", async ({ goto, pages, isMobile }) => {
    test.skip(isMobile, GRID_ONLY);
    await goto("requests");
    await pages.requests.waitForReady();
    await pages.requests.approve("Ana Ruiz").click();
    await pages.requests.toastAction("Approved Ana’s time off", "Undo").click();

    await expect(pages.requests.toast("Approved Ana’s time off")).toHaveCount(0);
    await expect(pages.requests.row("Ana Ruiz")).toBeVisible();
    await expect(pages.requests.summary("Ana Ruiz")).toHaveText("16–20 Nov · 5 days");

    await goto("calendar", { month: "2026-11" });
    await pages.calendar.waitForReady();
    for (const day of WEEK) await expect(pages.calendar.cell("Ana Ruiz", day)).toHaveAttribute("data-status", "requested");
  });

  test("an undo that fails says so and keeps the approval", async ({ goto, pages, requestsApi }) => {
    await goto("requests");
    await pages.requests.waitForReady();
    await pages.requests.approve("Ana Ruiz").click();
    await requestsApi.failReopen();

    await pages.requests.toastAction("Approved Ana’s time off", "Undo").click();

    await expect(pages.requests.toast("We couldn’t undo that")).toBeVisible();
    await expect(pages.requests.toastText("We couldn’t undo that")).toHaveText("Ana’s time off is still approved. Check your connection and try again.");
    await expect(pages.requests.row("Ana Ruiz")).toHaveCount(0);
  });

  test("a failed approval leaves the request pending and offers Try again (L2-024 AC4)", async ({ goto, pages, requestsApi }) => {
    await requestsApi.failApprove();
    await goto("requests");
    await pages.requests.waitForReady();

    await pages.requests.approve("Ana Ruiz").click();

    const toast = "We couldn’t approve Ana’s request";
    await expect(pages.requests.toast(toast)).toBeVisible();
    await expect(pages.requests.toastText(toast)).toHaveText("It’s still pending. Check your connection and try again.");
    await expect(pages.requests.approve("Ana Ruiz")).toHaveText("Approve");
    await expect(pages.requests.approve("Ana Ruiz")).toBeEnabled();

    await requestsApi.recoverApprove();
    await pages.requests.toastAction(toast, "Try again").click();

    await expect(pages.requests.toast("Approved Ana’s time off")).toBeVisible();
    await expect(pages.requests.row("Ana Ruiz")).toHaveCount(0);
  });

  test("approving a request that leaves the team short warns the manager and still approves (L2-042 AC2)", async ({ goto, pages, request }) => {
    // Dev is out 18-19 Nov already; Ben and Cleo confirmed 18 Nov make 4 out and 3 in against a minimum of 4.
    await confirmDays(request, await memberId(request, "Ben Okafor"), ["2026-11-18"]);
    await confirmDays(request, await memberId(request, "Cleo Park"), ["2026-11-18"]);
    await goto("requests");
    await pages.requests.waitForReady();

    await pages.requests.approve("Ana Ruiz").click();

    const toast = "Approved, but only 3 people will be in on 18 Nov";
    await expect(pages.requests.toast(toast)).toBeVisible();
    await expect(pages.requests.toastText(toast)).toHaveText("That’s below your minimum of 4.");
    await expect(pages.requests.toastAction(toast, "Undo")).toBeVisible();
    await expect(pages.requests.row("Ana Ruiz")).toHaveCount(0);
  });

  test("the keyboard approves: Tab to the button and press Enter", async ({ goto, page, pages }) => {
    await goto("requests");
    await pages.requests.waitForReady();
    await pages.requests.approve("Ana Ruiz").focus();

    await page.keyboard.press("Enter");

    await expect(pages.requests.toast("Approved Ana’s time off")).toBeVisible();
  });
});

test.describe("The request detail", () => {
  test.beforeEach(async ({ request }) => {
    await reopenApproved(request, "Ana Ruiz", "2026-11-16");
  });
  test.afterEach(async ({ request }) => {
    await reopenApproved(request, "Ana Ruiz", "2026-11-16");
  });

  test("a name opens the detail with the request's facts, and Esc closes it again", async ({ goto, page, pages }) => {
    await goto("requests");
    await pages.requests.waitForReady();

    await pages.requests.open("Ana Ruiz").click();

    const detail = pages.requestDetail;
    await expect(detail.dialog()).toBeVisible();
    await expect(detail.title()).toHaveText("Ana Ruiz");
    await expect(detail.description()).toHaveText("16–20 Nov · 5 days");
    await expect(detail.status()).toHaveText("Pending");
    await expect(detail.sent()).toHaveText(/^\d{1,2} [A-Z][a-z]{2} \d{4}$/);
    await expect(detail.note()).toHaveText("“Visiting family in Seville”");
    await expect(detail.approve()).toHaveText("Approve");

    await page.keyboard.press("Escape");

    await expect(detail.dialog()).toBeHidden();
    await expect(pages.requests.open("Ana Ruiz")).toBeFocused();
  });

  test("approving from the detail shows Approving…, closes the detail and confirms with a toast (L2-024 AC1, AC2)", async ({
    goto,
    pages,
    requestsApi,
  }) => {
    const release = await requestsApi.holdApprove();
    await goto("requests");
    await pages.requests.waitForReady();
    await pages.requests.open("Ana Ruiz").click();

    await pages.requestDetail.approve().click();

    await expect(pages.requestDetail.approve()).toHaveText("Approving…");
    await expect(pages.requestDetail.approve()).toHaveAttribute("aria-busy", "true");
    await expect(pages.requestDetail.approve()).toBeDisabled();
    await expect(pages.requestDetail.close()).toBeDisabled();

    release();

    await expect(pages.requestDetail.dialog()).toBeHidden();
    await expect(pages.requests.toast("Approved Ana’s time off")).toBeVisible();
    await expect(pages.requests.row("Ana Ruiz")).toHaveCount(0);
  });

  test("a failed approval in the detail says the request is still pending and offers Try approving again (L2-024 AC4)", async ({
    goto,
    pages,
    requestsApi,
  }) => {
    await requestsApi.failApprove();
    await goto("requests");
    await pages.requests.waitForReady();
    await pages.requests.open("Ana Ruiz").click();

    await pages.requestDetail.approve().click();

    await expect(pages.requestDetail.failure()).toContainText("We couldn’t record your decision");
    await expect(pages.requestDetail.failure()).toContainText("Check your connection and try again. The request is still pending.");
    await expect(pages.requestDetail.approve()).toHaveText("Try approving again");
    await expect(pages.requestDetail.status()).toHaveText("Pending");

    await requestsApi.recoverApprove();
    await pages.requestDetail.approve().click();

    await expect(pages.requestDetail.dialog()).toBeHidden();
    await expect(pages.requests.toast("Approved Ana’s time off")).toBeVisible();
  });
});
