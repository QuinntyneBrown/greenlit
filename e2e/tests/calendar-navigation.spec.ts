// Acceptance Test
// Traces to: L2-012
// Description: Moving between months, returning to today, the legend, and the empty, error and loading states.

import { test, expect, GRID_ONLY } from "../fixtures/gl-test.js";


test.skip(({ isMobile }) => isMobile, GRID_ONLY);
test.describe("Calendar navigation", () => {
  test("Previous and Next month change the month and the title (L2-012 AC3)", async ({ goto, pages }) => {
    await goto("calendar", { month: "2026-11" });
    await pages.calendar.waitForReady();

    await pages.calendar.previousMonth().click();
    await expect(pages.calendar.title()).toHaveText("October 2026");
    await expect(pages.calendar.grid()).toHaveAccessibleName("Time off, October 2026");
    await expect(pages.calendar.columnHeaders()).toHaveCount(1 + 31 + 1);

    await pages.calendar.nextMonth().click();
    await pages.calendar.nextMonth().click();
    await expect(pages.calendar.title()).toHaveText("December 2026");
    await expect(pages.calendar.cell("Maya Chen", "Fri 25 Dec")).toHaveAccessibleName(
      "Maya Chen, Fri 25 Dec: Christmas Day",
    );
  });

  test("another month offers Today, which returns to the current month (L2-012 AC4)", async ({ goto, pages }) => {
    const current = new Intl.DateTimeFormat("en-GB", { month: "long", year: "numeric", timeZone: "Europe/London" }).format(
      new Date(),
    );
    await goto("calendar");
    await pages.calendar.waitForReady();
    await expect(pages.calendar.today()).toHaveCount(0);

    await pages.calendar.previousMonth().click();
    await expect(pages.calendar.title()).not.toHaveText(current);
    await expect(pages.calendar.today()).toBeVisible();

    await pages.calendar.today().click();
    await expect(pages.calendar.title()).toHaveText(current);
    await expect(pages.calendar.today()).toHaveCount(0);
  });

  test("the legend names the four colours (L2-012 AC5)", async ({ goto, pages }) => {
    await goto("calendar", { month: "2026-11" });
    await pages.calendar.waitForReady();

    await expect(pages.calendar.legendItems()).toHaveText(["Confirmed", "Requested", "Tentative", "Weekend / holiday"]);
  });
});

test.describe("Calendar states", () => {
  test("a team of only the manager shows the sheet with their row, not an empty state (L2-012 AC6, L2-057 AC2)", async ({
    goto,
    pages,
    sheetApi,
  }) => {
    await sheetApi.onlyMe();
    await goto("calendar", { month: "2026-11" });
    await pages.calendar.waitForReady();

    await expect(pages.calendar.emptyState()).toHaveCount(0);
    await expect(pages.calendar.memberNames()).toHaveText(["Maya Chen"]);
    await expect(pages.calendar.paintPicker()).toBeVisible();
  });

  test("a failed load says so and Try again recovers (L2-012 AC7)", async ({ goto, pages, sheetApi }) => {
    await sheetApi.fail();
    await goto("calendar", { month: "2026-11" });
    await pages.calendar.waitForReady();

    await expect(pages.calendar.errorState()).toContainText("We couldn't load the calendar");
    await expect(pages.calendar.errorState()).toContainText(
      "Something went wrong on our side. Your days are safe, and nothing was changed.",
    );

    await sheetApi.recover();
    await pages.calendar.stateAction("Try again").click();
    await expect(pages.calendar.grid()).toHaveAccessibleName("Time off, November 2026");
    await expect(pages.calendar.errorState()).toHaveCount(0);
  });

  test("while loading, the headings show with placeholder rows (L2-012 AC8)", async ({ goto, pages, sheetApi }) => {
    const release = await sheetApi.hold();
    await goto("calendar", { month: "2026-11" });

    await expect(pages.calendar.title()).toHaveText("November 2026");
    await expect(pages.calendar.grid()).toHaveAttribute("aria-busy", "true");
    await expect(pages.calendar.columnHeaders()).toHaveCount(1 + 30 + 1);
    await expect(pages.calendar.placeholderCells().first()).toBeVisible();

    release();
    await pages.calendar.waitForReady();
    await expect(pages.calendar.placeholderCells()).toHaveCount(0);
    await expect(pages.calendar.memberNames().first()).toHaveText("Maya Chen");
  });
});
