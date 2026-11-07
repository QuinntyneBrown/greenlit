/**
 * The Greenlit test fixture.
 *
 * Wraps `@playwright/test`'s `test` with:
 *   - `goto(routeKey)`: navigates to the right URL for whichever target we're
 *     hitting (mocks vs Angular). Guarded routes sign in first here, through
 *     the real sign-in endpoint, so specs never spell out a login.
 *   - `pages`: namespaced page objects (e.g. `pages.calendar`).
 *   - `settle()`: wait for fonts + network idle so visual diffs are stable.
 *
 * Specs import `test` and `expect` from this file, not from
 * `@playwright/test` directly, so the routing/POM wiring is consistent.
 */

import { test as base, expect, TestInfo } from "@playwright/test";
import { guardFor, isBaseline, pathFor, RouteKey } from "./routes.js";
import { Person, SESSION_KEY, signIn } from "./session.js";
import { CalendarPage } from "../pages/calendar.page.js";
import { CreateTeamPage } from "../pages/create-team.page.js";
import { InviteMemberDialog } from "../pages/invite-member.dialog.js";
import { NotFoundPage } from "../pages/not-found.page.js";
import { SettingsPage } from "../pages/settings.page.js";
import { SignInPage } from "../pages/sign-in.page.js";

interface Pages {
  calendar: CalendarPage;
  createTeam: CreateTeamPage;
  inviteMember: InviteMemberDialog;
  notFound: NotFoundPage;
  settings: SettingsPage;
  signIn: SignInPage;
}

interface GotoOptions {
  /** Who is signed in: on a guarded route the manager by default; on any other route only when given. */
  as?: Person;
  /** `yyyy-MM`: open the calendar on this month instead of the current one. */
  month?: string;
  /** Open a guarded route with no session, to see where it sends a visitor. */
  signedOut?: boolean;
  /** Open sign-in with this `returnUrl`, as the guard does. */
  returnUrl?: string;
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
  /** Saving days (PUT /api/sheet/days) fails with a 500 until `recoverSaves()`. */
  failSaves(): Promise<void>;
  recoverSaves(): Promise<void>;
}

/** Watches and steers the sign-in request (POST /api/auth/sign-in). */
interface AuthApi {
  /** How many sign-in requests the page has sent so far. */
  requests(): number;
  /** Holds sign-in requests until the returned function is called. */
  hold(): Promise<() => void>;
  /** Every sign-in request fails with a 500. */
  fail(): Promise<void>;
}

/** Watches and steers the create-team request (POST /api/teams). */
interface TeamApi {
  /** How many create-team requests the page has sent so far. */
  requests(): number;
  /** Holds create-team requests; none reaches the API. */
  hold(): Promise<void>;
  /** Every create-team request fails with a 500. */
  fail(): Promise<void>;
}

/** Watches and steers the invite request (POST /api/team/members). */
interface MembersApi {
  /** How many invite requests the page has sent so far. */
  requests(): number;
  /** Holds invite requests until the returned function is called. */
  hold(): Promise<() => void>;
  /** Every invite request fails with a 500. */
  fail(): Promise<void>;
}

interface GlFixtures {
  authApi: AuthApi;
  membersApi: MembersApi;
  teamApi: TeamApi;
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
      // Guarded routes start signed in, with a token from POST /api/auth/sign-in (fixtures/session.ts).
      if ((guardFor(key) || options.as) && !isBaseline && !options.signedOut) {
        const token = await signIn(page.request, options.as ?? "manager");
        await page.addInitScript(([k, t]) => window.localStorage.setItem(k, t), [SESSION_KEY, token]);
      }
      const path = pathFor(key);
      const query = new URLSearchParams();
      if (options.month && !isBaseline) query.set("month", options.month);
      if (options.returnUrl && !isBaseline) query.set("returnUrl", options.returnUrl);
      await page.goto(query.size ? `${path}?${query}` : path);
    });
  },
  authApi: async ({ page }, use) => {
    const pattern = "**/api/auth/sign-in";
    let count = 0;
    page.on("request", (request) => {
      if (request.method() === "POST" && new URL(request.url()).pathname === "/api/auth/sign-in") count++;
    });
    await use({
      requests: () => count,
      hold: async () => {
        let release!: () => void;
        const released = new Promise<void>((resolve) => (release = resolve));
        await page.route(pattern, async (route) => {
          await released;
          await route.continue();
        });
        return release;
      },
      fail: async () => {
        await page.route(pattern, (route) => route.fulfill({ status: 500, body: "" }));
      },
    });
  },
  membersApi: async ({ page }, use) => {
    const pattern = "**/api/team/members";
    let count = 0;
    page.on("request", (request) => {
      if (request.method() === "POST" && new URL(request.url()).pathname === "/api/team/members") count++;
    });
    await use({
      requests: () => count,
      hold: async () => {
        let release!: () => void;
        const released = new Promise<void>((resolve) => (release = resolve));
        await page.route(pattern, async (route) => {
          await released;
          await route.continue();
        });
        return release;
      },
      fail: async () => {
        await page.route(pattern, (route) => route.fulfill({ status: 500, body: "" }));
      },
    });
  },
  teamApi: async ({ page }, use) => {
    const pattern = "**/api/teams";
    let count = 0;
    page.on("request", (request) => {
      if (request.method() === "POST" && new URL(request.url()).pathname === "/api/teams") count++;
    });
    await use({
      requests: () => count,
      hold: async () => {
        await page.route(pattern, () => new Promise<void>(() => {}));
      },
      fail: async () => {
        await page.route(pattern, (route) => route.fulfill({ status: 500, body: "" }));
      },
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
      failSaves: async () => {
        await page.route("**/api/sheet/days", (route) =>
          route.request().method() === "PUT" ? route.fulfill({ status: 500, body: "" }) : route.fallback(),
        );
      },
      recoverSaves: () => page.unroute("**/api/sheet/days"),
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
    await use({
      calendar: new CalendarPage(page),
      createTeam: new CreateTeamPage(page),
      inviteMember: new InviteMemberDialog(page),
      notFound: new NotFoundPage(page),
      settings: new SettingsPage(page),
      signIn: new SignInPage(page),
    });
  },
  settle: async ({ page }, use) => {
    await use(async () => {
      await page.evaluate(() => document.fonts.ready);
      await page.waitForLoadState("networkidle");
    });
  },
});

export { expect };
