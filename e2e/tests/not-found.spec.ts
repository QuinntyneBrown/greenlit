// Acceptance Test
// Traces to: L2-046, L2-049
// Description: An unknown address, including the old /sheet, shows the not-found page with a way home.

import { test, expect } from "../fixtures/gl-test.js";

test.describe("Not found", () => {
  test("an unknown address shows the not-found page (L2-046 AC1)", async ({ goto, pages }) => {
    await goto("notFound");
    await pages.notFound.waitForReady();
    await expect(pages.notFound.title()).toHaveText("This page doesn’t exist");
    await expect(pages.notFound.message()).toHaveText("The link may be old or mistyped.");
    await expect(pages.notFound.backToCalendar()).toBeVisible();
  });

  test("the old /sheet address shows the not-found page (L2-049 AC5)", async ({ page, pages }) => {
    await page.goto("/sheet");
    await pages.notFound.waitForReady();
    await expect(pages.notFound.title()).toHaveText("This page doesn’t exist");
  });

  test("Back to calendar opens the calendar (L2-046 AC1)", async ({ page, goto, pages }) => {
    await goto("notFound");
    await pages.notFound.waitForReady();
    await pages.notFound.goBackToCalendar();
    await pages.calendar.waitForReady();
    expect(new URL(page.url()).pathname).toBe("/");
  });
});
