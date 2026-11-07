/**
 * The Greenlit test fixture.
 *
 * Wraps `@playwright/test`'s `test` with:
 *   - `goto(routeKey)`: navigates to the right URL for whichever target we're
 *     hitting (mocks vs Angular). Once sign-in lands, guarded routes sign in
 *     first here, so specs never spell out a login.
 *   - `pages`: namespaced page objects (e.g. `pages.calendar`).
 *   - `settle()`: wait for fonts + network idle so visual diffs are stable.
 *
 * Specs import `test` and `expect` from this file, not from
 * `@playwright/test` directly, so the routing/POM wiring is consistent.
 */

import { test as base, expect, TestInfo } from "@playwright/test";
import { guardFor, isBaseline, pathFor, RouteKey } from "./routes.js";
import { Person, SESSION_KEY, tokenFor } from "./session.js";
import { CalendarPage } from "../pages/calendar.page.js";
import { NotFoundPage } from "../pages/not-found.page.js";

interface Pages {
  calendar: CalendarPage;
  notFound: NotFoundPage;
}

interface GotoOptions {
  /** Who is signed in on a guarded route; the manager by default. */
  as?: Person;
  /** `yyyy-MM`: open the calendar on this month instead of the current one. */
  month?: string;
}

/**
 * Puts the month request (GET /api/sheet) into states the seeded data cannot
 * produce: a failing API, a slow one, or a team of one.
 */
interface SheetApi {
  /** Every month request fails with a 500 until `recover()`. */
  fail(): Promise<void>;
  /** Lets month requests through again. */
  recover(): Promise<void>;
  /** Holds month requests until the returned function is called. */
  hold(): Promise<() => void>;
  /** Answers with the real month, keeping only the signed-in person's row. */
  onlyMe(): Promise<void>;
}

interface GlFixtures {
  sheetApi: SheetApi;
  goto: (key: RouteKey, options?: GotoOptions) => Promise<void>;
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
    await use(async (key, options = {}) => {
      // Until sign-in lands, guarded routes get a session the e2e API accepts (fixtures/session.ts).
      if (guardFor(key) && !isBaseline) {
        const token = tokenFor(options.as ?? "manager");
        await page.addInitScript(([k, t]) => window.localStorage.setItem(k, t), [SESSION_KEY, token]);
      }
      const path = pathFor(key);
      await page.goto(options.month && !isBaseline ? `${path}?month=${options.month}` : path);
    });
  },
  sheetApi: async ({ page }, use) => {
    const pattern = "**/api/sheet**";
    await use({
      fail: async () => {
        await page.route(pattern, (route) => route.fulfill({ status: 500, body: "" }));
      },
      recover: () => page.unroute(pattern),
      hold: async () => {
        let release!: () => void;
        const released = new Promise<void>((resolve) => (release = resolve));
        await page.route(pattern, async (route) => {
          await released;
          await route.continue();
        });
        return release;
      },
      onlyMe: async () => {
        await page.route(pattern, async (route) => {
          const response = await route.fetch();
          const month = await response.json();
          month.members = month.members.filter((m: { isYou: boolean }) => m.isYou);
          await route.fulfill({ response, json: month });
        });
      },
    });
  },
  pages: async ({ page }, use) => {
    await use({ calendar: new CalendarPage(page), notFound: new NotFoundPage(page) });
  },
  settle: async ({ page }, use) => {
    await use(async () => {
      await page.evaluate(() => document.fonts.ready);
      await page.waitForLoadState("networkidle");
    });
  },
});

export { expect };
