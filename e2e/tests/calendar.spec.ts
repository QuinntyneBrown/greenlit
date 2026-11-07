// Acceptance Test
// Traces to: L2-049, L2-047
// Description: The calendar is the home screen at `/`, inside the app chrome.

import { test, expect } from "../fixtures/gl-test.js";

test.describe("Calendar", () => {
  test.beforeEach(async ({ goto, pages }) => {
    await goto("calendar");
    await pages.calendar.waitForReady();
  });

  test("/ is the calendar screen inside the main landmark (L2-049 AC1)", async ({ page, pages }) => {
    expect(new URL(page.url()).pathname).toBe("/");
    await expect(pages.calendar.body).toHaveAttribute("data-page", "calendar");
    await expect(pages.calendar.main).toBeVisible();
  });

  test("the skip link is the first focusable element and targets main (L2-049 AC4, L2-047 AC3)", async ({
    page,
    pages,
  }) => {
    await page.keyboard.press("Tab");
    await expect(pages.calendar.skipLink()).toBeFocused();
    await expect(pages.calendar.skipLink()).toHaveText("Skip to content");
    await expect(pages.calendar.skipLink()).toHaveAttribute("href", "#main");
  });
});
