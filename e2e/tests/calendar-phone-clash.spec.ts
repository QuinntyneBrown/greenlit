// Acceptance Test
// Traces to: L2-063 AC9
// Description: On a phone, the panel for a range says who else is out on its working days.
// Data: the demo seed, November 2026: Cleo requested 12–13, Ana requested 16–20, Dev requested 18–19, Ben tentative
//       23–27. One test confirms Ana, Cleo, Elif and Finn on 24–26 (as pages/calendar/phone-range) and clears them.
//
// Given Maya's range 12–19 Nov (6 working days), when it shows, then the panel names together the members out on the
//   same number of days, most days first: "Ana is also out 4 of these days. Cleo and Dev are also out 2 of these days."
// Given Ana's range 12–13 Nov, when Cleo is out on both days, then it says "Cleo is also out all of these days."
// Given Ben's range 23–26 Nov, when four others are confirmed on three of its days, then it says
//   "Ana, Cleo, Elif and Finn are also out 3 of these days."
// Given Ana's range 23–26 Nov, when only Ben is tentative on it, then no clash is shown (tentative is not out).

import { test, expect } from "../fixtures/gl-test.js";
import { clearDays, paintDays, weekdays } from "../fixtures/days.js";

test.describe("Who else is out, on a phone", () => {
  test.beforeEach(async ({}, testInfo) => {
    test.skip(testInfo.project.name !== "mobile", "The mark sheet is the phone's (L2-063).");
  });

  test("members out on the same number of days are named together (L2-063 AC9)", async ({ goto, pages }) => {
    await goto("calendar", { month: "2026-11" });
    await pages.calendar.waitForReady();
    await pages.calendar.showWeek("9–15");
    await pages.calendar.tapCell("Maya Chen", "Thu 12 Nov");
    await pages.calendar.showWeek("16–22");
    await pages.calendar.tapCell("Maya Chen", "Thu 19 Nov");

    await expect(pages.calendar.markSheetMeta()).toHaveText("6 working days");
    await expect(pages.calendar.markSheetClash()).toHaveText(
      "Ana is also out 4 of these days. Cleo and Dev are also out 2 of these days.",
    );
  });

  test("someone out on every working day is out all of them (L2-063 AC9)", async ({ goto, pages }) => {
    await goto("calendar", { month: "2026-11" });
    await pages.calendar.waitForReady();
    await pages.calendar.showWeek("9–15");

    await pages.calendar.tapCell("Ana Ruiz", "Thu 12 Nov");
    await pages.calendar.tapCell("Ana Ruiz", "Fri 13 Nov");

    await expect(pages.calendar.markSheetClash()).toHaveText("Cleo is also out all of these days.");
  });

  test("four people out on the same days are listed in one sentence (L2-063 AC9)", async ({ goto, pages, request }) => {
    const run = weekdays("2026-11-24", "2026-11-26");
    const out = ["Ana Ruiz", "Cleo Park", "Elif Yılmaz", "Finn Murphy"];
    for (const member of out) await paintDays(request, member, run, "Confirmed");
    try {
      await goto("calendar", { month: "2026-11" });
      await pages.calendar.waitForReady();
      await pages.calendar.showWeek("23–29");

      await pages.calendar.tapCell("Ben Okafor", "Mon 23 Nov");
      await pages.calendar.tapCell("Ben Okafor", "Thu 26 Nov");

      await expect(pages.calendar.markSheetClash()).toHaveText("Ana, Cleo, Elif and Finn are also out 3 of these days.");
    } finally {
      for (const member of out) await clearDays(request, member, run);
    }
  });

  test("tentative days are not a clash (L2-063 AC9)", async ({ goto, pages }) => {
    await goto("calendar", { month: "2026-11" });
    await pages.calendar.waitForReady();
    await pages.calendar.showWeek("23–29");

    await pages.calendar.tapCell("Ana Ruiz", "Mon 23 Nov");
    await pages.calendar.tapCell("Ana Ruiz", "Thu 26 Nov");

    await expect(pages.calendar.markSheetRange()).toHaveText("Mon 23 – Thu 26 Nov");
    await expect(pages.calendar.markSheetClash()).toHaveCount(0);
  });
});
