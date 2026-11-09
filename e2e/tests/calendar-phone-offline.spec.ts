// Acceptance Test
// Traces to: L2-063 AC14 (with L2-045 AC1 on the phone)
// Description: Offline, nothing on the phone's week can be marked, while reading it still works.
// Data: the demo seed, November 2026, with four people confirmed on 24–26 Nov for a short-days run (cleared after).
//
// Given Greenlit is offline, when the manager looks at the week, then no cell is a button and a tap opens no panel,
//   while the week tabs, the dates and the short-days card still work.
// Given a first day was picked, when Greenlit goes offline, then the selection clears.

import { test, expect } from "../fixtures/gl-test.js";
import { clearDays, paintDays, weekdays } from "../fixtures/days.js";

const RUN = weekdays("2026-11-24", "2026-11-26");
const OUT = ["Ana Ruiz", "Cleo Park", "Elif Yılmaz", "Finn Murphy"];

test.describe("The phone's week offline", () => {
  test.beforeEach(async ({ request }, testInfo) => {
    test.skip(testInfo.project.name !== "mobile", "The phone's week (L2-063).");
    for (const member of OUT) await paintDays(request, member, RUN, "Confirmed");
  });
  test.afterEach(async ({ request }, testInfo) => {
    if (testInfo.project.name === "mobile") for (const member of OUT) await clearDays(request, member, RUN);
  });

  test("no cell takes a tap, while tabs, dates and short days still work (L2-063 AC14)", async ({ goto, pages }) => {
    await goto("calendar", { month: "2026-11" });
    await pages.calendar.waitForReady();
    await pages.connection.goOffline();
    try {
      await expect(pages.connection.title()).toHaveText("You’re offline");

      await pages.calendar.showWeek("16–22");
      await expect(pages.calendar.selectedWeekTab()).toHaveText("16–22");
      await expect(pages.calendar.weekCell("Ana Ruiz", "Mon 16 Nov")).toHaveRole("img");
      await pages.calendar.weekCell("Ana Ruiz", "Mon 16 Nov").click();
      await expect(pages.calendar.markSheet()).toHaveCount(0);

      await pages.calendar.openDay("Wed 18 Nov");
      await expect(pages.calendar.dayPanel()).toHaveAccessibleName("Out on 18 Nov");

      await pages.calendar.shortRun("Tue 24 – Thu 26 Nov").click();
      await expect(pages.calendar.selectedWeekTab()).toHaveAccessibleName(/^23–29/);
      await expect(pages.calendar.dayPanel()).toHaveAccessibleName("Out on 24 Nov");
    } finally {
      await pages.connection.goOnline();
    }
  });

  test("going offline clears a selection (L2-063 AC14)", async ({ goto, pages }) => {
    await goto("calendar", { month: "2026-11" });
    await pages.calendar.waitForReady();
    await pages.calendar.showWeek("23–29");
    await pages.calendar.tapCell("Ben Okafor", "Mon 23 Nov");
    await expect(pages.calendar.markSheet()).toBeVisible();

    await pages.connection.goOffline();
    try {
      await expect(pages.connection.title()).toHaveText("You’re offline");
      await expect(pages.calendar.markSheet()).toHaveCount(0);
      await expect(pages.calendar.weekSelectedCells()).toHaveCount(0);
    } finally {
      await pages.connection.goOnline();
    }
  });
});
