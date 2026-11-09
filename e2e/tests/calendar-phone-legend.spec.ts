// Acceptance Test
// Traces to: L2-063 AC13
// Description: On a phone the legend shows once, with the band of short days, and names the week's holidays.
// Data: the demo seed: Christmas Day on Fri 25 Dec and Boxing Day (substitute) on Mon 28 Dec 2026; no holiday in
//       November.
//
// Given the phone layout, when the calendar renders, then one legend shows "Confirmed", "Requested", "Tentative",
//   "Weekend / holiday" and "Short of people".
// Given the week shown holds a team holiday, when it renders, then a line says "25 Dec is Christmas Day. It never
//   counts as time off."; given it holds none, then no line shows.

import { test, expect } from "../fixtures/gl-test.js";

test.describe("The legend on a phone", () => {
  test.beforeEach(async ({}, testInfo) => {
    test.skip(testInfo.project.name !== "mobile", "The phone's legend (L2-063).");
  });

  test("the legend shows once, with the band of short days (L2-063 AC13)", async ({ goto, pages }) => {
    await goto("calendar", { month: "2026-11" });
    await pages.calendar.waitForReady();

    await expect(pages.calendar.legends()).toHaveCount(1);
    await expect(pages.calendar.legends().getByRole("listitem")).toHaveText([
      "Confirmed",
      "Requested",
      "Tentative",
      "Weekend / holiday",
      "Short of people",
    ]);
    await expect(pages.calendar.holidayNote()).toHaveCount(0);
  });

  test("a week with a holiday names it (L2-063 AC13)", async ({ goto, pages }) => {
    await goto("calendar", { month: "2026-12" });
    await pages.calendar.waitForReady();

    await pages.calendar.showWeek("21–27");
    await expect(pages.calendar.holidayNote()).toHaveText("25 Dec is Christmas Day. It never counts as time off.");

    await pages.calendar.showWeek("28–31");
    await expect(pages.calendar.holidayNote()).toHaveText("28 Dec is Boxing Day (substitute). It never counts as time off.");

    await pages.calendar.showWeek("14–20");
    await expect(pages.calendar.holidayNote()).toHaveCount(0);
  });
});
