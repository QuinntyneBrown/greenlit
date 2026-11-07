// Acceptance Test
// Traces to: L2-036 (AC1, AC2)
// Description: The manager sees the team's holidays in the Work week & holidays section of Settings.
// Data: each viewport's inviter (Uma, Vic, Wren) manages a team of their own, made through the API with the
//       United Kingdom calendar for this year and next; the demo team is never touched. The empty list is
//       stubbed, because a team cannot be made with no holidays and then keep the calendar's name.

import { test, expect } from "../fixtures/gl-test.js";
import { inviterFor } from "../fixtures/session.js";
import { ensureOwnTeam } from "../fixtures/team.js";

test.describe("Team holidays", () => {
  test.beforeEach(async ({ request }, testInfo) => {
    await ensureOwnTeam(request, inviterFor(testInfo.project.name), "Holiday team");
  });

  test("the section lists the working days, the holidays with their source, and Add day off (L2-036 AC1)", async ({
    goto,
    pages,
  }, testInfo) => {
    await goto("settings", { as: inviterFor(testInfo.project.name) });
    await pages.settings.waitForReady();
    await pages.settings.waitForHolidays();

    const settings = pages.settings;
    await expect(settings.workWeekIntro().first()).toHaveText(
      "Non-working days and holidays show red on the calendar and never count against allowance.",
    );
    await expect(settings.workingDays()).toHaveText(["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]);
    await expect(settings.workingDays().nth(0)).toHaveAttribute("aria-pressed", "true");
    await expect(settings.workingDays().nth(4)).toHaveAttribute("aria-pressed", "true");
    await expect(settings.workingDays().nth(5)).toHaveAttribute("aria-pressed", "false");
    await expect(settings.holidaySource()).toHaveText("Public holidays: United Kingdom");

    await expect(settings.holidayDate("New Year's Day")).toHaveText(/^(Mon|Tue|Wed|Thu|Fri|Sat|Sun) 1 Jan$/);
    await expect(settings.removeHolidayButton("New Year's Day")).toBeVisible();
    await expect(settings.removeHolidayButton("Christmas Day")).toBeVisible();
    expect(await settings.holidayRows().count()).toBeGreaterThanOrEqual(8);
    await expect(settings.addDayOffButton()).toBeVisible();
  });

  test("a team with no holidays says so and still offers Add day off (L2-036 AC2)", async ({ goto, holidaysApi, pages }, testInfo) => {
    await holidaysApi.stubList({ year: 2026, source: null, holidays: [] });
    await goto("settings", { as: inviterFor(testInfo.project.name) });
    await pages.settings.waitForReady();
    await pages.settings.waitForHolidays();

    await expect(pages.settings.emptyTitle()).toHaveText("No holidays yet");
    await expect(pages.settings.emptyText()).toHaveText(
      "Add the days your team is off together. They turn red for everyone and never count against allowance.",
    );
    await expect(pages.settings.holidayRows()).toHaveCount(0);
    await expect(pages.settings.addDayOffButton()).toBeVisible();
  });

  test("a failed read says so and Try again loads the holidays", async ({ goto, holidaysApi, pages }, testInfo) => {
    await holidaysApi.failList();
    await goto("settings", { as: inviterFor(testInfo.project.name) });
    await pages.settings.waitForReady();
    await pages.settings.waitForHolidays();

    await expect(pages.settings.emptyTitle()).toHaveText("We couldn’t load the holidays");
    await holidaysApi.recoverList();
    await pages.settings.workWeekSection().getByRole("button", { name: "Try again", exact: true }).click();

    await expect(pages.settings.removeHolidayButton("Christmas Day")).toBeVisible();
  });

  test("a member does not see the holidays settings", async ({ goto, pages }) => {
    await goto("settings", { as: "member" });
    await pages.settings.waitForReady();

    await expect(pages.settings.readOnlyNote()).toBeVisible();
    await expect(pages.settings.workWeekSection()).toHaveCount(0);
  });
});
