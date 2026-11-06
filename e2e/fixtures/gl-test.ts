/**
 * The Greenlit test fixture.
 *
 * Wraps `@playwright/test`'s `test` with:
 *   - `goto(routeKey)`: navigates to the right URL for whichever target we're
 *     hitting (mocks vs Angular). Once sign-in lands, guarded routes sign in
 *     first here, so specs never spell out a login.
 *   - `pages`: namespaced page objects (e.g. `pages.sheet`).
 *   - `settle()`: wait for fonts + network idle so visual diffs are stable.
 *
 * Specs import `test` and `expect` from this file, not from
 * `@playwright/test` directly, so the routing/POM wiring is consistent.
 */

import { test as base, expect, TestInfo } from "@playwright/test";
import { pathFor, RouteKey } from "./routes.js";
import { SheetPage } from "../pages/sheet.page.js";

interface Pages {
  sheet: SheetPage;
}

interface GlFixtures {
  goto: (key: RouteKey) => Promise<void>;
  pages: Pages;
  /** Pause until web fonts have loaded and the network is idle so visual diffs are stable. */
  settle: () => Promise<void>;
}

/** Phone layout below 720px; tablet and desktop at and above. */
export function isPhone(testInfo: TestInfo): boolean {
  return (testInfo.project.use.viewport?.width ?? 1440) < 720;
}

export const test = base.extend<GlFixtures>({
  goto: async ({ page }, use) => {
    await use(async (key) => {
      await page.goto(pathFor(key));
    });
  },
  pages: async ({ page }, use) => {
    await use({ sheet: new SheetPage(page) });
  },
  settle: async ({ page }, use) => {
    await use(async () => {
      await page.evaluate(() => document.fonts.ready);
      await page.waitForLoadState("networkidle");
    });
  },
});

export { expect };
