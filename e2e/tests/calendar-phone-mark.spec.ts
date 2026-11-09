// Acceptance Test
// Traces to: L2-063 AC10, AC11 (with L2-015 AC4–AC6, L2-016 AC3–AC4, L2-017 and L2-018 on the phone)
// Description: On a phone, an action on the mark sheet applies that status to the range; Cancel or Escape clears it.
// Data: the demo seed, November 2026. Ana's 23–30 Nov is blank and cleared after each test.
//
// Given Ana's range 23–25 Nov, when Ana presses "Tentative", then the three days are tentative, "Marked 3 days
//   tentative" offers Undo, and the selection clears; Undo puts them back.
// Given Ana's range, when Ana presses "Request these days", then the days are requested and she is told Maya Chen will
//   be notified.
// Given the manager's range on Ana's row, when they press "Confirm", then the days are green.
// Given tentative days, when "Clear these days" is pressed, then they are working days again.
// Given the save fails, when an action is pressed, then the days stay as they were, the selection stays, and
//   "Try again" saves it.
// Given a selection, when the person presses "Cancel" or Escape, then it clears and "Selection cleared" says
//   "Pick days to start again."

import { test, expect } from "../fixtures/gl-test.js";
import { clearDays, paintDays } from "../fixtures/days.js";

const ANA_DAYS = ["2026-11-23", "2026-11-24", "2026-11-25", "2026-11-26", "2026-11-27", "2026-11-30"];

