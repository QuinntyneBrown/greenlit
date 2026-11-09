// Acceptance Test
// Traces to: L2-038 (AC1 to AC4)
// Description: The manager removes a team holiday from Settings, confirms, and can Undo.
// Data: each viewport's inviter (Uma, Vic, Wren) manages a team of their own, made through the API with the
//       United Kingdom calendar. Each test first makes a day off of its own in a month of the viewport's
//       (fixtures/dates.ts), so removing one never touches the calendar's holidays or the demo team, and a
//       second run on the same database passes too.

import { APIRequestContext } from "@playwright/test";
import { test, expect, GRID_ONLY } from "../fixtures/gl-test.js";
import { wednesdayFor } from "../fixtures/dates.js";
import { ensureDayOff } from "../fixtures/holidays.js";
import { SettingsPage } from "../pages/settings.page.js";
import { PEOPLE, Person, inviterFor } from "../fixtures/session.js";
import { ensureMember, ensureOwnTeam } from "../fixtures/team.js";

const SLOT = { dialog: 0, confirm: 1, undo: 2, failure: 3 } as const;

test.describe("Removing a holiday", () => {
  interface Fixtures {
    goto: (key: "settings", options: { as: Person }) => Promise<void>;
    pages: { settings: SettingsPage };
    request: APIRequestContext;
  }

  /** Opens Settings as the viewport's manager, on a team with a teammate and a day off of this test's own. */
  async function openSettings({ goto, pages, request }: Fixtures, project: string, slot: number, name: string) {
    const manager = inviterFor(project);
    await ensureOwnTeam(request, manager, "Holiday team");
    await ensureMember(request, manager, "Teammate Holiday");
    const day = wednesdayFor(project, slot);
    await ensureDayOff(request, manager, day, name);
    await goto("settings", { as: manager });
    await pages.settings.waitForReady();
    await pages.settings.waitForHolidays();
    return day;
  }

  test("Remove opens a confirmation that says what changes, and Keep it changes nothing (L2-038 AC1)", async ({ goto, pages, request }, testInfo) => {
    const day = await openSettings({ goto, pages, request }, testInfo.project.name, SLOT.dialog, "Dialog day");

    await pages.settings.removeHolidayButton("Dialog day").click();

    const dialog = pages.removeHoliday;
    await expect(dialog.dialog()).toBeVisible();
    await expect(dialog.title()).toHaveText("Remove Dialog day?");
    await expect(dialog.description()).toHaveText(`${day.label} becomes a working day again for the whole team.`);
    await expect(dialog.body()).toHaveText("It will count against allowances again for anyone who books it.");
    await expect(dialog.keep()).toBeVisible();
    await expect(dialog.remove()).toHaveText("Remove holiday");

    await dialog.keep().click();

    await expect(dialog.dialog()).toBeHidden();
    await expect(pages.settings.holidayDate("Dialog day")).toHaveText(day.label);
    await expect(pages.settings.removeHolidayButton("Dialog day")).toBeFocused();
  });

  test("confirming shows Removing…, then the date is a working day and the toast offers Undo (L2-038 AC2)", async ({
    goto,
    holidaysApi,
    pages,
    request,
    isMobile,
  }, testInfo) => {
    test.skip(isMobile, GRID_ONLY);
    const project = testInfo.project.name;
    const day = await openSettings({ goto, pages, request }, project, SLOT.confirm, "Confirm day");
    await pages.settings.removeHolidayButton("Confirm day").click();
    const dialog = pages.removeHoliday;
    const release = await holidaysApi.holdRemove();

    await dialog.remove().click();

    await expect(dialog.remove()).toHaveText("Removing…");
    await expect(dialog.remove()).toHaveAttribute("aria-busy", "true");
    await expect(dialog.remove()).toBeDisabled();
    await expect(dialog.keep()).toBeDisabled();
    release();

    await expect(dialog.dialog()).toBeHidden();
    await expect(pages.settings.holidayDate("Confirm day")).toHaveCount(0);
    await expect(pages.settings.toast("Removed Confirm day")).toBeVisible();
    await expect(pages.settings.toastText("Removed Confirm day")).toHaveText(`${day.label} is a working day again.`);
    await expect(pages.settings.toastAction("Removed Confirm day", "Undo")).toBeVisible();

    await goto("calendar", { as: inviterFor(project), month: day.month });
    await pages.calendar.waitForReady();
    for (const member of [PEOPLE[inviterFor(project)].name, "Teammate Holiday"]) {
      const cell = pages.calendar.cell(member, day.label);
      await expect(cell).toHaveAccessibleName(`${member}, ${day.label}: Working`);
    }
  });

  test("Undo restores the holiday with its name and date (L2-038 AC3)", async ({ goto, pages, request }, testInfo) => {
    const day = await openSettings({ goto, pages, request }, testInfo.project.name, SLOT.undo, "Undo day");
    await pages.settings.removeHolidayButton("Undo day").click();
    await pages.removeHoliday.remove().click();
    await expect(pages.settings.holidayDate("Undo day")).toHaveCount(0);

    await pages.settings.toastAction("Removed Undo day", "Undo").click();

    await expect(pages.settings.holidayDate("Undo day")).toHaveText(day.label);
    await expect(pages.settings.toast("Removed Undo day")).toBeHidden();
  });

  test("a failed Undo says so and Try again restores the holiday", async ({ goto, holidaysApi, pages, request }, testInfo) => {
    await openSettings({ goto, pages, request }, testInfo.project.name, SLOT.undo, "Undo day");
    await pages.settings.removeHolidayButton("Undo day").click();
    await pages.removeHoliday.remove().click();
    await expect(pages.settings.holidayDate("Undo day")).toHaveCount(0);
    await holidaysApi.failRestore();

    await pages.settings.toastAction("Removed Undo day", "Undo").click();

    await expect(pages.settings.toast("We couldn’t undo that")).toBeVisible();
    await expect(pages.settings.toastText("We couldn’t undo that")).toHaveText(
      "Undo day is still removed. Check your connection and try again.",
    );
    await expect(pages.settings.holidayDate("Undo day")).toHaveCount(0);
    await holidaysApi.recoverRestore();

    await pages.settings.toastAction("We couldn’t undo that", "Try again").click();

    await expect(pages.settings.holidayDate("Undo day")).toBeVisible();
  });

  test("a failed removal keeps the holiday and Remove holiday tries again (L2-038 AC4)", async ({
    goto,
    holidaysApi,
    pages,
    request,
  }, testInfo) => {
    await openSettings({ goto, pages, request }, testInfo.project.name, SLOT.failure, "Failure day");
    await pages.settings.removeHolidayButton("Failure day").click();
    const dialog = pages.removeHoliday;
    await holidaysApi.failRemove();

    await dialog.remove().click();

    await expect(dialog.failure()).toContainText("We couldn’t remove the holiday");
    await expect(dialog.failure()).toContainText("Check your connection and try again. Nothing was changed.");
    await expect(dialog.remove()).toHaveText("Remove holiday");
    await expect(dialog.remove()).toBeEnabled();
    await expect(dialog.keep()).toBeEnabled();

    await dialog.keep().click();
    await expect(pages.settings.holidayDate("Failure day")).toBeVisible();

    await holidaysApi.recoverRemove();
    await pages.settings.removeHolidayButton("Failure day").click();
    await dialog.remove().click();

    await expect(dialog.dialog()).toBeHidden();
    await expect(pages.settings.holidayDate("Failure day")).toHaveCount(0);
  });
});
