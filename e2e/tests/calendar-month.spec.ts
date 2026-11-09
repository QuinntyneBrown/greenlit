// Acceptance Test
// Traces to: L2-012
// Description: The calendar shows one month for the whole team, laid out like the sheet it replaces.
// Data: the demo seed is the mocks' cast (docs/mocks/README.md), November 2026 as pages/calendar/default.

import { test, expect, GRID_ONLY } from "../fixtures/gl-test.js";

const CAST = ["Maya Chen", "Ana Ruiz", "Ben Okafor", "Cleo Park", "Dev Patel", "Elif Yılmaz", "Finn Murphy"];

test.describe("Calendar month", () => {
  test("the month is a grid of members by days with a Left column (L2-012 AC1)", async ({ goto, pages, isMobile }) => {
    test.skip(isMobile, GRID_ONLY);
    await goto("calendar", { month: "2026-11" });
    await pages.calendar.waitForReady();

    await expect(pages.calendar.title()).toHaveText("November 2026");
    await expect(pages.calendar.grid()).toHaveAccessibleName("Time off, November 2026");
    const headers = pages.calendar.columnHeaders();
    await expect(headers).toHaveCount(1 + 30 + 1);
    await expect(headers.first()).toHaveAccessibleName("Team member");
    await expect(headers.last()).toHaveText("Left");
    await expect(pages.calendar.dayHeader("Mon 2 Nov")).toContainText("M");
    await expect(pages.calendar.dayHeader("Mon 2 Nov")).toContainText("2");
    await expect(pages.calendar.dayHeader("Thu 5 Nov")).toContainText("Th");
    await expect(pages.calendar.dayHeader("Sun 1 Nov")).toContainText("Su");
    await expect(pages.calendar.memberNames()).toHaveText(CAST);
  });

  test("without a month in the address the current month opens (L2-012 AC1)", async ({ goto, pages, isMobile }) => {
    test.skip(isMobile, GRID_ONLY);
    await goto("calendar");
    await pages.calendar.waitForReady();

    const current = new Intl.DateTimeFormat("en-GB", { month: "long", year: "numeric", timeZone: "Europe/London" }).format(
      new Date(),
    );
    await expect(pages.calendar.title()).toHaveText(current);
    await expect(pages.calendar.grid()).toHaveAccessibleName(`Time off, ${current}`);
  });

  test("the manager sees the team in its order (L2-012 AC2)", async ({ goto, pages, isMobile }) => {
    test.skip(isMobile, GRID_ONLY);
    await goto("calendar", { month: "2026-11", as: "manager" });
    await pages.calendar.waitForReady();

    await expect(pages.calendar.memberNames()).toHaveText(CAST);
    // Only a member's row is marked "You" (pages/calendar/default shows the manager's view unmarked).
    await expect(pages.calendar.youRow()).toHaveCount(0);
  });

  test("Calendar stays the current navigation item on any month (L2-049 AC3)", async ({ goto, pages }) => {
    await goto("calendar", { month: "2026-10" });
    await pages.calendar.waitForReady();

    await expect(pages.calendar.mainNavLink("Calendar")).toHaveAttribute("aria-current", "page");
  });

  test("a member's own row comes first, marked You (L2-012 AC2)", async ({ goto, pages, isMobile }) => {
    test.skip(isMobile, GRID_ONLY);
    await goto("calendar", { month: "2026-11", as: "member" });
    await pages.calendar.waitForReady();

    await expect(pages.calendar.memberNames()).toHaveText(["Ana Ruiz", ...CAST.filter((n) => n !== "Ana Ruiz")]);
    await expect(pages.calendar.youRow()).toContainText("Ana Ruiz");
    await expect(pages.calendar.youRow()).toContainText("You");
  });
});
