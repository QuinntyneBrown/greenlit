// Acceptance Test
// Traces to: L2-016 AC3, L2-017 AC2-AC3 (select half), L2-018 (select half), L2-015 AC4-AC6 toasts
// Description: Choosing an action on the selection bar applies that status to the selected days.
// Data: the demo seed, November 2026. Ana's 23-30 Nov is blank and cleared after each test; Ana has
//       confirmed 4-5 Nov. 28-29 Nov is a weekend.

import { test, expect, GRID_ONLY } from "../fixtures/gl-test.js";
import { clearDays, paintDays } from "../fixtures/days.js";


test.skip(({ isMobile }) => isMobile, GRID_ONLY);
const ANA_DAYS = ["2026-11-23", "2026-11-24", "2026-11-25", "2026-11-26", "2026-11-27", "2026-11-30"];

test.describe("Acting on a selection", () => {
  test.beforeEach(async ({ request }) => {
    await clearDays(request, "Ana Ruiz", ANA_DAYS);
  });
  test.afterEach(async ({ request }) => {
    await clearDays(request, "Ana Ruiz", ANA_DAYS);
  });

  test("Tentative marks the selected days, clears the selection and offers Undo (L2-016 AC3)", async ({ goto, pages }) => {
    await goto("calendar", { as: "member", month: "2026-11" });
    await pages.calendar.waitForReady();
    await pages.calendar.select("Ana Ruiz", "Mon 23 Nov", "Wed 25 Nov");

    await pages.calendar.selectionAction("Tentative").click();

    for (const day of ["Mon 23 Nov", "Tue 24 Nov", "Wed 25 Nov"]) {
      await expect(pages.calendar.cell("Ana Ruiz", day)).toHaveAccessibleName(`Ana Ruiz, ${day}: Tentative`);
    }
    await expect(pages.calendar.toast("Marked 3 days tentative")).toBeVisible();
    await expect(pages.calendar.toastAction("Marked 3 days tentative", "Undo")).toBeVisible();
    await expect(pages.calendar.selectionBar()).toHaveCount(0);
    await expect(pages.calendar.selectedCells()).toHaveCount(0);
  });

  test("Request tells a member the manager will be notified (L2-016 AC3, L2-015 AC5)", async ({ goto, pages }) => {
    await goto("calendar", { as: "member", month: "2026-11" });
    await pages.calendar.waitForReady();
    await pages.calendar.select("Ana Ruiz", "Mon 23 Nov", "Wed 25 Nov");

    await pages.calendar.selectionAction("Request").click();

    await expect(pages.calendar.cell("Ana Ruiz", "Tue 24 Nov")).toHaveAttribute("data-status", "requested");
    const toast = pages.calendar.toast("Requested 3 days");
    await expect(toast).toBeVisible();
    await expect(toast).toContainText("Maya Chen will be notified.");
  });

  test("the manager's Confirm turns the days green (L2-016 AC3, L2-015 AC4)", async ({ goto, pages }) => {
    await goto("calendar", { month: "2026-11" });
    await pages.calendar.waitForReady();
    await pages.calendar.select("Ana Ruiz", "Mon 23 Nov", "Wed 25 Nov");

    await pages.calendar.selectionAction("Confirm").click();

    await expect(pages.calendar.cell("Ana Ruiz", "Tue 24 Nov")).toHaveAttribute("data-status", "confirmed");
    const toast = pages.calendar.toast("3 days marked confirmed for Ana");
    await expect(toast).toContainText("They’re green on the calendar now.");
  });

  test("Clear returns the selected days to working days (L2-016 AC3, L2-015 AC6)", async ({ goto, pages, request }) => {
    await paintDays(request, "Ana Ruiz", ["2026-11-23", "2026-11-24"], "Tentative");
    await goto("calendar", { as: "member", month: "2026-11" });
    await pages.calendar.waitForReady();
    await pages.calendar.select("Ana Ruiz", "Mon 23 Nov", "Tue 24 Nov");

    await pages.calendar.selectionAction("Clear").click();

    await expect(pages.calendar.cell("Ana Ruiz", "Mon 23 Nov")).toHaveAccessibleName("Ana Ruiz, Mon 23 Nov: Working");
    await expect(pages.calendar.toast("Cleared 2 days")).toBeVisible();
  });

  test("Undo puts the days back (L2-018 AC1)", async ({ goto, pages }) => {
    await goto("calendar", { as: "member", month: "2026-11" });
    await pages.calendar.waitForReady();
    await pages.calendar.select("Ana Ruiz", "Mon 23 Nov", "Wed 25 Nov");
    await pages.calendar.selectionAction("Tentative").click();
    await expect(pages.calendar.cell("Ana Ruiz", "Tue 24 Nov")).toHaveAttribute("data-status", "tentative");

    await pages.calendar.toastAction("Marked 3 days tentative", "Undo").click();

    await expect(pages.calendar.cell("Ana Ruiz", "Tue 24 Nov")).toHaveAccessibleName("Ana Ruiz, Tue 24 Nov: Working");
  });

  test("while saving, the bar is busy and its actions are off (L2-018)", async ({ goto, pages, sheetApi }) => {
    await goto("calendar", { as: "member", month: "2026-11" });
    await pages.calendar.waitForReady();
    await pages.calendar.select("Ana Ruiz", "Mon 23 Nov", "Wed 25 Nov");
    const release = await sheetApi.holdSaves();

    await pages.calendar.selectionAction("Tentative").click();

    await expect(pages.calendar.selectionBar()).toHaveAttribute("aria-busy", "true");
    await expect(pages.calendar.selectionAction("Tentative")).toBeDisabled();
    await expect(pages.calendar.selectionAction("Request")).toBeDisabled();

    release();
    await expect(pages.calendar.toast("Marked 3 days tentative")).toBeVisible();
    await expect(pages.calendar.selectionBar()).toHaveCount(0);
  });

  test("a failed save keeps the selection and offers Try again (L2-018 AC2)", async ({ goto, pages, sheetApi }) => {
    await goto("calendar", { as: "member", month: "2026-11" });
    await pages.calendar.waitForReady();
    await pages.calendar.select("Ana Ruiz", "Mon 23 Nov", "Wed 25 Nov");
    await sheetApi.failSaves();

    await pages.calendar.selectionAction("Tentative").click();

    const toast = pages.calendar.toast("We couldn’t save those days");
    await expect(toast).toContainText("Your selection is still there.");
    await expect(pages.calendar.cell("Ana Ruiz", "Tue 24 Nov")).toHaveAccessibleName("Ana Ruiz, Tue 24 Nov: Working");
    await expect(pages.calendar.selectedCells()).toHaveCount(3);
    await expect(pages.calendar.selectionAction("Tentative")).toBeEnabled();

    await sheetApi.recoverSaves();
    await pages.calendar.toastAction("We couldn’t save those days", "Try again").click();

    await expect(pages.calendar.cell("Ana Ruiz", "Tue 24 Nov")).toHaveAttribute("data-status", "tentative");
    await expect(pages.calendar.selectionBar()).toHaveCount(0);
  });

  test("a selection of only weekend days changes nothing and says so (L2-017 AC3)", async ({ goto, pages }) => {
    await goto("calendar", { as: "member", month: "2026-11" });
    await pages.calendar.waitForReady();
    await pages.calendar.select("Ana Ruiz", "Sat 28 Nov", "Sun 29 Nov");
    await expect(pages.calendar.selectionMeta()).toHaveText("0 days working");

    await pages.calendar.selectionAction("Tentative").click();

    const toast = pages.calendar.toast("Those are all non-working days");
    await expect(toast).toContainText("Weekends and holidays are red by rule, so nothing changed.");
    await expect(pages.calendar.cell("Ana Ruiz", "Sat 28 Nov")).toHaveAttribute("data-status", "off");
  });

  test("a member cannot change their own confirmed days (L2-017 AC2)", async ({ goto, pages }) => {
    await goto("calendar", { as: "member", month: "2026-11" });
    await pages.calendar.waitForReady();
    await pages.calendar.select("Ana Ruiz", "Wed 4 Nov", "Thu 5 Nov");

    await pages.calendar.selectionAction("Tentative").click();

    const toast = pages.calendar.toast("Confirmed days can only be changed by Maya");
    await expect(toast).toContainText("Ask Maya Chen if one of these needs to move.");
    await expect(pages.calendar.cell("Ana Ruiz", "Wed 4 Nov")).toHaveAttribute("data-status", "confirmed");
  });
});
