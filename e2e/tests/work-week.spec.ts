// Acceptance Test
// Traces to: L2-039 (AC1, AC2)
// Description: The manager sets the team's work week in Settings; the days that are off turn red on every row.
// Data: each viewport's inviter (Uma, Vic, Wren) manages a team of their own with a teammate; every test
//       puts the work week back to Mon-Fri when it is done, so the demo team and the other specs never see it.

import { test, expect } from "../fixtures/gl-test.js";
import { februaryFriday } from "../fixtures/dates.js";
import { PEOPLE, inviterFor } from "../fixtures/session.js";
import { ensureMember, ensureOwnTeam } from "../fixtures/team.js";
import { MON_TO_FRI, setWorkWeek } from "../fixtures/working-days.js";

test.describe("The team's work week", () => {
  test.beforeEach(async ({ goto, pages, request }, testInfo) => {
    const manager = inviterFor(testInfo.project.name);
    await ensureOwnTeam(request, manager, "Holiday team");
    await ensureMember(request, manager, "Teammate Holiday");
    await setWorkWeek(request, manager, MON_TO_FRI);
    await goto("settings", { as: manager });
    await pages.settings.waitForReady();
    await pages.settings.waitForHolidays();
  });

  test.afterEach(async ({ request }, testInfo) => {
    await setWorkWeek(request, inviterFor(testInfo.project.name), MON_TO_FRI);
  });

  test("Save changes waits for an edit, and unpressing Friday saves it (L2-039 AC2)", async ({ pages, workingDaysApi }) => {
    const settings = pages.settings;
    await expect(settings.saveWorkWeekButton()).toBeDisabled();

    await settings.workingDay("Fri").click();

    await expect(settings.workingDay("Fri")).toHaveAttribute("aria-pressed", "false");
    await expect(settings.saveWorkWeekButton()).toBeEnabled();
    await settings.saveWorkWeekButton().click();
    await expect(settings.saveWorkWeekStatus()).toHaveText("Saved");
    await expect(settings.saveWorkWeekButton()).toBeDisabled();
    expect(workingDaysApi.weekSaves()).toBe(1);
  });

  test("a saved work week is what Settings shows next time, and its off days are red on every row (L2-039 AC1, AC2)", async ({
    goto,
    pages,
  }, testInfo) => {
    const manager = inviterFor(testInfo.project.name);
    const friday = februaryFriday();
    await pages.settings.workingDay("Fri").click();
    await pages.settings.saveWorkWeekButton().click();
    await expect(pages.settings.saveWorkWeekStatus()).toHaveText("Saved");

    await goto("settings", { as: manager });
    await pages.settings.waitForReady();
    await pages.settings.waitForHolidays();
    await expect(pages.settings.workingDay("Thu")).toHaveAttribute("aria-pressed", "true");
    await expect(pages.settings.workingDay("Fri")).toHaveAttribute("aria-pressed", "false");

    await goto("calendar", { as: manager, month: friday.month });
    await pages.calendar.waitForReady();
    for (const member of [PEOPLE[manager].name, "Teammate Holiday"]) {
      await expect(pages.calendar.cell(member, friday.label)).toHaveAttribute("aria-label", /Not working$/);
    }
  });

  test("with no day on, the section says so and nothing can be saved (the same rule as L2-040 AC2)", async ({ pages, workingDaysApi }) => {
    const settings = pages.settings;
    for (const day of ["Mon", "Tue", "Wed", "Thu", "Fri"]) await settings.workingDay(day).click();

    await expect(settings.workingDaysError()).toHaveText("Pick at least one working day.");
    await expect(settings.saveWorkWeekButton()).toBeDisabled();
    expect(workingDaysApi.weekSaves()).toBe(0);
  });

  test("saving shows Saving… and keeps the chips still (busy)", async ({ pages, workingDaysApi }) => {
    const release = await workingDaysApi.holdWeek();
    await pages.settings.workingDay("Fri").click();

    await pages.settings.saveWorkWeekButton().click();

    await expect(pages.settings.saveWorkWeekButton()).toHaveText("Saving…");
    await expect(pages.settings.saveWorkWeekButton()).toBeDisabled();
    await expect(pages.settings.workingDay("Mon")).toBeDisabled();
    release();
    await expect(pages.settings.saveWorkWeekStatus()).toHaveText("Saved");
    await expect(pages.settings.workingDay("Mon")).toBeEnabled();
  });

  test("a failed save keeps the chips as entered and a toast offers Try again (failed)", async ({ pages, workingDaysApi }) => {
    const settings = pages.settings;
    await workingDaysApi.failWeek();
    await settings.workingDay("Fri").click();

    await settings.saveWorkWeekButton().click();

    await expect(settings.toast("We couldn’t save your changes")).toBeVisible();
    await expect(settings.toastText("We couldn’t save your changes")).toHaveText("Nothing was changed. Check your connection and try again.");
    await expect(settings.workingDay("Fri")).toHaveAttribute("aria-pressed", "false");
    await expect(settings.saveWorkWeekButton()).toBeEnabled();

    await workingDaysApi.recoverWeek();
    await settings.toastAction("We couldn’t save your changes", "Try again").click();
    await expect(settings.saveWorkWeekStatus()).toHaveText("Saved");
  });
});
