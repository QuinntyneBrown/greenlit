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
import { AcceptInvitePage } from "../pages/accept-invite.page.js";
import { CalendarPage } from "../pages/calendar.page.js";
import { CreateTeamPage } from "../pages/create-team.page.js";
import { DeclineRequestDialog } from "../pages/decline-request.dialog.js";
import { InviteMemberDialog } from "../pages/invite-member.dialog.js";
import { NewRequestDialog } from "../pages/new-request.dialog.js";
import { NotFoundPage } from "../pages/not-found.page.js";
import { RequestDetailDialog } from "../pages/request-detail.dialog.js";
import { RequestsPage } from "../pages/requests.page.js";
import { SettingsPage } from "../pages/settings.page.js";
import { SignInPage } from "../pages/sign-in.page.js";

interface Pages {
  acceptInvite: AcceptInvitePage;
  calendar: CalendarPage;
  createTeam: CreateTeamPage;
  inviteMember: InviteMemberDialog;
  newRequest: NewRequestDialog;
  notFound: NotFoundPage;
  requestDetail: RequestDetailDialog;
  declineRequest: DeclineRequestDialog;
  requests: RequestsPage;
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
  /** The invitation token of an `acceptInvite` route (the one in the emailed link). */
  token?: string;
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

/** Watches and steers the invitation requests (GET /api/invitations/{token} and POST .../accept). */
interface InvitationsApi {
  /** How many accept requests the page has sent so far. */
  acceptRequests(): number;
  /** Holds the read of the invitation until the returned function is called. */
  holdRead(): Promise<() => void>;
  /** Holds accept requests until the returned function is called. */
  holdAccept(): Promise<() => void>;
  /** Reading the invitation fails with a 500 until `recoverRead()`. */
  failRead(): Promise<void>;
  recoverRead(): Promise<void>;
  /** Every accept request fails with a 500. */
  failAccept(): Promise<void>;
}

/** Watches and steers the request calls (POST /api/requests and GET /api/requests/quote). */
interface RequestsApi {
  /** How many send requests the page has made so far. */
  sends(): number;
  /** Holds send requests until the returned function is called. */
  hold(): Promise<() => void>;
  /** Every send request fails with a 500 until `recover()`. */
  fail(): Promise<void>;
  recover(): Promise<void>;
  /** How many approve requests (POST /api/requests/approve) the page has made so far. */
  approvals(): number;
  /** Holds approve requests until the returned function is called. */
  holdApprove(): Promise<() => void>;
  /** Approve requests fail with a 500 until `recoverApprove()`. */
  failApprove(): Promise<void>;
  recoverApprove(): Promise<void>;
  /** How many decline requests (POST /api/requests/{id}/decline) the page has made so far. */
  declines(): number;
  /** Holds decline requests until the returned function is called. */
  holdDecline(): Promise<() => void>;
  /** Decline requests fail with a 500 until `recoverDecline()`. */
  failDecline(): Promise<void>;
  recoverDecline(): Promise<void>;
  /** Undo (POST /api/requests/{id}/reopen) fails with a 500 until `recoverReopen()`. */
  failReopen(): Promise<void>;
  recoverReopen(): Promise<void>;
  /** The ids of the last approve request (POST /api/requests/approve) the page made. */
  lastApproved(): string[];
  /** Pending requests (GET /api/requests) fail with a 500 until `recoverList()`. */
  failList(): Promise<void>;
  recoverList(): Promise<void>;
  /** Holds list requests until the returned function is called. */
  holdList(): Promise<() => void>;
  /** The pending list is `entries` and the Pending count their number, whatever the database holds. */
  stubPending(entries: object[]): Promise<void>;
  /** Every request opened (GET /api/requests/{id}) comes back as its real detail changed by `change`. */
  changeDetail(change: (detail: any) => void): Promise<void>;
}

interface GlFixtures {
  requestsApi: RequestsApi;
  invitationsApi: InvitationsApi;
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
      const path = pathFor(key).replace(":token", encodeURIComponent(options.token ?? "none"));
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
  requestsApi: async ({ page }, use) => {
    const pattern = "**/api/requests";
    const approve = "**/api/requests/approve";
    const reopen = "**/api/requests/*/reopen";
    const decline = "**/api/requests/*/decline";
    let declines = 0;
    let sends = 0;
    let approvals = 0;
    let approved: string[] = [];
    const list = (url: URL) => url.pathname === "/api/requests";
    page.on("request", (request) => {
      const path = new URL(request.url()).pathname;
      if (request.method() === "POST" && path === "/api/requests") sends++;
      if (request.method() === "POST" && /^\/api\/requests\/[^/]+\/decline$/.test(path)) declines++;
      if (request.method() === "POST" && path === "/api/requests/approve") {
        approvals++;
        approved = (request.postDataJSON() as { ids: string[] }).ids;
      }
    });
    await use({
      lastApproved: () => approved,
      failList: async () => {
        await page.route(list, (route) => (route.request().method() === "GET" ? route.fulfill({ status: 500, body: "" }) : route.fallback()));
      },
      recoverList: () => page.unroute(list),
      holdList: async () => {
        let release!: () => void;
        const released = new Promise<void>((resolve) => (release = resolve));
        await page.route(list, async (route) => {
          if (route.request().method() !== "GET") return route.fallback();
          await released;
          await route.continue();
        });
        return release;
      },
      stubPending: async (entries) => {
        await page.route(list, (route) => {
          const status = new URL(route.request().url()).searchParams.get("status") ?? "Pending";
          return route.request().method() === "GET" && status === "Pending" ? route.fulfill({ json: entries }) : route.fallback();
        });
        await page.route("**/api/requests/counts", async (route) => {
          const response = await route.fetch();
          await route.fulfill({ response, json: { ...(await response.json()), pending: entries.length } });
        });
      },
      changeDetail: async (change) => {
        await page.route(/\/api\/requests\/[0-9a-f-]{36}$/, async (route) => {
          const response = await route.fetch();
          const detail = await response.json();
          change(detail);
          await route.fulfill({ response, json: detail });
        });
      },
      sends: () => sends,
      hold: async () => {
        let release!: () => void;
        const released = new Promise<void>((resolve) => (release = resolve));
        await page.route(pattern, async (route) => {
          if (route.request().method() !== "POST") return route.fallback();
          await released;
          await route.continue();
        });
        return release;
      },
      fail: async () => {
        await page.route(pattern, (route) =>
          route.request().method() === "POST" ? route.fulfill({ status: 500, body: "" }) : route.fallback(),
        );
      },
      recover: () => page.unroute(pattern),
      approvals: () => approvals,
      holdApprove: async () => {
        let release!: () => void;
        const released = new Promise<void>((resolve) => (release = resolve));
        await page.route(approve, async (route) => {
          await released;
          await route.continue();
        });
        return release;
      },
      failApprove: async () => {
        await page.route(approve, (route) => route.fulfill({ status: 500, body: "" }));
      },
      recoverApprove: () => page.unroute(approve),
      declines: () => declines,
      holdDecline: async () => {
        let release!: () => void;
        const released = new Promise<void>((resolve) => (release = resolve));
        await page.route(decline, async (route) => {
          await released;
          await route.continue();
        });
        return release;
      },
      failDecline: async () => {
        await page.route(decline, (route) => route.fulfill({ status: 500, body: "" }));
      },
      recoverDecline: () => page.unroute(decline),
      failReopen: async () => {
        await page.route(reopen, (route) => route.fulfill({ status: 500, body: "" }));
      },
      recoverReopen: () => page.unroute(reopen),
    });
  },
  invitationsApi: async ({ page }, use) => {
    const read = "**/api/invitations/*";
    const accept = "**/api/invitations/*/accept";
    let accepts = 0;
    page.on("request", (request) => {
      if (request.method() === "POST" && /^\/api\/invitations\/[^/]+\/accept$/.test(new URL(request.url()).pathname)) accepts++;
    });
    const hold = async (pattern: string, method: string) => {
      let release!: () => void;
      const released = new Promise<void>((resolve) => (release = resolve));
      await page.route(pattern, async (route) => {
        if (route.request().method() !== method) return route.fallback();
        await released;
        await route.continue();
      });
      return release;
    };
    await use({
      acceptRequests: () => accepts,
      holdRead: () => hold(read, "GET"),
      holdAccept: () => hold(accept, "POST"),
      failRead: async () => {
        await page.route(read, (route) =>
          route.request().method() === "GET" ? route.fulfill({ status: 500, body: "" }) : route.fallback(),
        );
      },
      recoverRead: () => page.unroute(read),
      failAccept: async () => {
        await page.route(accept, (route) => route.fulfill({ status: 500, body: "" }));
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
      acceptInvite: new AcceptInvitePage(page),
      calendar: new CalendarPage(page),
      createTeam: new CreateTeamPage(page),
      inviteMember: new InviteMemberDialog(page),
      newRequest: new NewRequestDialog(page),
      notFound: new NotFoundPage(page),
      requestDetail: new RequestDetailDialog(page),
      declineRequest: new DeclineRequestDialog(page),
      requests: new RequestsPage(page),
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