test.describe("Marking a range on a phone", () => {
  test.beforeEach(async ({ request }, testInfo) => {
    test.skip(testInfo.project.name !== "mobile", "The mark sheet is the phone's (L2-063).");
    await clearDays(request, "Ana Ruiz", ANA_DAYS);
  });
  test.afterEach(async ({ request }, testInfo) => {
    if (testInfo.project.name === "mobile") await clearDays(request, "Ana Ruiz", ANA_DAYS);
  });

  test("Tentative marks the range, clears the selection and offers Undo (L2-063 AC10)", async ({ goto, pages }) => {
    await goto("calendar", { month: "2026-11", as: "member" });
    await pages.calendar.waitForReady();
    await pages.calendar.showWeek("23–29");
    await pages.calendar.tapCell("Ana Ruiz", "Mon 23 Nov");
    await pages.calendar.tapCell("Ana Ruiz", "Wed 25 Nov");

    await pages.calendar.markSheetAction("Tentative").click();

    for (const day of ["Mon 23 Nov", "Tue 24 Nov", "Wed 25 Nov"]) {
      await expect(pages.calendar.weekCell("Ana Ruiz", day)).toHaveAccessibleName(`Ana Ruiz, ${day}: Tentative`);
    }
    await expect(pages.calendar.markSheet()).toHaveCount(0);
    await expect(pages.calendar.weekSelectedCells()).toHaveCount(0);
    await expect(pages.calendar.phoneHint()).toBeVisible();

    await pages.calendar.toastAction("Marked 3 days tentative", "Undo").click();
    await expect(pages.calendar.weekCell("Ana Ruiz", "Tue 24 Nov")).toHaveAccessibleName("Ana Ruiz, Tue 24 Nov: Working");
  });

  test("Request these days tells a member the manager will be notified (L2-063 AC10, L2-015 AC5)", async ({ goto, pages }) => {
    await goto("calendar", { month: "2026-11", as: "member" });
    await pages.calendar.waitForReady();
    await pages.calendar.showWeek("23–29");
    await pages.calendar.tapCell("Ana Ruiz", "Mon 23 Nov");
    await pages.calendar.tapCell("Ana Ruiz", "Wed 25 Nov");

    await pages.calendar.markSheetAction("Request these days").click();

    await expect(pages.calendar.weekCell("Ana Ruiz", "Tue 24 Nov")).toHaveAttribute("data-status", "requested");
    await expect(pages.calendar.toast("Requested 3 days")).toContainText("Maya Chen will be notified.");
  });

  test("the manager's Confirm turns the range green (L2-063 AC10, L2-015 AC4)", async ({ goto, pages }) => {
    await goto("calendar", { month: "2026-11" });
    await pages.calendar.waitForReady();
    await pages.calendar.showWeek("23–29");
    await pages.calendar.tapCell("Ana Ruiz", "Mon 23 Nov");
    await pages.calendar.tapCell("Ana Ruiz", "Wed 25 Nov");

    await pages.calendar.markSheetAction("Confirm").click();

    await expect(pages.calendar.weekCell("Ana Ruiz", "Tue 24 Nov")).toHaveAttribute("data-status", "confirmed");
    await expect(pages.calendar.toast("3 days marked confirmed for Ana")).toBeVisible();
  });

  test("Clear these days returns the range to working days (L2-063 AC10, L2-015 AC6)", async ({ goto, pages, request }) => {
    await paintDays(request, "Ana Ruiz", ["2026-11-23", "2026-11-24"], "Tentative");
    await goto("calendar", { month: "2026-11", as: "member" });
    await pages.calendar.waitForReady();
    await pages.calendar.showWeek("23–29");
    await pages.calendar.tapCell("Ana Ruiz", "Mon 23 Nov");
    await pages.calendar.tapCell("Ana Ruiz", "Tue 24 Nov");

    await pages.calendar.markSheetAction("Clear these days").click();

    await expect(pages.calendar.weekCell("Ana Ruiz", "Mon 23 Nov")).toHaveAccessibleName("Ana Ruiz, Mon 23 Nov: Working");
    await expect(pages.calendar.toast("Cleared 2 days")).toBeVisible();
  });

  test("a failed save keeps the days and the selection and offers Try again (L2-063 AC10, L2-018 AC2)", async ({ goto, pages, sheetApi }) => {
    await goto("calendar", { month: "2026-11", as: "member" });
    await pages.calendar.waitForReady();
    await pages.calendar.showWeek("23–29");
    await pages.calendar.tapCell("Ana Ruiz", "Mon 23 Nov");
    await pages.calendar.tapCell("Ana Ruiz", "Wed 25 Nov");
    await sheetApi.failSaves();

    await pages.calendar.markSheetAction("Tentative").click();

    await expect(pages.calendar.toast("We couldn’t save those days")).toBeVisible();
    await expect(pages.calendar.weekCell("Ana Ruiz", "Tue 24 Nov")).toHaveAccessibleName("Ana Ruiz, Tue 24 Nov: Working");
    await expect(pages.calendar.weekSelectedCells()).toHaveCount(3);
    await expect(pages.calendar.markSheetAction("Tentative")).toBeEnabled();

    await sheetApi.recoverSaves();
    await pages.calendar.toastAction("We couldn’t save those days", "Try again").click();

    await expect(pages.calendar.weekCell("Ana Ruiz", "Tue 24 Nov")).toHaveAttribute("data-status", "tentative");
    await expect(pages.calendar.markSheet()).toHaveCount(0);
  });

  test("while saving, the actions are off (L2-063 AC10, L2-018)", async ({ goto, pages, sheetApi }) => {
    await goto("calendar", { month: "2026-11", as: "member" });
    await pages.calendar.waitForReady();
    await pages.calendar.showWeek("23–29");
    await pages.calendar.tapCell("Ana Ruiz", "Mon 23 Nov");
    await pages.calendar.tapCell("Ana Ruiz", "Wed 25 Nov");
    const release = await sheetApi.holdSaves();

    await pages.calendar.markSheetAction("Tentative").click();

    await expect(pages.calendar.markSheet()).toHaveAttribute("aria-busy", "true");
    await expect(pages.calendar.markSheetAction("Request these days")).toBeDisabled();
    release();
    await expect(pages.calendar.toast("Marked 3 days tentative")).toBeVisible();
  });

  test("Cancel clears the selection and says so (L2-063 AC11, L2-016 AC4)", async ({ goto, pages }) => {
    await goto("calendar", { month: "2026-11", as: "member" });
    await pages.calendar.waitForReady();
    await pages.calendar.showWeek("23–29");
    await pages.calendar.tapCell("Ana Ruiz", "Mon 23 Nov");

    await pages.calendar.markSheetAction("Cancel").click();

    await expect(pages.calendar.markSheet()).toHaveCount(0);
    await expect(pages.calendar.weekSelectedCells()).toHaveCount(0);
    await expect(pages.calendar.toast("Selection cleared")).toContainText("Pick days to start again.");
  });

  test("Escape clears the selection and says so (L2-063 AC11, L2-016 AC4)", async ({ goto, page, pages }) => {
    await goto("calendar", { month: "2026-11", as: "member" });
    await pages.calendar.waitForReady();
    await pages.calendar.showWeek("23–29");
    await pages.calendar.tapCell("Ana Ruiz", "Mon 23 Nov");
    await pages.calendar.tapCell("Ana Ruiz", "Wed 25 Nov");

    await page.keyboard.press("Escape");

    await expect(pages.calendar.markSheet()).toHaveCount(0);
    await expect(pages.calendar.toast("Selection cleared")).toContainText("Pick days to start again.");
  });
});
