// Acceptance Test
// Traces to: L2-025 (Decline a request), L2-043 AC3 (decision email)
// Description: The manager declines a pending request with an optional reason: the days go back to
//              tentative, the member is emailed, a toast offers Undo, and the ledger shows it declined.
// Data: the demo seed, November 2026. Ana's 16-20 Nov request is pending (Dev is also out 18-19 Nov).
//       Every test puts Ana's request back to pending, so the shared database is left as it was found.

import { test, expect } from "../fixtures/gl-test.js";
import { emailsTo, logMark, reopenDeclined } from "../fixtures/requests.js";

const WEEK = ["Mon 16 Nov", "Tue 17 Nov", "Wed 18 Nov", "Thu 19 Nov", "Fri 20 Nov"];
const REASON = "Dev is already out on 18 and 19 Nov. Could you take the week after instead?";

test.describe("Declining a request", () => {
  test.beforeEach(async ({ request }) => {
    await reopenDeclined(request, "Ana Ruiz", "2026-11-16");
  });
  test.afterEach(async ({ request }) => {
    await reopenDeclined(request, "Ana Ruiz", "2026-11-16");
  });

  test("Decline opens a dialog that names the request and asks for an optional reason (L2-025 AC1)", async ({ goto, pages }) => {
    await goto("requests");
    await pages.requests.waitForReady();

    await pages.requests.decline("Ana Ruiz").click();

    const dialog = pages.declineRequest;
    await expect(dialog.dialog()).toBeVisible();
    await expect(dialog.title()).toHaveText("Decline Ana’s request?");
    await expect(dialog.description()).toHaveText("Ana Ruiz asked for 16–20 Nov (5 days).");
    await expect(dialog.reason()).toBeVisible();
    await expect(dialog.reason()).toHaveAttribute("placeholder", "Let Ana know why (optional)");
    await expect(dialog.help()).toHaveText("Ana will see this. Leave it blank to decline without a reason.");
    await expect(dialog.keepPending()).toBeEnabled();
    await expect(dialog.decline()).toHaveText("Decline request");
    await expect(dialog.reason()).toBeFocused();
  });

  test("declining with a reason turns the days blue, emails Ana the reason and offers Undo (L2-025 AC2, AC3)", async ({ goto, pages }) => {
    const mark = await logMark();
    await goto("requests");
    await pages.requests.waitForReady();
    await pages.requests.decline("Ana Ruiz").click();
    await pages.declineRequest.reason().fill(REASON);

    await pages.declineRequest.decline().click();

    const toast = "Declined Ana’s request";
    await expect(pages.declineRequest.dialog()).toBeHidden();
    await expect(pages.requests.toast(toast)).toBeVisible();
    await expect(pages.requests.toastText(toast)).toHaveText("Ana has been emailed your reason.");
    await expect(pages.requests.toastAction(toast, "Undo")).toBeVisible();
    await expect(pages.requests.row("Ana Ruiz")).toHaveCount(0);

    const emails = await emailsTo("ana@northwind.studio", mark);
    expect(emails).toHaveLength(1);
    expect(emails[0]).toContain("Your time off request was declined");
    expect(emails[0]).toContain("Maya Chen declined your request for 16–20 Nov.");
    expect(emails[0]).toContain(REASON);

    await pages.requests.openTab("Declined");
    // Ana's earlier cancelled request is listed on this tab too.
    await expect(pages.requests.status("Ana Ruiz").filter({ hasText: "Declined" })).toHaveCount(1);
    await expect(pages.requests.meta("Ana Ruiz").filter({ hasText: "Reason:" })).toHaveText(`Reason: ${REASON}`);

    await goto("calendar", { month: "2026-11" });
    await pages.calendar.waitForReady();
    for (const day of WEEK) await expect(pages.calendar.cell("Ana Ruiz", day)).toHaveAttribute("data-status", "tentative");
  });

  test("a blank reason declines without one and the toast says only that Ana was emailed (L2-025 AC2)", async ({ goto, pages }) => {
    const mark = await logMark();
    await goto("requests");
    await pages.requests.waitForReady();
    await pages.requests.decline("Ana Ruiz").click();

    await pages.declineRequest.decline().click();

    await expect(pages.requests.toastText("Declined Ana’s request")).toHaveText("Ana has been emailed.");
    const emails = await emailsTo("ana@northwind.studio", mark);
    expect(emails[0]).toContain("Maya Chen declined your request for 16–20 Nov.");
    expect(emails[0]).not.toContain("Reason:");
    await pages.requests.openTab("Declined");
    await expect(pages.requests.meta("Ana Ruiz").filter({ hasText: "Reason:" })).toHaveCount(0);
  });

  test("the button says Declining… and nothing can be pressed or typed while the decision is recorded (L2-025 AC2)", async ({ goto, pages, requestsApi }) => {
    const release = await requestsApi.holdDecline();
    await goto("requests");
    await pages.requests.waitForReady();
    await pages.requests.decline("Ana Ruiz").click();
    await pages.declineRequest.reason().fill(REASON);

    await pages.declineRequest.decline().click();

    const dialog = pages.declineRequest;
    await expect(dialog.decline()).toHaveText("Declining…");
    await expect(dialog.decline()).toHaveAttribute("aria-busy", "true");
    await expect(dialog.decline()).toBeDisabled();
    await expect(dialog.keepPending()).toBeDisabled();
    await expect(dialog.close()).toBeDisabled();
    await expect(dialog.reason()).toHaveJSProperty("readOnly", true);
    expect(requestsApi.declines()).toBe(1);

    release();

    await expect(dialog.dialog()).toBeHidden();
    await expect(pages.requests.toast("Declined Ana’s request")).toBeVisible();
    expect(requestsApi.declines()).toBe(1);
  });

  test("a failed decline says Ana still sees it as pending, keeps the reason and can be tried again (L2-025 AC4)", async ({ goto, pages, requestsApi }) => {
    await requestsApi.failDecline();
    await goto("requests");
    await pages.requests.waitForReady();
    await pages.requests.decline("Ana Ruiz").click();
    await pages.declineRequest.reason().fill(REASON);

    await pages.declineRequest.decline().click();

    const dialog = pages.declineRequest;
    await expect(dialog.failure()).toContainText("We couldn’t decline the request");
    await expect(dialog.failure()).toContainText("Check your connection and try again. Ana still sees it as pending.");
    await expect(dialog.reason()).toHaveValue(REASON);
    await expect(dialog.decline()).toHaveText("Decline request");
    await expect(dialog.decline()).toBeEnabled();
    await expect(pages.requests.toasts()).toHaveCount(0);

    await requestsApi.recoverDecline();
    await dialog.decline().click();

    await expect(dialog.dialog()).toBeHidden();
    await expect(pages.requests.toast("Declined Ana’s request")).toBeVisible();
    await expect(pages.requests.row("Ana Ruiz")).toHaveCount(0);
  });

  test("Undo puts the request back to pending and its days back to yellow (L2-025 AC3)", async ({ goto, pages }) => {
    await goto("requests");
    await pages.requests.waitForReady();
    await pages.requests.decline("Ana Ruiz").click();
    await pages.declineRequest.reason().fill(REASON);
    await pages.declineRequest.decline().click();

    await pages.requests.toastAction("Declined Ana’s request", "Undo").click();

    await expect(pages.requests.toast("Declined Ana’s request")).toHaveCount(0);
    await expect(pages.requests.row("Ana Ruiz")).toBeVisible();
    await expect(pages.requests.summary("Ana Ruiz")).toHaveText("16–20 Nov · 5 days");

    await goto("calendar", { month: "2026-11" });
    await pages.calendar.waitForReady();
    for (const day of WEEK) await expect(pages.calendar.cell("Ana Ruiz", day)).toHaveAttribute("data-status", "requested");
  });

  test("an undo that fails says so and keeps the decline", async ({ goto, pages, requestsApi }) => {
    await goto("requests");
    await pages.requests.waitForReady();
    await pages.requests.decline("Ana Ruiz").click();
    await pages.declineRequest.decline().click();
    await requestsApi.failReopen();

    await pages.requests.toastAction("Declined Ana’s request", "Undo").click();

    await expect(pages.requests.toast("We couldn’t undo that")).toBeVisible();
    await expect(pages.requests.toastText("We couldn’t undo that")).toHaveText("Ana’s request is still declined. Check your connection and try again.");
    await expect(pages.requests.row("Ana Ruiz")).toHaveCount(0);
  });

  test("Keep pending closes the dialog and decides nothing; Esc does the same (L2-025 AC1)", async ({ goto, page, pages, requestsApi }) => {
    await goto("requests");
    await pages.requests.waitForReady();
    await pages.requests.decline("Ana Ruiz").click();
    await pages.declineRequest.reason().fill(REASON);

    await pages.declineRequest.keepPending().click();

    await expect(pages.declineRequest.dialog()).toBeHidden();
    await expect(pages.requests.row("Ana Ruiz")).toBeVisible();
    await expect(pages.requests.decline("Ana Ruiz")).toBeFocused();

    await pages.requests.decline("Ana Ruiz").click();
    await page.keyboard.press("Escape");

    await expect(pages.declineRequest.dialog()).toBeHidden();
    await expect(pages.requests.toasts()).toHaveCount(0);
    expect(requestsApi.declines()).toBe(0);
  });

  test("the keyboard declines: Enter on Decline, type a reason, Enter on Decline request", async ({ goto, page, pages }) => {
    await goto("requests");
    await pages.requests.waitForReady();
    await pages.requests.decline("Ana Ruiz").focus();

    await page.keyboard.press("Enter");
    await expect(pages.declineRequest.reason()).toBeFocused();
    await page.keyboard.type("Not that week.");
    await pages.declineRequest.decline().focus();
    await page.keyboard.press("Enter");

    await expect(pages.requests.toast("Declined Ana’s request")).toBeVisible();
  });
});

