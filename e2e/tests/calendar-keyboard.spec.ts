// Acceptance Test
// Traces to: L2-047 AC1 (the grid half), L2-048
// Description: The sheet is one tab stop and moves with the arrow keys, Home, End and the page keys.
// Data: the demo seed, November and December 2026. 1 Nov is a Sunday, 25 Dec a holiday, nothing is changed.

import { test, expect } from "../fixtures/gl-test.js";

test.describe("The keyboard on the sheet", () => {
  test.beforeEach(async ({ goto, pages }) => {
    await goto("calendar", { as: "member", month: "2026-11" });
    await pages.calendar.waitForReady();
  });

  test("the sheet is a single tab stop (APG grid)", async ({ pages }) => {
    await expect(pages.calendar.tabStops()).toHaveCount(1);
  });

  test("the arrow keys move to the neighbouring day and member, skipping red days", async ({ pages }) => {
    await pages.calendar.focusCell("Ana Ruiz", "Tue 24 Nov");

    await pages.calendar.press("ArrowRight");
    await expect(pages.calendar.focusedCell()).toHaveAccessibleName("Ana Ruiz, Wed 25 Nov: Working");
    await pages.calendar.press("ArrowLeft");
    await expect(pages.calendar.focusedCell()).toHaveAccessibleName("Ana Ruiz, Tue 24 Nov: Working");

    await pages.calendar.press("ArrowDown");
    await expect(pages.calendar.focusedCell()).toHaveAccessibleName(/^(?!Ana Ruiz).+, Tue 24 Nov: /);
    await pages.calendar.press("ArrowUp");
    await expect(pages.calendar.focusedCell()).toHaveAccessibleName("Ana Ruiz, Tue 24 Nov: Working");

    await pages.calendar.focusCell("Ana Ruiz", "Fri 27 Nov");
    await pages.calendar.press("ArrowRight");
    await expect(pages.calendar.focusedCell()).toHaveAccessibleName("Ana Ruiz, Mon 30 Nov: Working");
    await pages.calendar.press("ArrowLeft");
    await expect(pages.calendar.focusedCell()).toHaveAccessibleName("Ana Ruiz, Fri 27 Nov: Working");
  });

  test("the roving tab stop follows focus", async ({ pages }) => {
    await pages.calendar.focusCell("Ana Ruiz", "Tue 24 Nov");
    await pages.calendar.press("ArrowRight");

    await expect(pages.calendar.tabStops()).toHaveCount(1);
    await expect(pages.calendar.tabStops()).toHaveAccessibleName("Ana Ruiz, Wed 25 Nov: Working");
  });

  test("Home and End go to the first and last working day of the row", async ({ pages }) => {
    await pages.calendar.focusCell("Ana Ruiz", "Wed 25 Nov");

    await pages.calendar.press("Home");
    await expect(pages.calendar.focusedCell()).toHaveAccessibleName(/^Ana Ruiz, Mon 2 Nov: /);
    await pages.calendar.press("End");
    await expect(pages.calendar.focusedCell()).toHaveAccessibleName("Ana Ruiz, Mon 30 Nov: Working");
  });

  test("Ctrl+Home and Ctrl+End go to the first and last cell of the sheet", async ({ pages }) => {
    await pages.calendar.focusCell("Ana Ruiz", "Wed 25 Nov");

    await pages.calendar.press("Control+Home");
    await expect(pages.calendar.focusedCell()).toHaveAccessibleName(/, Mon 2 Nov: /);
    await pages.calendar.press("Control+End");
    await expect(pages.calendar.focusedCell()).toHaveAccessibleName(/, Mon 30 Nov: /);
  });

  test("PageDown and PageUp change the month and keep focus on the same row and day", async ({ pages }) => {
    await pages.calendar.focusCell("Ana Ruiz", "Tue 24 Nov");

    await pages.calendar.press("PageDown");
    await expect(pages.calendar.title()).toHaveText("December 2026");
    await expect(pages.calendar.focusedCell()).toHaveAccessibleName(/^Ana Ruiz, Thu 24 Dec: /);

    await pages.calendar.press("PageUp");
    await expect(pages.calendar.title()).toHaveText("November 2026");
    await expect(pages.calendar.focusedCell()).toHaveAccessibleName(/^Ana Ruiz, Tue 24 Nov: /);
  });
});
