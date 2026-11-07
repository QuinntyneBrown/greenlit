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
});
