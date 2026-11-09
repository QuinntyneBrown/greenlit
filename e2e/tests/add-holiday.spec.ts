// Acceptance Test
// Traces to: L2-037 (AC1 to AC5)
// Description: The manager adds a team day off from Settings; the date turns red for everyone.
// Data: each viewport's inviter (Uma, Vic, Wren) manages a team of their own, made through the API with the
//       United Kingdom calendar for this year and next, and adds the day off in a month of their own
//       (fixtures/dates.ts), so the demo team and the other viewports are never touched.

import { test, expect, GRID_ONLY } from "../fixtures/gl-test.js";
import { christmas, offsiteFor, weekendFor } from "../fixtures/dates.js";
import { PEOPLE, inviterFor } from "../fixtures/session.js";
import { ensureMember, ensureOwnTeam } from "../fixtures/team.js";

test.describe("Adding a day off", () => {
  test.beforeEach(async ({ goto, pages, request }, testInfo) => {
    const manager = inviterFor(testInfo.project.name);
    await ensureOwnTeam(request, manager, "Holiday team");
    await ensureMember(request, manager, "Teammate Holiday");
    await goto("settings", { as: manager });
    await pages.settings.waitForReady();
    await pages.settings.waitForHolidays();
  });

  test("Add day off opens a dialog with date and name (L2-037 AC1)", async ({ pages }) => {
    await pages.settings.openAddHolidayDialog();

    const dialog = pages.addHoliday;
    await expect(dialog.dialog()).toBeVisible();
    await expect(dialog.description()).toHaveText("It turns red for everyone and never counts against allowance.");
    await expect(dialog.date()).toBeFocused();
    await expect(dialog.date()).toHaveAttribute("type", "date");
    await expect(dialog.name()).toHaveAttribute("placeholder", "e.g. Company offsite");
    await expect(dialog.cancel()).toBeVisible();
    await expect(dialog.add()).toHaveText("Add day off");
    await expect(dialog.add()).toBeDisabled();
  });

  test("Esc closes the dialog and focus returns to Add day off (keyboard)", async ({ page, pages }) => {
    await pages.settings.addDayOffButton().focus();
    await page.keyboard.press("Enter");
    await expect(pages.addHoliday.dialog()).toBeVisible();

    await page.keyboard.press("Escape");

    await expect(pages.addHoliday.dialog()).toBeHidden();
    await expect(pages.settings.addDayOffButton()).toBeFocused();
  });

  test("a date that is already a holiday and an empty name are named, and nothing is added (L2-037 AC2)", async ({
    holidaysApi,
    pages,
  }) => {
    const day = christmas();
    await pages.settings.openAddHolidayDialog();
    const dialog = pages.addHoliday;
    await dialog.fill({ date: day.iso });

    await dialog.add().click();

    await expect(dialog.summary()).toContainText("Fix 2 things to continue");
    await expect(dialog.summaryLinks()).toHaveText([`${day.label.replace(/^\w+ /, "")} is already a holiday`, "Give the day off a name"]);
    await expect(dialog.dateError()).toHaveText(`${day.label} is already a holiday (Christmas Day).`);
    await expect(dialog.nameError()).toHaveText("Give the day off a name.");
    await expect(dialog.date()).toHaveAttribute("aria-invalid", "true");
    await expect(dialog.name()).toHaveAttribute("aria-invalid", "true");
    expect(holidaysApi.adds()).toBe(0);
  });

  test("adding shows Adding…, then the day off is listed and red for everyone (L2-037 AC4)", async ({
    goto,
    holidaysApi,
    pages,
    isMobile,
  }, testInfo) => {
    test.skip(isMobile, GRID_ONLY);
    const day = offsiteFor(testInfo.project.name);
    await pages.settings.openAddHolidayDialog();
    const dialog = pages.addHoliday;
    await dialog.fill({ date: day.iso, name: "Team offsite" });
    const release = await holidaysApi.holdAdd();

    await dialog.add().click();

    await expect(dialog.add()).toHaveText("Adding…");
    await expect(dialog.add()).toHaveAttribute("aria-busy", "true");
    await expect(dialog.add()).toBeDisabled();
    await expect(dialog.cancel()).toBeDisabled();
    await expect(dialog.date()).toHaveAttribute("readonly", "");
    await expect(dialog.name()).toHaveAttribute("readonly", "");
    release();

    await expect(dialog.dialog()).toBeHidden();
    await expect(pages.settings.holidayDate("Team offsite")).toHaveText(day.label);
    await expect(pages.settings.removeHolidayButton("Team offsite")).toBeVisible();

    await goto("calendar", { as: inviterFor(testInfo.project.name), month: day.month });
    await pages.calendar.waitForReady();
    for (const member of [PEOPLE[inviterFor(testInfo.project.name)].name, "Teammate Holiday"]) {
      const cell = pages.calendar.cell(member, day.label);
      await expect(cell).toHaveAccessibleName(`${member}, ${day.label}: Team offsite`);
      await expect(cell).toHaveAttribute("data-status", "off");
    }
  });

  test("a weekend date adds nothing and says so (L2-037 AC3)", async ({ holidaysApi, pages }, testInfo) => {
    const day = weekendFor(testInfo.project.name);
    await pages.settings.openAddHolidayDialog();
    await pages.addHoliday.fill({ date: day.iso, name: "Saturday offsite" });

    await pages.addHoliday.add().click();

    await expect(pages.addHoliday.dialog()).toBeHidden();
    await expect(pages.settings.toast("That day is already a weekend")).toBeVisible();
    await expect(pages.settings.toastText("That day is already a weekend")).toHaveText(
      "Nothing changes on the calendar, so we didn’t add it.",
    );
    await expect(pages.settings.holidayDate("Saturday offsite")).toHaveCount(0);
    expect(holidaysApi.adds()).toBe(1);
  });

  test("a failed add keeps the values and Try again adds the day off (L2-037 AC5)", async ({ holidaysApi, pages }, testInfo) => {
    const day = offsiteFor(testInfo.project.name);
    const retry = onOrAfterNextWeek(day.iso);
    await pages.settings.openAddHolidayDialog();
    const dialog = pages.addHoliday;
    await dialog.fill({ date: retry, name: "Failed offsite" });
    await holidaysApi.failAdd();

    await dialog.add().click();

    await expect(dialog.failure()).toContainText("We couldn’t add the day off");
    await expect(dialog.failure()).toContainText("Check your connection and try again. Nothing was changed.");
    await expect(dialog.add()).toHaveText("Try again");
    await expect(dialog.add()).toBeEnabled();
    await expect(dialog.date()).toHaveValue(retry);
    await expect(dialog.name()).toHaveValue("Failed offsite");
    await expect(pages.settings.holidayDate("Failed offsite")).toHaveCount(0);

    await holidaysApi.recoverAdd();
    await dialog.add().click();

    await expect(dialog.dialog()).toBeHidden();
    await expect(pages.settings.holidayDate("Failed offsite")).toBeVisible();
  });
});

/** The Friday a week after `iso`. */
function onOrAfterNextWeek(iso: string): string {
  const date = new Date(`${iso}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + 7);
  return date.toISOString().slice(0, 10);
}