test.describe("Declining from the request detail", () => {
  test.beforeEach(async ({ request }) => {
    await reopenDeclined(request, "Ana Ruiz", "2026-11-16");
  });
  test.afterEach(async ({ request }) => {
    await reopenDeclined(request, "Ana Ruiz", "2026-11-16");
  });

  test("Decline in the footer of a pending request opens the dialog, and declining closes both (L2-025 AC1, AC3)", async ({ goto, pages }) => {
    await goto("requests");
    await pages.requests.waitForReady();
    await pages.requests.open("Ana Ruiz").click();
    await expect(pages.requestDetail.decline()).toHaveText("Decline");

    await pages.requestDetail.decline().click();

    await expect(pages.requestDetail.dialog()).toBeHidden();
    await expect(pages.declineRequest.title()).toHaveText("Decline Ana’s request?");
    await pages.declineRequest.reason().fill(REASON);
    await pages.declineRequest.decline().click();

    await expect(pages.declineRequest.dialog()).toBeHidden();
    await expect(pages.requests.toast("Declined Ana’s request")).toBeVisible();
    await expect(pages.requests.row("Ana Ruiz")).toHaveCount(0);
  });

  test("a declined request's detail shows its status and reason and has no footer buttons (L2-025)", async ({ goto, pages }) => {
    await goto("requests");
    await pages.requests.waitForReady();
    await pages.requests.decline("Ana Ruiz").click();
    await pages.declineRequest.reason().fill(REASON);
    await pages.declineRequest.decline().click();
    await pages.requests.openTab("Declined");

    await pages.requests.open("Ana Ruiz", "16–20 Nov").click();

    await expect(pages.requestDetail.status()).toHaveText("Declined");
    await expect(pages.requestDetail.declineReason()).toHaveText(`Decline reason: ${REASON}`);
    await expect(pages.requestDetail.actions()).toHaveCount(0);
  });
});
