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

  test("the header shows the logo and the Main navigation in order (L2-049 AC2)", async ({ pages }) => {
    await expect(pages.calendar.logo()).toBeVisible();
    await expect(pages.calendar.mainNavLinks()).toHaveText([/^Calendar\s*$/, /^Year\s*$/, /^Requests\s*(\d+ pending)?$/, /^Settings\s*$/]); // the manager's Requests link carries the pending count (L2-022 AC1)
  });

  test("Calendar is the only current navigation item (L2-049 AC3)", async ({ pages }) => {
    await expect(pages.calendar.mainNavLink("Calendar")).toHaveAttribute("aria-current", "page");
    for (const label of ["Year", "Requests", "Settings"]) {
      await expect(pages.calendar.mainNavLink(label)).not.toHaveAttribute("aria-current", /.*/);
    }
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
