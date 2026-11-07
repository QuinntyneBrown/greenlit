// Acceptance Test
// Traces to: L2-045
// Description: The banner that reports the connection and the read-only calendar while offline.
// Data: the demo seed, November 2026. Nothing is saved, so no data is changed.

import { test, expect } from "../fixtures/gl-test.js";

test.describe("Connection banners", () => {
  test("going offline shows a banner with no dismiss button and makes the calendar read-only (L2-045 AC1)", async ({
    goto,
    pages,
  }) => {
    await goto("calendar", { as: "member", month: "2026-11" });
    await pages.calendar.waitForReady();
    await expect(pages.connection.banner()).toHaveCount(0);

    await pages.connection.goOffline();

    await expect(pages.connection.title()).toHaveText("You’re offline");
    await expect(pages.connection.text()).toHaveText(
      "You can look at the calendar, but changes can’t be saved until you’re back.",
    );
    await expect(pages.connection.dismissButton()).toHaveCount(0);
    // Still readable.
    await expect(pages.calendar.cell("Ana Ruiz", "Mon 23 Nov")).toBeVisible();
    // Painting is off: every way to choose a paint colour is disabled.
    await expect(pages.calendar.paintOptions().first()).toBeDisabled();
    await expect(pages.calendar.paintOption("Tentative")).toBeDisabled();
    await expect(pages.calendar.paintOption("Clear")).toBeDisabled();
  });

  test("selecting days does nothing while offline (L2-045 AC1)", async ({ goto, pages }) => {
    await goto("calendar", { as: "member", month: "2026-11" });
    await pages.calendar.waitForReady();
    await pages.connection.goOffline();
    await expect(pages.connection.title()).toHaveText("You’re offline");

    await pages.calendar.select("Ana Ruiz", "Mon 23 Nov", "Wed 25 Nov");

    await expect(pages.calendar.selectionBar()).toHaveCount(0);
    await expect(pages.calendar.selectedCells()).toHaveCount(0);
  });
});
