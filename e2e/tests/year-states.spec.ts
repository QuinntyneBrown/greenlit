// Acceptance Test
// Traces to: L2-031 AC5, L2-031 AC6, L2-057 AC2
// Description: A team of only the manager shows its one row; a year that cannot be loaded says
//              so and Try again loads it; while loading, the headings show with placeholder rows.
// Data: the demo seed, with the year request steered by the yearApi fixture.

import { test, expect } from "../fixtures/gl-test.js";

test.describe("Year states", () => {
  test("a team of only the manager shows the grid and the table with their row (L2-031 AC5, L2-057 AC2)", async ({
    goto,
    pages,
    yearApi,
  }) => {
    await yearApi.onlyMe();
    await goto("year", { year: "2026" });
    await pages.year.waitForReady();

    await expect(pages.year.notice()).toHaveCount(0);
    await expect(pages.year.memberNames()).toHaveText(["Maya Chen"]);
    await expect(pages.year.tablePeople()).toHaveText(["Maya Chen"]);
  });

  test("a failed load says so and Try again recovers (L2-031 AC6)", async ({ goto, pages, yearApi }) => {
    await yearApi.fail();
    await goto("year", { year: "2026" });
    await pages.year.waitForReady();

    await expect(pages.year.noticeTitle()).toHaveText("We couldn't load the year");
    await expect(pages.year.noticeText()).toHaveText("Something went wrong on our side. Nothing was changed.");
    await expect(pages.year.grid()).toHaveCount(0);

    await yearApi.recover();
    await pages.year.tryAgain().click();

    await expect(pages.year.grid()).toBeVisible();
    await expect(pages.year.notice()).toHaveCount(0);
    await expect(pages.year.memberNames().first()).toHaveText("Maya Chen");
  });

  test("while loading, the headings show with placeholder rows (L2-031 AC1)", async ({ goto, pages, yearApi }) => {
    const release = await yearApi.hold();
    await goto("year", { year: "2026" });

    await expect(pages.year.title()).toHaveText("2026");
    await expect(pages.year.grid()).toHaveAttribute("aria-busy", "true");
    await expect(pages.year.monthHeaders()).toHaveText(["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]);
    await expect(pages.year.placeholderCells().first()).toBeVisible();

    release();
    await pages.year.waitForReady();
    await expect(pages.year.placeholderCells()).toHaveCount(0);
    await expect(pages.year.memberNames().first()).toHaveText("Maya Chen");
  });

  test("changing the year shows the new year's figures, not the last one's (L2-031 AC1)", async ({ goto, pages, yearApi }) => {
    await goto("year", { year: "2026" });
    await pages.year.waitForReady();
    await expect(pages.year.month("Ana Ruiz", "July")).toHaveAccessibleName("Ana Ruiz, July: 10 confirmed days off");

    const release = await yearApi.hold();
    await pages.year.nextYear().click();

    await expect(pages.year.title()).toHaveText("2027");
    await expect(pages.year.grid()).toHaveAttribute("aria-busy", "true");

    release();
    await expect(pages.year.month("Ana Ruiz", "July")).toHaveAccessibleName("Ana Ruiz, July: 0 confirmed days off");
  });
});
