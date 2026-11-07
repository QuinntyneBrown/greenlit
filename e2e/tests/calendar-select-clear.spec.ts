// Acceptance Test
// Traces to: L2-016 AC4, L2-047 AC2, L2-047 (announcement)
// Description: Escape and "Clear selection" clear a selection; the selection is announced.
// Data: the demo seed, November 2026. Nothing is changed by selecting.

import { test, expect } from "../fixtures/gl-test.js";

test.describe("Clearing a selection", () => {
  test.beforeEach(async ({ goto, pages }) => {
    await goto("calendar", { as: "member", month: "2026-11" });
    await pages.calendar.waitForReady();
  });

  test("Clear selection clears it and says so (L2-016 AC4)", async ({ pages }) => {
    await pages.calendar.select("Ana Ruiz", "Mon 23 Nov", "Wed 25 Nov");

    await pages.calendar.selectionAction("Clear selection").click();

    await expect(pages.calendar.selectedCells()).toHaveCount(0);
    await expect(pages.calendar.selectionBar()).toHaveCount(0);
    const toast = pages.calendar.toast("Selection cleared");
    await expect(toast).toBeVisible();
    await expect(toast).toContainText("Pick days to start again.");
  });

  test("Escape clears it, says so and keeps focus on the sheet (L2-016 AC4, L2-047 AC2)", async ({ pages }) => {
    await pages.calendar.select("Ana Ruiz", "Mon 23 Nov", "Wed 25 Nov");

    await pages.calendar.press("Escape");

    await expect(pages.calendar.selectedCells()).toHaveCount(0);
    await expect(pages.calendar.selectionBar()).toHaveCount(0);
    await expect(pages.calendar.toast("Selection cleared")).toContainText("Pick days to start again.");
    await expect(pages.calendar.focusedCell()).toHaveCount(1);
  });

  test("Escape with nothing selected does nothing", async ({ pages }) => {
    await pages.calendar.focusCell("Ana Ruiz", "Mon 23 Nov");

    await pages.calendar.press("Escape");

    await expect(pages.calendar.toasts()).toHaveCount(0);
  });

  test("choosing a paint colour drops the selection without a toast", async ({ pages }) => {
    await pages.calendar.select("Ana Ruiz", "Mon 23 Nov", "Wed 25 Nov");

    await pages.calendar.choosePaint("Tentative");

    await expect(pages.calendar.selectedCells()).toHaveCount(0);
    await expect(pages.calendar.selectionBar()).toHaveCount(0);
    await expect(pages.calendar.toasts()).toHaveCount(0);
  });

  test("the selection is announced politely and the announcement goes when it clears", async ({ pages }) => {
    await pages.calendar.select("Ana Ruiz", "Mon 23 Nov", "Wed 25 Nov");
    await expect(pages.calendar.selectionAnnouncement()).toHaveText("3 days selected");

    await pages.calendar.selectionAction("Clear selection").click();

    await expect(pages.calendar.selectionAnnouncement()).toHaveText("");
  });
});
