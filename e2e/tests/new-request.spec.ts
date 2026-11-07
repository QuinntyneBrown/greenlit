// Acceptance Test
// Traces to: L2-019 (New request); the days left in the dialog are covered by allowances.spec.ts
// Description: A member asks for a run of days from the calendar; the dialog counts the working days,
//              refuses a bad range, and sending turns the days yellow.
// Data: the demo seed, December 2026. Ana's 7-11 Dec is blank and cleared after each test; Christmas Day
//       (Fri 25) and Boxing Day (Mon 28) are holidays; Ana has requested 16-20 Nov.

import { test, expect } from "../fixtures/gl-test.js";
import { clearDays } from "../fixtures/days.js";

const ANA_REQUESTED = ["2026-12-07", "2026-12-08", "2026-12-09", "2026-12-10", "2026-12-11", "2026-12-14"];
const WEEK_OF_7_DEC = ["Mon 7 Dec", "Tue 8 Dec", "Wed 9 Dec", "Thu 10 Dec", "Fri 11 Dec"];

test.describe("Requesting time off", () => {
  test.beforeEach(async ({ request }) => {
    await clearDays(request, "Ana Ruiz", ANA_REQUESTED);
  });
  test.afterEach(async ({ request }) => {
    await clearDays(request, "Ana Ruiz", ANA_REQUESTED);
  });

  test("a member opens the dialog from the calendar (L2-019 AC1)", async ({ goto, pages }) => {
    await goto("calendar", { as: "member", month: "2026-12" });
    await pages.calendar.waitForReady();

    await pages.calendar.requestTimeOff().click();

    const dialog = pages.newRequest;
    await expect(dialog.dialog()).toBeVisible();
    await expect(dialog.title()).toBeVisible();
    await expect(dialog.description()).toHaveText("Maya Chen will be asked to approve it.");
    await expect(dialog.firstDay()).toBeFocused();
    await expect(dialog.firstDay()).toHaveAttribute("type", "date");
    await expect(dialog.lastDay()).toHaveAttribute("type", "date");
    await expect(dialog.note()).toHaveAttribute("placeholder", "e.g. Family trip");
    await expect(dialog.count()).toHaveText("You have 6 days left to request. Weekends and holidays aren’t counted.");
    await expect(dialog.cancel()).toBeVisible();
    await expect(dialog.send()).toHaveText("Send request");
    await expect(dialog.send()).toBeDisabled();
  });

  test("the manager has nobody to ask, so the calendar offers no request button", async ({ goto, pages }) => {
    await goto("calendar", { month: "2026-12" });
    await pages.calendar.waitForReady();

    await expect(pages.calendar.requestTimeOff()).toHaveCount(0);
  });

  test("Esc closes the dialog and focus returns to the button that opened it (keyboard)", async ({ goto, page, pages }) => {
    await goto("calendar", { as: "member", month: "2026-12" });
    await pages.calendar.waitForReady();
    await pages.calendar.requestTimeOff().focus();
    await page.keyboard.press("Enter");
    await expect(pages.newRequest.dialog()).toBeVisible();

    await page.keyboard.press("Escape");

    await expect(pages.newRequest.dialog()).toBeHidden();
    await expect(pages.calendar.requestTimeOff()).toBeFocused();
  });

  test("Cancel closes the dialog and sends nothing", async ({ goto, pages, requestsApi }) => {
    await goto("calendar", { as: "member", month: "2026-12" });
    await pages.calendar.waitForReady();
    await pages.calendar.requestTimeOff().click();
    await pages.newRequest.fill({ first: "2026-12-07", last: "2026-12-11" });

    await pages.newRequest.cancel().click();

    await expect(pages.newRequest.dialog()).toBeHidden();
    expect(requestsApi.sends()).toBe(0);
    await expect(pages.calendar.cell("Ana Ruiz", "Mon 7 Dec")).toHaveAttribute("data-status", "empty");
  });

  test("picking the dates counts the working days (L2-019 AC2)", async ({ goto, pages }) => {
    await goto("calendar", { as: "member", month: "2026-12" });
    await pages.calendar.waitForReady();
    await pages.calendar.requestTimeOff().click();
    const dialog = pages.newRequest;

    await dialog.fill({ first: "2026-12-07", last: "2026-12-11" });
    await expect(dialog.count()).toHaveText("5 days from your allowance. 1 day left after this.");

    await dialog.fill({ last: "2026-12-07" });
    await expect(dialog.count()).toHaveText("1 day from your allowance. 5 days left after this.");
    await expect(dialog.send()).toBeEnabled();
  });

  test("weekends and holidays in the range are not counted (L2-019 AC7)", async ({ goto, pages }) => {
    await goto("calendar", { as: "member", month: "2026-12" });
    await pages.calendar.waitForReady();
    await pages.calendar.requestTimeOff().click();
    const dialog = pages.newRequest;

    // Wed 23 Dec to Mon 28 Dec: Fri 25 and Mon 28 are holidays, 26 and 27 a weekend.
    await dialog.fill({ first: "2026-12-23", last: "2026-12-28" });

    await expect(dialog.count()).toHaveText("2 days from your allowance. 4 days left after this.");
  });

  test("a range of only non-working days has nothing to send", async ({ goto, pages }) => {
    await goto("calendar", { as: "member", month: "2026-12" });
    await pages.calendar.waitForReady();
    await pages.calendar.requestTimeOff().click();
    const dialog = pages.newRequest;

    await dialog.fill({ first: "2026-12-12", last: "2026-12-13" });

    await expect(dialog.count()).toHaveText("Those are all non-working days. Weekends and holidays aren’t counted.");
    await expect(dialog.send()).toBeDisabled();
  });

  test("a last day before the first day is named and nothing is sent (L2-019 AC4)", async ({ goto, pages, requestsApi }) => {
    await goto("calendar", { as: "member", month: "2026-12" });
    await pages.calendar.waitForReady();
    await pages.calendar.requestTimeOff().click();
    const dialog = pages.newRequest;
    await dialog.fill({ first: "2026-12-11", last: "2026-12-07" });
    await expect(dialog.count()).toHaveText("The end date is before the start date.");

    await dialog.send().click();

    await expect(dialog.summary()).toContainText("Fix 1 thing to continue");
    await expect(dialog.summaryLinks()).toHaveText(["The end date is before the start date"]);
    await expect(dialog.lastDayError()).toHaveText("Pick a day on or after the first day.");
    await expect(dialog.lastDay()).toHaveAttribute("aria-invalid", "true");
    await expect(dialog.send()).toBeDisabled();
    expect(requestsApi.sends()).toBe(0);

    // Fixing the date clears the problem.
    await dialog.fill({ last: "2026-12-11" });
    await expect(dialog.summary()).toHaveCount(0);
    await expect(dialog.send()).toBeEnabled();
  });

  test("sending shows Sending…, then five days turn yellow and a toast confirms (L2-019 AC5)", async ({
    goto,
    pages,
    requestsApi,
  }) => {
    await goto("calendar", { as: "member", month: "2026-12" });
    await pages.calendar.waitForReady();
    await pages.calendar.requestTimeOff().click();
    const dialog = pages.newRequest;
    await dialog.fill({ first: "2026-12-07", last: "2026-12-11", note: "Dentist and a day to recover" });
    const release = await requestsApi.hold();

    await dialog.send().click();

    await expect(dialog.send()).toHaveText("Sending…");
    await expect(dialog.send()).toBeDisabled();
    await expect(dialog.send()).toHaveAttribute("aria-busy", "true");
    await expect(dialog.count()).toHaveText("Sending your request to Maya Chen…");
    await expect(dialog.cancel()).toBeDisabled();
    await expect(dialog.firstDay()).toHaveAttribute("readonly", "");
    await expect(dialog.note()).toHaveAttribute("readonly", "");

    release();

    await expect(dialog.dialog()).toBeHidden();
    for (const day of WEEK_OF_7_DEC) {
      await expect(pages.calendar.cell("Ana Ruiz", day)).toHaveAttribute("data-status", "requested");
      await expect(pages.calendar.cell("Ana Ruiz", day)).toHaveAccessibleName(`Ana Ruiz, ${day}: Requested`);
    }
    await expect(pages.calendar.cell("Ana Ruiz", "Mon 14 Dec")).toHaveAttribute("data-status", "empty");
    const toast = pages.calendar.toast("Request sent");
    await expect(toast).toBeVisible();
    await expect(toast).toContainText("Maya Chen will be asked to approve 7–11 Dec.");
    expect(requestsApi.sends()).toBe(1);
  });

  test("Enter in the note sends the request from the keyboard", async ({ goto, page, pages }) => {
    await goto("calendar", { as: "member", month: "2026-12" });
    await pages.calendar.waitForReady();
    await pages.calendar.requestTimeOff().click();
    const dialog = pages.newRequest;
    await dialog.fill({ first: "2026-12-07", last: "2026-12-07" });
    await dialog.note().focus();

    await page.keyboard.press("Enter");

    await expect(dialog.dialog()).toBeHidden();
    await expect(pages.calendar.cell("Ana Ruiz", "Mon 7 Dec")).toHaveAttribute("data-status", "requested");
  });

  test("a failed send keeps the dates and offers Try again (L2-019 AC6)", async ({ goto, pages, requestsApi }) => {
    await goto("calendar", { as: "member", month: "2026-12" });
    await pages.calendar.waitForReady();
    await pages.calendar.requestTimeOff().click();
    const dialog = pages.newRequest;
    await dialog.fill({ first: "2026-12-07", last: "2026-12-08", note: "Dentist" });
    await requestsApi.fail();

    await dialog.send().click();

    await expect(dialog.failure()).toContainText("We couldn’t send your request");
    await expect(dialog.failure()).toContainText("Check your connection and try again. Your dates are still here.");
    await expect(dialog.send()).toHaveText("Try again");
    await expect(dialog.firstDay()).toHaveValue("2026-12-07");
    await expect(dialog.lastDay()).toHaveValue("2026-12-08");
    await expect(dialog.note()).toHaveValue("Dentist");
    await expect(dialog.count()).toHaveText("2 days from your allowance. 4 days left after this.");

    await requestsApi.recover();
    await dialog.send().click();

    await expect(dialog.dialog()).toBeHidden();
    await expect(pages.calendar.cell("Ana Ruiz", "Tue 8 Dec")).toHaveAttribute("data-status", "requested");
  });

  test("days that are already requested are named and nothing changes", async ({ goto, pages }) => {
    await goto("calendar", { as: "member", month: "2026-11" });
    await pages.calendar.waitForReady();
    await pages.calendar.requestTimeOff().click();
    const dialog = pages.newRequest;
    await dialog.fill({ first: "2026-11-16", last: "2026-11-20" });

    await dialog.send().click();

    await expect(dialog.summary()).toContainText("Fix 1 thing to continue");
    await expect(dialog.summaryLinks()).toHaveText(["Some of those days are already requested or confirmed"]);
    await expect(dialog.firstDayError()).toHaveText("Pick days that aren’t already requested or confirmed.");
    await expect(dialog.firstDay()).toHaveAttribute("aria-invalid", "true");
    await expect(dialog.firstDay()).toHaveValue("2026-11-16");
    await expect(dialog.send()).toBeDisabled();
  });
});
