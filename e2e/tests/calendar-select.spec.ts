// Acceptance Test
// Traces to: L2-016 AC1-AC2, L2-017 AC1 and AC5 (select half)
// Description: In Select mode a click or drag selects a range on one row and the selection bar names it.
// Data: the demo seed, November 2026 (1 Nov is a Sunday). Nothing is changed by selecting.

import { test, expect, GRID_ONLY } from "../fixtures/gl-test.js";


test.skip(({ isMobile }) => isMobile, GRID_ONLY);
test.describe("Selecting days", () => {
  test("a drag selects the cells and the bar names the member, range and working days (L2-016 AC1)", async ({ goto, pages }) => {
    await goto("calendar", { as: "member", month: "2026-11" });
    await pages.calendar.waitForReady();

    await pages.calendar.select("Ana Ruiz", "Mon 23 Nov", "Wed 25 Nov");

    await expect(pages.calendar.selectedCells()).toHaveCount(3);
    await expect(pages.calendar.cell("Ana Ruiz", "Tue 24 Nov")).toHaveAttribute("aria-pressed", "true");
    await expect(pages.calendar.cell("Ana Ruiz", "Thu 26 Nov")).toHaveAttribute("aria-pressed", "false");
    await expect(pages.calendar.selectionBar()).toBeVisible();
    await expect(pages.calendar.selectionTitle()).toHaveText("Ana Ruiz · 23–25 Nov");
    await expect(pages.calendar.selectionMeta()).toHaveText("3 days working");
  });

  test("a member's bar offers Request, Tentative, Clear and Clear selection, not Confirm (L2-016 AC1-AC2)", async ({ goto, pages }) => {
    await goto("calendar", { as: "member", month: "2026-11" });
    await pages.calendar.waitForReady();

    await pages.calendar.select("Ana Ruiz", "Mon 23 Nov", "Wed 25 Nov");

    await expect(pages.calendar.selectionActions()).toHaveText(["Request", "Tentative", "Clear", ""]);
    await expect(pages.calendar.selectionAction("Clear selection")).toBeVisible();
    await expect(pages.calendar.selectionAction("Confirm")).toHaveCount(0);
  });

  test("the manager's bar also offers Confirm, on any row (L2-016 AC1, L2-017 AC5)", async ({ goto, pages }) => {
    await goto("calendar", { month: "2026-11" });
    await pages.calendar.waitForReady();

    await pages.calendar.select("Ben Okafor", "Mon 23 Nov", "Wed 25 Nov");

    await expect(pages.calendar.selectionTitle()).toHaveText("Ben Okafor · 23–25 Nov");
    await expect(pages.calendar.selectionActions()).toHaveText(["Confirm", "Request", "Tentative", "Clear", ""]);
  });

  test("a click selects one day and a second click on it unselects it", async ({ goto, pages }) => {
    await goto("calendar", { as: "member", month: "2026-11" });
    await pages.calendar.waitForReady();

    await pages.calendar.select("Ana Ruiz", "Mon 23 Nov");
    await expect(pages.calendar.selectionTitle()).toHaveText("Ana Ruiz · 23 Nov");
    await expect(pages.calendar.selectionMeta()).toHaveText("1 day working");

    await pages.calendar.select("Ana Ruiz", "Mon 23 Nov");
    await expect(pages.calendar.selectionBar()).toHaveCount(0);
    await expect(pages.calendar.selectedCells()).toHaveCount(0);
  });

  test("a range across a weekend counts only its working days", async ({ goto, pages }) => {
    await goto("calendar", { as: "member", month: "2026-11" });
    await pages.calendar.waitForReady();

    await pages.calendar.select("Ana Ruiz", "Fri 27 Nov", "Mon 30 Nov");

    await expect(pages.calendar.selectionTitle()).toHaveText("Ana Ruiz · 27–30 Nov");
    await expect(pages.calendar.selectionMeta()).toHaveText("2 days working");
  });

  test("a member cannot select another member's row (L2-017 AC1)", async ({ goto, pages }) => {
    await goto("calendar", { as: "member", month: "2026-11" });
    await pages.calendar.waitForReady();

    await pages.calendar.select("Ben Okafor", "Mon 23 Nov", "Wed 25 Nov");

    await expect(pages.calendar.selectedCells()).toHaveCount(0);
    await expect(pages.calendar.selectionBar()).toHaveCount(0);
  });
});
