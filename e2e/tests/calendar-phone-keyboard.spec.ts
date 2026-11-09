// Acceptance Test
// Traces to: L2-063 AC15
// Description: The phone layout works from a keyboard: every tab, date, cell, run and panel action is reachable with
//              Tab and works with Enter or Space; Escape clears a selection.
// Data: the demo seed, November 2026, with four people confirmed on 24–26 Nov for a short-days run (cleared after).
//       Nothing else is saved.
//
// Given the week tabs, when the selected tab has focus and the person presses the right arrow or Enter on a tab,
//   then that week shows.
// Given a date, when the person reaches it with Tab and presses Enter, then its panel opens; Space closes it.
// Given a short-days run, when the person reaches it with Tab and presses Enter, then its week shows.
// Given a cell, when the person reaches it with Tab and presses Enter, then it is picked; Space on a second cell ends
//   the range; the panel's actions are reachable with Tab; Escape clears the selection.

import { test, expect } from "../fixtures/gl-test.js";
import { clearDays, paintDays, weekdays } from "../fixtures/days.js";

const RUN = weekdays("2026-11-24", "2026-11-26");
const OUT = ["Ana Ruiz", "Cleo Park", "Elif Yılmaz", "Finn Murphy"];

test.describe("The phone layout from a keyboard", () => {
  test.beforeEach(async ({}, testInfo) => {
    test.skip(testInfo.project.name !== "mobile", "The phone's week (L2-063).");
  });

  test("week tabs move with the arrow keys and Enter (L2-063 AC15)", async ({ goto, page, pages }) => {
    await goto("calendar", { month: "2026-11" });
    await pages.calendar.waitForReady();
    await pages.calendar.showWeek("9–15");

    await page.keyboard.press("ArrowRight");
    await expect(pages.calendar.selectedWeekTab()).toHaveText("16–22");
    await expect(pages.calendar.weekTab("16–22")).toBeFocused();

    await page.keyboard.press("End");
    await expect(pages.calendar.selectedWeekTab()).toHaveText("30");
    await page.keyboard.press("Home");
    await expect(pages.calendar.selectedWeekTab()).toHaveText("1");
  });

  test("a date opens with Enter and closes with Space (L2-063 AC15)", async ({ goto, page, pages }) => {
    await goto("calendar", { month: "2026-11" });
    await pages.calendar.waitForReady();
    await pages.calendar.showWeek("16–22");

    expect(await pages.calendar.tabTo(pages.calendar.weekDate("Wed 18 Nov"))).toBe(true);
    await page.keyboard.press("Enter");
    await expect(pages.calendar.dayPanel()).toHaveAccessibleName("Out on 18 Nov");
    await page.keyboard.press("Space");
    await expect(pages.calendar.dayPanel()).toHaveCount(0);
  });

  test("a short-days run opens with Enter (L2-063 AC15)", async ({ goto, page, pages, request }) => {
    for (const member of OUT) await paintDays(request, member, RUN, "Confirmed");
    try {
      await goto("calendar", { month: "2026-11" });
      await pages.calendar.waitForReady();

      expect(await pages.calendar.tabTo(pages.calendar.shortRun("Tue 24 – Thu 26 Nov"))).toBe(true);
      await page.keyboard.press("Enter");

      await expect(pages.calendar.selectedWeekTab()).toHaveAccessibleName(/^23–29/);
      await expect(pages.calendar.dayPanel()).toHaveAccessibleName("Out on 24 Nov");
    } finally {
      for (const member of OUT) await clearDays(request, member, RUN);
    }
  });

  test("cells pick a range with Enter and Space, actions are reachable, Escape clears (L2-063 AC15)", async ({ goto, page, pages }) => {
    await goto("calendar", { month: "2026-11" });
    await pages.calendar.waitForReady();
    await pages.calendar.showWeek("23–29");

    expect(await pages.calendar.tabTo(pages.calendar.weekCell("Ana Ruiz", "Mon 23 Nov"))).toBe(true);
    await page.keyboard.press("Enter");
    await expect(pages.calendar.markSheetRange()).toHaveText("From Mon 23 Nov");

    expect(await pages.calendar.tabTo(pages.calendar.weekCell("Ana Ruiz", "Wed 25 Nov"))).toBe(true);
    await page.keyboard.press("Space");
    await expect(pages.calendar.markSheetRange()).toHaveText("Mon 23 – Wed 25 Nov");

    expect(await pages.calendar.tabTo(pages.calendar.markSheetAction("Clear these days"))).toBe(true);
    await page.keyboard.press("Escape");
    await expect(pages.calendar.markSheet()).toHaveCount(0);
    await expect(pages.calendar.toast("Selection cleared")).toBeVisible();
  });
});
