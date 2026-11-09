// Acceptance Test
// Traces to: L2-057 AC1, AC2, AC3; L2-012 AC6; L2-031 AC5
// Description: A manager who invites no one gets a complete team: the calendar, the year, Requests and their own page
//              all work with a single row and nothing asks them to add people first.
// Data: a fresh account from Continue with Google (fixtures/households.ts), so every run starts on no team.

import { test, expect, GRID_ONLY } from "../fixtures/gl-test.js";
import { createTeam, freshPerson } from "../fixtures/households.js";

test.describe("A team of one", () => {
  test("a team created with no one invited is a complete sheet with the manager's row (L2-057 AC1, AC2)", async ({
    goto,
    page,
    pages,
    isMobile,
  }) => {
    test.skip(isMobile, GRID_ONLY);
    const rosa = await freshPerson(page.request, "Rosa Marín");
    await goto("createTeam", { session: rosa.token });
    await pages.createTeam.waitForReady();

    await pages.createTeam.fill({ name: "Marín Design", members: [] });
    await pages.createTeam.submit().click();

    await expect(pages.createTeam.readyText()).toHaveText(
      "Everyone is on the calendar now, and you can invite them later from Settings.",
    );
    await pages.createTeam.openCalendar().click();
    await pages.calendar.waitForReady();

    await expect(pages.calendar.emptyState()).toHaveCount(0);
    await expect(pages.calendar.memberNames()).toHaveText(["Rosa Marín"]);
    await expect(pages.calendar.outCells().first()).toBeVisible();
  });

  test("the year, Requests and the manager's own page work with one row (L2-057 AC2)", async ({ goto, page, pages }) => {
    const rosa = await freshPerson(page.request, "Rosa Marín");
    await createTeam(page.request, rosa, "Marín Design");

    await goto("year", { session: rosa.token, year: "2026" });
    await pages.year.waitForReady();
    await expect(pages.year.notice()).toHaveCount(0);
    await expect(pages.year.memberNames()).toHaveText(["Rosa Marín"]);
    await expect(pages.year.tablePeople()).toHaveText(["Rosa Marín"]);

    await goto("requests", { session: rosa.token });
    await pages.requests.waitForReady();
    await expect(pages.requests.empty()).toContainText("Nothing waiting.");

    await goto("myTimeOff", { session: rosa.token });
    await pages.person.waitForReady();
    await expect(pages.person.name()).toHaveText("Rosa Marín");
    await expect(pages.person.daysLeftCaption()).toBeVisible();
  });

  test("the manager of a team of one marks their own days and the Out row counts them (L2-057 AC3)", async ({
    goto,
    page,
    pages,
    isMobile,
  }) => {
    test.skip(isMobile, GRID_ONLY);
    const rosa = await freshPerson(page.request, "Rosa Marín");
    await createTeam(page.request, rosa, "Marín Design");

    await goto("calendar", { session: rosa.token, month: "2026-11" });
    await pages.calendar.waitForReady();
    await pages.calendar.choosePaint("Confirmed");
    await pages.calendar.paint("Rosa Marín", "Mon 23 Nov", "Tue 24 Nov");

    await expect(pages.calendar.cell("Rosa Marín", "Mon 23 Nov")).toHaveAttribute("data-status", "confirmed");
    await expect(await pages.calendar.outCell("Mon 23 Nov")).toHaveAccessibleName("1 out, 0 in");
  });
});
