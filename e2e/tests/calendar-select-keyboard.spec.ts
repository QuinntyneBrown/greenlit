// Acceptance Test
// Traces to: L2-047 AC1, L2-016 AC1-AC3 (from the keyboard), L2-017 AC1
// Description: With the keyboard alone a person selects days (Enter then arrows, or Shift+arrows), reaches the
//              selection bar with Tab and acts on the selection.
// Data: the demo seed, November 2026. Ana's 23-30 Nov is blank and cleared after each test.

import { test, expect, GRID_ONLY } from "../fixtures/gl-test.js";
import { clearDays } from "../fixtures/days.js";


test.skip(({ isMobile }) => isMobile, GRID_ONLY);
const ANA_DAYS = ["2026-11-23", "2026-11-24", "2026-11-25", "2026-11-26", "2026-11-27", "2026-11-30"];

test.describe("Selecting days from the keyboard", () => {
  test.beforeEach(async ({ request }) => {
    await clearDays(request, "Ana Ruiz", ANA_DAYS);
  });
  test.afterEach(async ({ request }) => {
    await clearDays(request, "Ana Ruiz", ANA_DAYS);
  });

  test("Enter starts a selection and the arrow keys extend it (L2-047 AC1)", async ({ goto, pages }) => {
    await goto("calendar", { as: "member", month: "2026-11" });
    await pages.calendar.waitForReady();
    await pages.calendar.focusCell("Ana Ruiz", "Mon 23 Nov");

    await pages.calendar.press("Enter");
    await expect(pages.calendar.selectedCells()).toHaveCount(1);
    await pages.calendar.press("ArrowRight");
    await pages.calendar.press("ArrowRight");

    await expect(pages.calendar.selectedCells()).toHaveCount(3);
    await expect(pages.calendar.selectionTitle()).toHaveText("Ana Ruiz · 23–25 Nov");
    await expect(pages.calendar.selectionMeta()).toHaveText("3 days working");
    await expect(pages.calendar.focusedCell()).toHaveAccessibleName("Ana Ruiz, Wed 25 Nov: Working");
  });

  test("the arrow keys shrink the selection back toward where it began", async ({ goto, pages }) => {
    await goto("calendar", { as: "member", month: "2026-11" });
    await pages.calendar.waitForReady();
    await pages.calendar.focusCell("Ana Ruiz", "Mon 23 Nov");
    await pages.calendar.press("Enter");
    await pages.calendar.press("ArrowRight");
    await pages.calendar.press("ArrowRight");

    await pages.calendar.press("ArrowLeft");

    await expect(pages.calendar.selectionTitle()).toHaveText("Ana Ruiz · 23–24 Nov");
  });

  test("Enter again ends the extending and the arrows move focus alone", async ({ goto, pages }) => {
    await goto("calendar", { as: "member", month: "2026-11" });
    await pages.calendar.waitForReady();
    await pages.calendar.focusCell("Ana Ruiz", "Mon 23 Nov");
    await pages.calendar.press("Enter");
    await pages.calendar.press("ArrowRight");

    await pages.calendar.press("Enter");
    await pages.calendar.press("ArrowRight");

    await expect(pages.calendar.selectionTitle()).toHaveText("Ana Ruiz · 23–24 Nov");
    await expect(pages.calendar.focusedCell()).toHaveAccessibleName("Ana Ruiz, Wed 25 Nov: Working");
  });

  test("Shift+arrow extends a selection without Enter (L2-047 AC1)", async ({ goto, pages }) => {
    await goto("calendar", { as: "member", month: "2026-11" });
    await pages.calendar.waitForReady();
    await pages.calendar.focusCell("Ana Ruiz", "Tue 24 Nov");

    await pages.calendar.press("Shift+ArrowRight");
    await pages.calendar.press("Shift+ArrowRight");

    await expect(pages.calendar.selectionTitle()).toHaveText("Ana Ruiz · 24–26 Nov");
    await pages.calendar.press("Shift+ArrowLeft");
    await expect(pages.calendar.selectionTitle()).toHaveText("Ana Ruiz · 24–25 Nov");
  });

  test("a selection can run backwards from where it began", async ({ goto, pages }) => {
    await goto("calendar", { as: "member", month: "2026-11" });
    await pages.calendar.waitForReady();
    await pages.calendar.focusCell("Ana Ruiz", "Wed 25 Nov");

    await pages.calendar.press("Enter");
    await pages.calendar.press("ArrowLeft");
    await pages.calendar.press("ArrowLeft");

    await expect(pages.calendar.selectionTitle()).toHaveText("Ana Ruiz · 23–25 Nov");
  });

  test("Enter on another member's cell selects nothing (L2-017 AC1)", async ({ goto, pages }) => {
    await goto("calendar", { as: "member", month: "2026-11" });
    await pages.calendar.waitForReady();
    await pages.calendar.focusCell("Ben Okafor", "Mon 23 Nov");

    await pages.calendar.press("Enter");
    await pages.calendar.press("ArrowRight");

    await expect(pages.calendar.selectedCells()).toHaveCount(0);
    await expect(pages.calendar.selectionBar()).toHaveCount(0);
  });

  test("Tab reaches the bar, whose buttons are one tab stop moved with the arrow keys", async ({ goto, pages }) => {
    await goto("calendar", { as: "member", month: "2026-11" });
    await pages.calendar.waitForReady();
    await pages.calendar.focusCell("Ana Ruiz", "Mon 23 Nov");
    await pages.calendar.press("Enter");
    await pages.calendar.press("ArrowRight");

    await pages.calendar.press("Tab");
    await expect(pages.calendar.focusedAction()).toHaveText("Request");
    await pages.calendar.press("ArrowRight");
    await expect(pages.calendar.focusedAction()).toHaveText("Tentative");
    await pages.calendar.press("End");
    await expect(pages.calendar.focusedAction()).toHaveAccessibleName("Clear selection");
    await pages.calendar.press("ArrowRight");
    await expect(pages.calendar.focusedAction()).toHaveText("Request");
    await pages.calendar.press("Home");
    await expect(pages.calendar.focusedAction()).toHaveText("Request");
  });

  test("with the keyboard alone a member selects 23-25 Nov and marks it tentative", async ({ goto, pages }) => {
    await goto("calendar", { as: "member", month: "2026-11" });
    await pages.calendar.waitForReady();
    await pages.calendar.keyboardTo("Ana Ruiz", "Mon 23 Nov");

    await pages.calendar.press("Enter");
    await pages.calendar.press("ArrowRight");
    await pages.calendar.press("ArrowRight");
    await pages.calendar.press("Tab");
    await pages.calendar.press("ArrowRight");
    await expect(pages.calendar.focusedAction()).toHaveText("Tentative");
    await pages.calendar.press("Enter");

    for (const day of ["Mon 23 Nov", "Tue 24 Nov", "Wed 25 Nov"]) {
      await expect(pages.calendar.cell("Ana Ruiz", day)).toHaveAttribute("data-status", "tentative");
    }
    await expect(pages.calendar.toast("Marked 3 days tentative")).toBeVisible();
    await expect(pages.calendar.selectionBar()).toHaveCount(0);
    // Focus is back on the sheet, so the person can carry on.
    await expect(pages.calendar.focusedCell()).toHaveCount(1);
  });

  test("the manager's keyboard path offers Confirm first (L2-016 AC1)", async ({ goto, pages }) => {
    await goto("calendar", { month: "2026-11" });
    await pages.calendar.waitForReady();
    await pages.calendar.focusCell("Ana Ruiz", "Mon 23 Nov");
    await pages.calendar.press("Shift+ArrowRight");
    // Tab only reaches the bar once it has rendered, so wait for the selection it belongs to.
    await expect(pages.calendar.selectedCells()).toHaveCount(2);

    await pages.calendar.press("Tab");
    await expect(pages.calendar.focusedAction()).toHaveText("Confirm");
    await pages.calendar.press("Enter");

    await expect(pages.calendar.cell("Ana Ruiz", "Mon 23 Nov")).toHaveAttribute("data-status", "confirmed");
    await expect(pages.calendar.cell("Ana Ruiz", "Tue 24 Nov")).toHaveAttribute("data-status", "confirmed");
  });
});
