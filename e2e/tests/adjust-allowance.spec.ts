// Acceptance Test
// Traces to: L2-028 (AC1 to AC4), L2-029 AC1 and AC4, L2-034 AC1 and AC2
// Description: The manager adds or removes days from a member's allowance on their page with a required reason; the
//              adjustment is listed there and days left change on the calendar, the year table and the page.
// Data: each viewport's inviter (Uma, Vic, Wren) manages a team of their own with Ben Okafor, made through the API.
//       Adjustments cannot be taken back, so every test reads days left before it acts and expects the change.

import { test, expect } from "../fixtures/gl-test.js";
import { inviterFor } from "../fixtures/session.js";
import { ensureMember, ensureOwnTeam } from "../fixtures/team.js";

test.describe("Adjusting a member's allowance", () => {
  test.beforeEach(async ({ goto, pages, request }, testInfo) => {
    const manager = inviterFor(testInfo.project.name);
    await ensureOwnTeam(request, manager, "Holiday team");
    await ensureMember(request, manager, "Ben Okafor");
    await goto("person", { as: manager, person: "Ben Okafor" });
    await pages.person.waitForReady();
  });

  test("Adjust allowance opens Ben’s dialog with the copy of the mock (L2-028 AC1)", async ({ pages }) => {
    await expect(pages.person.adjustAllowanceSection().getByText("Carry-over, extra days or corrections. Use a negative number to remove days.")).toBeVisible();

    await pages.person.adjustAllowance().click();

    const dialog = pages.adjustAllowance;
    await expect(dialog.dialog("Ben")).toBeVisible();
    await expect(dialog.title()).toHaveText("Adjust Ben’s allowance");
    await expect(dialog.description()).toHaveText("Carry-over, extra days or corrections.");
    await expect(dialog.days()).toHaveAttribute("placeholder", "+2");
    await expect(dialog.days()).toBeFocused();
    await expect(dialog.daysHelp()).toHaveText("Use a negative number to remove days.");
    await expect(dialog.reason()).toHaveAttribute("placeholder", "e.g. Carried over from 2025");
    await expect(dialog.cancel()).toBeVisible();
    await expect(dialog.add()).toHaveText("Add adjustment");
  });

  test("Esc closes the dialog and focus returns to the button (keyboard)", async ({ page, pages }) => {
    await pages.person.adjustAllowance().focus();
    await page.keyboard.press("Enter");
    await expect(pages.adjustAllowance.anyDialog()).toBeVisible();

    await page.keyboard.press("Escape");

    await expect(pages.adjustAllowance.anyDialog()).toBeHidden();
    await expect(pages.person.adjustAllowance()).toBeFocused();
  });

  test("zero days and no reason name both problems and send nothing (L2-028 AC2)", async ({ pages, adjustmentsApi }) => {
    await pages.person.adjustAllowance().click();
    const dialog = pages.adjustAllowance;
    await dialog.days().fill("0");

    await dialog.add().click();

    await expect(dialog.summary()).toContainText("Fix 2 things to continue");
    await expect(dialog.summaryLinks()).toHaveText(["Enter a number other than 0", "Give a reason"]);
    await expect(dialog.fieldErrors()).toHaveText(["Enter a number other than 0.", "Give a reason so the history makes sense later."]);
    expect(adjustmentsApi.adds()).toBe(0);

    await dialog.days().fill("2");
    await dialog.reason().fill("Long service");
    await expect(dialog.summary()).toBeHidden();
    await expect(dialog.add()).toBeEnabled();
  });

  test("adding +2 with the reason Long service shows Adding…, lists it and raises days left everywhere (L2-028 AC3, L2-029 AC1, AC4)", async ({
    goto,
    pages,
    adjustmentsApi,
  }, testInfo) => {
    const manager = inviterFor(testInfo.project.name);
    const before = Number(await pages.person.daysLeft().innerText());
    const rowsBefore = await pages.person.rows("Allowance adjustments").count();
    const release = await adjustmentsApi.hold();
    await pages.person.adjustAllowance().click();
    const dialog = pages.adjustAllowance;
    await dialog.days().fill("2");
    await dialog.reason().fill("Long service");

    await dialog.add().click();

    await expect(dialog.add()).toHaveText("Adding…");
    await expect(dialog.add()).toHaveAttribute("aria-busy", "true");
    await expect(dialog.cancel()).toBeDisabled();
    await expect(dialog.days()).toHaveAttribute("readonly", "");
    await expect(dialog.reason()).toHaveAttribute("readonly", "");
    release();
    await expect(dialog.anyDialog()).toBeHidden();
    expect(adjustmentsApi.adds()).toBe(1);

    await expect(pages.person.daysLeft()).toHaveText(String(before + 2));
    await expect(pages.person.rows("Allowance adjustments")).toHaveCount(rowsBefore + 1);
    await expect(pages.person.rows("Allowance adjustments").filter({ hasText: "Long service" }).last()).toHaveText(/^\+2Long service\d{1,2} \w{3} 2026$/);

    await goto("calendar", { as: manager });
    await pages.calendar.waitForReady();
    await expect(pages.calendar.daysLeft("Ben Okafor")).toHaveText(String(before + 2));

    await goto("year", { as: manager });
    await pages.year.waitForReady();
    await expect(pages.year.figures("Ben Okafor").last()).toHaveText(String(before + 2));
  });

  test("a negative number removes days (L2-028 AC3)", async ({ pages }) => {
    const before = Number(await pages.person.daysLeft().innerText());
    await pages.person.adjustAllowance().click();
    await pages.adjustAllowance.days().fill("-1");
    await pages.adjustAllowance.reason().fill("Unpaid day");

    await pages.adjustAllowance.add().click();

    await expect(pages.adjustAllowance.anyDialog()).toBeHidden();
    await expect(pages.person.daysLeft()).toHaveText(String(before - 1));
    await expect(pages.person.rows("Allowance adjustments").filter({ hasText: "Unpaid day" }).last()).toHaveText(/^-1Unpaid day/);
  });

  test("a failed save keeps the values, says the allowance is unchanged, and Try again saves (L2-028 AC4)", async ({ pages, adjustmentsApi }) => {
    const before = Number(await pages.person.daysLeft().innerText());
    await adjustmentsApi.fail();
    await pages.person.adjustAllowance().click();
    const dialog = pages.adjustAllowance;
    await dialog.days().fill("2");
    await dialog.reason().fill("Extra day for covering the launch");

    await dialog.add().click();

    await expect(dialog.failure()).toContainText("We couldn’t save the adjustment");
    await expect(dialog.failure()).toContainText("Check your connection and try again. Ben’s allowance is unchanged.");
    await expect(dialog.days()).toHaveValue("2");
    await expect(dialog.reason()).toHaveValue("Extra day for covering the launch");
    await expect(dialog.add()).toHaveText("Try again");
    await expect(pages.person.daysLeft()).toHaveText(String(before));

    await adjustmentsApi.recover();
    await dialog.add().click();
    await expect(dialog.anyDialog()).toBeHidden();
    await expect(pages.person.daysLeft()).toHaveText(String(before + 2));
  });
});

test.describe("A member's own page", () => {
  test("offers no Adjust allowance (L2-034 AC2)", async ({ goto, pages }) => {
    await goto("memberPerson", { as: "member", person: "Ana Ruiz" });
    await pages.person.waitForReady();

    await expect(pages.person.adjustAllowanceSection()).toHaveCount(0);
    await expect(pages.person.adjustAllowance()).toHaveCount(0);
  });
});
