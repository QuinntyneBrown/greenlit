// Acceptance Test
// Traces to: L2-040 (AC1 to AC4), L2-014 (AC3)
// Description: The manager sets a part-timer's working days from Settings; their off days turn red on their row only.
// Data: each viewport's inviter (Uma, Vic, Wren) manages a team of their own with Dev Patel and Ana Ruiz, made
//       through the API; every test puts Dev back on the team's work week when it is done, so the demo team
//       and the other specs never see it.

import { test, expect, GRID_ONLY } from "../fixtures/gl-test.js";
import { februaryFriday } from "../fixtures/dates.js";
import { PEOPLE, inviterFor } from "../fixtures/session.js";
import { ensureMember, ensureOwnTeam } from "../fixtures/team.js";
import { MON_TO_FRI, MON_TO_THU, setMemberDays } from "../fixtures/working-days.js";

test.describe("A member's working days", () => {
  test.beforeEach(async ({ goto, pages, request }, testInfo) => {
    const manager = inviterFor(testInfo.project.name);
    await ensureOwnTeam(request, manager, "Holiday team");
    await ensureMember(request, manager, "Ana Ruiz");
    await ensureMember(request, manager, "Dev Patel");
    await setMemberDays(request, manager, "Dev Patel", MON_TO_THU);
    await goto("settings", { as: manager });
    await pages.settings.waitForReady();
  });

  test.afterEach(async ({ request }, testInfo) => {
    await setMemberDays(request, inviterFor(testInfo.project.name), "Dev Patel", MON_TO_FRI);
  });

  test("Edit working days opens Dev’s days with the copy of the mock (L2-040 AC1)", async ({ pages }) => {
    await pages.settings.editWorkingDaysButton("Dev Patel").click();

    const dialog = pages.editWorkingDays;
    await expect(dialog.dialog("Dev")).toBeVisible();
    await expect(dialog.title()).toHaveText("Dev’s working days");
    await expect(dialog.description()).toHaveText("For part-timers. Dev currently works Mon, Tue, Wed, Thu.");
    await expect(dialog.days()).toHaveText(["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]);
    for (const [i, pressed] of ["true", "true", "true", "true", "false", "false", "false"].entries())
      await expect(dialog.days().nth(i)).toHaveAttribute("aria-pressed", pressed);
    await expect(dialog.help()).toHaveText("Days they don’t work show red on their row and never count against allowance.");
    await expect(dialog.cancel()).toBeVisible();
    await expect(dialog.save()).toHaveText("Save working days");
  });

  test("Esc closes the dialog and focus returns to the button (keyboard)", async ({ page, pages }) => {
    await pages.settings.editWorkingDaysButton("Dev Patel").focus();
    await page.keyboard.press("Enter");
    await expect(pages.editWorkingDays.anyDialog()).toBeVisible();

    await page.keyboard.press("Escape");

    await expect(pages.editWorkingDays.anyDialog()).toBeHidden();
    await expect(pages.settings.editWorkingDaysButton("Dev Patel")).toBeFocused();
  });

  test("saving with every day off names the problem and sends nothing (L2-040 AC2)", async ({ pages, workingDaysApi }) => {
    await pages.settings.editWorkingDaysButton("Dev Patel").click();
    const dialog = pages.editWorkingDays;
    for (const day of ["Mon", "Tue", "Wed", "Thu"]) await dialog.day(day).click();

    await dialog.save().click();

    await expect(dialog.summary()).toContainText("Fix 1 thing to continue");
    await expect(dialog.summaryLinks()).toHaveText(["Pick at least one working day"]);
    await expect(dialog.daysError()).toHaveText("Pick at least one working day.");
    expect(workingDaysApi.memberSaves()).toBe(0);

    await dialog.day("Tue").click();
    await expect(dialog.summary()).toBeHidden();
    await expect(dialog.save()).toBeEnabled();
  });

  test("saving shows Saving… with the days frozen, then Dev’s Fridays are red on Dev’s row only (L2-040 AC3, L2-014 AC3)", async ({
    goto,
    pages,
    request,
    workingDaysApi,
    isMobile,
  }, testInfo) => {
    test.skip(isMobile, GRID_ONLY);
    const manager = inviterFor(testInfo.project.name);
    const friday = februaryFriday();
    await setMemberDays(request, manager, "Dev Patel", MON_TO_FRI);
    await goto("calendar", { as: manager, month: friday.month });
    await pages.calendar.waitForReady();
    const before = await (await pages.calendar.outCell(friday.label)).getAttribute("aria-label");
    const peopleIn = Number(/^0 out, (\d+) in$/.exec(before ?? "")?.[1]);
    await expect(pages.calendar.cell("Dev Patel", friday.label)).not.toHaveAttribute("aria-label", /Not working$/);

    await goto("settings", { as: manager });
    await pages.settings.waitForReady();
    const release = await workingDaysApi.holdMember();
    await pages.settings.editWorkingDaysButton("Dev Patel").click();
    const dialog = pages.editWorkingDays;
    await dialog.day("Fri").click();

    await dialog.save().click();

    await expect(dialog.save()).toHaveText("Saving…");
    await expect(dialog.save()).toHaveAttribute("aria-busy", "true");
    await expect(dialog.cancel()).toBeDisabled();
    await expect(dialog.day("Mon")).toBeDisabled();
    release();
    await expect(dialog.anyDialog()).toBeHidden();
    expect(workingDaysApi.memberSaves()).toBe(1);

    await goto("calendar", { as: manager, month: friday.month });
    await pages.calendar.waitForReady();
    await expect(pages.calendar.cell("Dev Patel", friday.label)).toHaveAttribute("aria-label", /Not working$/);
    await expect(pages.calendar.cell("Ana Ruiz", friday.label)).not.toHaveAttribute("aria-label", /Not working$/);
    await expect(pages.calendar.cell(PEOPLE[manager].name, friday.label)).not.toHaveAttribute("aria-label", /Not working$/);
    await expect(await pages.calendar.outCell(friday.label)).toHaveAccessibleName(`0 out, ${peopleIn - 1} in`);
  });

  test("a failed save keeps the days as entered and Try again saves them (L2-040 AC4)", async ({ pages, workingDaysApi }) => {
    await workingDaysApi.failMember();
    await pages.settings.editWorkingDaysButton("Dev Patel").click();
    const dialog = pages.editWorkingDays;
    await dialog.day("Wed").click();

    await dialog.save().click();

    await expect(dialog.failure()).toContainText("We couldn’t save the working days");
    await expect(dialog.failure()).toContainText("Check your connection and try again. Nothing was changed.");
    await expect(dialog.day("Wed")).toHaveAttribute("aria-pressed", "false");
    await expect(dialog.save()).toHaveText("Try again");

    await workingDaysApi.recoverMember();
    await dialog.save().click();
    await expect(dialog.anyDialog()).toBeHidden();
  });
});
