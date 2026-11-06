import { test, expect } from "../fixtures/gl-test.js";

/**
 * The sheet is the landing screen. This spec proves the shell contract the
 * page objects rely on; the sheet's own behaviour arrives slice by slice with
 * its requirement, design and mock.
 */
test.describe("Sheet", () => {
  test.beforeEach(async ({ goto, pages }) => {
    await goto("sheet");
    await pages.sheet.waitForReady();
  });

  test("stamps the page slug and shows the title inside the main landmark", async ({ pages }) => {
    await expect(pages.sheet.body).toHaveAttribute("data-page", "sheet");
    await expect(pages.sheet.title()).toHaveText("Greenlit");
  });

  test("the skip link is the first focusable element and targets main", async ({ page, pages }) => {
    await page.keyboard.press("Tab");
    await expect(pages.sheet.skipLink()).toBeFocused();
    await expect(pages.sheet.skipLink()).toHaveAttribute("href", "#main");
  });

  test("/ lands on the sheet", async ({ page, pages }) => {
    await page.goto("/");
    await pages.sheet.waitForReady();
    expect(new URL(page.url()).pathname).toBe("/sheet");
  });
});
