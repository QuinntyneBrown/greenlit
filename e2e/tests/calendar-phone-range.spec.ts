// Acceptance Test
// Traces to: L2-063 AC8 (with L2-016 AC2 and AC5 on the phone)
// Description: On a phone, a second tap on the same row ends the range; the panel says what it holds and what to do.
// Data: the demo seed, November 2026. Nothing is saved by the tests themselves. For the overage, Ana (11 days left,
//       5 requested) first has 7–11 Dec requested through the API, as calendar-select-allowance does, so 14–16 Dec
//       goes 2 days over; 7–18 Dec is cleared after.
//
// Given Ana's Mon 23 Nov is picked, when the manager taps Ana's Thu 26 Nov, then 23–26 show as selected and the panel
//   shows "Mon 23 – Thu 26 Nov", "4 working days" and "Request these days", "Tentative", "Confirm", "Clear these days".
// Given a first day, when the second tap is earlier on the row, then the range runs from the earlier day.
// Given a first day, when the person changes week and taps the same row, then the range crosses the weekend, counting
//   only working days.
// Given a first day, when the person presses "Just this day", then that day alone is selected.
// Given a first day, when the person taps another row, then picking starts again from that cell.
// Given a member, when they pick a range on their row, then "Confirm" is not offered.
// Given a range longer than the days left, when it shows, then the panel shows the overage.

import { test, expect } from "../fixtures/gl-test.js";
import { clearDays, paintDays, weekdays } from "../fixtures/days.js";

test.describe("A range on a phone", () => {
  test.beforeEach(async ({}, testInfo) => {
    test.skip(testInfo.project.name !== "mobile", "Tapping a first and last day is the phone's (L2-063).");
  });

  test("a second tap on the row ends the range (L2-063 AC8)", async ({ goto, pages }) => {
    await goto("calendar", { month: "2026-11" });
    await pages.calendar.waitForReady();
    await pages.calendar.showWeek("23–29");

    await pages.calendar.tapCell("Ana Ruiz", "Mon 23 Nov");
    await pages.calendar.tapCell("Ana Ruiz", "Thu 26 Nov");

    await expect(pages.calendar.weekSelectedCells()).toHaveCount(4);
    await expect(pages.calendar.markSheetWho()).toHaveText("Ana Ruiz");
    await expect(pages.calendar.markSheetRange()).toHaveText("Mon 23 – Thu 26 Nov");
    await expect(pages.calendar.markSheetMeta()).toHaveText("4 working days");
    await expect(pages.calendar.markSheetWarning()).toHaveCount(0);
    await expect(pages.calendar.markSheetActions()).toHaveText([
      "Request these days",
      "Tentative",
      "Confirm",
      "Clear these days",
    ]);
  });

  test("the second tap may come first on the row (L2-063 AC8)", async ({ goto, pages }) => {
    await goto("calendar", { month: "2026-11" });
    await pages.calendar.waitForReady();
    await pages.calendar.showWeek("23–29");

    await pages.calendar.tapCell("Ana Ruiz", "Thu 26 Nov");
    await pages.calendar.tapCell("Ana Ruiz", "Tue 24 Nov");

    await expect(pages.calendar.markSheetRange()).toHaveText("Tue 24 – Thu 26 Nov");
    await expect(pages.calendar.markSheetMeta()).toHaveText("3 working days");
  });

  test("the range may cross into another week (L2-063 AC8)", async ({ goto, pages }) => {
    await goto("calendar", { month: "2026-11" });
    await pages.calendar.waitForReady();
    await pages.calendar.showWeek("23–29");

    await pages.calendar.tapCell("Ana Ruiz", "Thu 26 Nov");
    await pages.calendar.showWeek("30");
    await pages.calendar.tapCell("Ana Ruiz", "Mon 30 Nov");

    await expect(pages.calendar.markSheetRange()).toHaveText("Thu 26 – Mon 30 Nov");
    await expect(pages.calendar.markSheetMeta()).toHaveText("3 working days");
    await pages.calendar.showWeek("23–29");
    await expect(pages.calendar.weekSelectedCells()).toHaveCount(4);
  });

  test("Just this day selects the first day alone (L2-063 AC8)", async ({ goto, pages }) => {
    await goto("calendar", { month: "2026-11" });
    await pages.calendar.waitForReady();
    await pages.calendar.showWeek("23–29");
    await pages.calendar.tapCell("Ana Ruiz", "Wed 25 Nov");

    await pages.calendar.markSheetAction("Just this day").click();

    await expect(pages.calendar.markSheetRange()).toHaveText("Wed 25 Nov");
    await expect(pages.calendar.markSheetMeta()).toHaveText("1 working day");
    await expect(pages.calendar.markSheetAction("Request these days")).toBeVisible();
  });

  test("a tap on another row starts again (L2-063 AC8)", async ({ goto, pages }) => {
    await goto("calendar", { month: "2026-11" });
    await pages.calendar.waitForReady();
    await pages.calendar.showWeek("23–29");
    await pages.calendar.tapCell("Ana Ruiz", "Mon 23 Nov");

    await pages.calendar.tapCell("Cleo Park", "Wed 25 Nov");

    await expect(pages.calendar.markSheetWho()).toHaveText("Cleo Park");
    await expect(pages.calendar.markSheetRange()).toHaveText("From Wed 25 Nov");
    await expect(pages.calendar.weekSelectedCells()).toHaveCount(1);
  });

  test("a member is not offered Confirm (L2-063 AC8, L2-016 AC2)", async ({ goto, pages }) => {
    await goto("calendar", { month: "2026-11", as: "member" });
    await pages.calendar.waitForReady();
    await pages.calendar.showWeek("23–29");

    await pages.calendar.tapCell("Ana Ruiz", "Mon 23 Nov");
    await pages.calendar.tapCell("Ana Ruiz", "Tue 24 Nov");

    await expect(pages.calendar.markSheetActions()).toHaveText(["Request these days", "Tentative", "Clear these days"]);
  });

  test("a range beyond the days left shows the overage (L2-063 AC8, L2-016 AC5)", async ({ goto, pages, request }) => {
    const december = weekdays("2026-12-07", "2026-12-18");
    await clearDays(request, "Ana Ruiz", december);
    await paintDays(request, "Ana Ruiz", weekdays("2026-12-07", "2026-12-11"), "Requested");
    try {
      await goto("calendar", { month: "2026-12" });
      await pages.calendar.waitForReady();
      await pages.calendar.showWeek("14–20");

      await pages.calendar.tapCell("Ana Ruiz", "Mon 14 Dec");
      await pages.calendar.tapCell("Ana Ruiz", "Wed 16 Dec");

      await expect(pages.calendar.markSheetMeta()).toContainText("3 working days");
      await expect(pages.calendar.markSheetWarning()).toHaveText("2 days over allowance");
    } finally {
      await clearDays(request, "Ana Ruiz", december);
    }
  });
});
