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
import { Person, SESSION_KEY, expiredToken, signIn } from "./session.js";
import { AccountMenu } from "../pages/account-menu.js";
import { SessionExpiredPage } from "../pages/session-expired.page.js";
import { SignOutDialog } from "../pages/sign-out.dialog.js";
import { RemoveHolidayDialog } from "../pages/remove-holiday.dialog.js";
import { EditWorkingDaysDialog } from "../pages/edit-working-days.dialog.js";
import { AddHolidayDialog } from "../pages/add-holiday.dialog.js";
import { AcceptInvitePage } from "../pages/accept-invite.page.js";
import { ForgotPasswordPage } from "../pages/forgot-password.page.js";
import { ResetPasswordPage } from "../pages/reset-password.page.js";
import { CalendarPage } from "../pages/calendar.page.js";
import { CreateTeamPage } from "../pages/create-team.page.js";
import { CancelRequestDialog } from "../pages/cancel-request.dialog.js";
import { DeclineRequestDialog } from "../pages/decline-request.dialog.js";
import { InviteMemberDialog } from "../pages/invite-member.dialog.js";
import { NewRequestDialog } from "../pages/new-request.dialog.js";
import { MarketingPage } from "../pages/marketing.page.js";
import { NotFoundPage } from "../pages/not-found.page.js";
import { RequestDetailDialog } from "../pages/request-detail.dialog.js";
import { RequestsPage } from "../pages/requests.page.js";
import { SettingsPage } from "../pages/settings.page.js";
import { SignInPage } from "../pages/sign-in.page.js";

interface Pages {
  sessionExpired: SessionExpiredPage;
  signOutDialog: SignOutDialog;
  accountMenu: AccountMenu;
  editWorkingDays: EditWorkingDaysDialog;
  removeHoliday: RemoveHolidayDialog;
  addHoliday: AddHolidayDialog;
  acceptInvite: AcceptInvitePage;
  forgotPassword: ForgotPasswordPage;
  resetPassword: ResetPasswordPage;
  calendar: CalendarPage;
  createTeam: CreateTeamPage;
  inviteMember: InviteMemberDialog;
  newRequest: NewRequestDialog;
  marketing: MarketingPage;
  notFound: NotFoundPage;
  requestDetail: RequestDetailDialog;
  declineRequest: DeclineRequestDialog;
  cancelRequest: CancelRequestDialog;
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
  /** Open the route with a session the browser kept but whose time has run out. */
  expiredSession?: boolean;
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
  /** Holds saves (PUT /api/sheet/days) until the returned function is called. */
  holdSaves(): Promise<() => void>;
}

/** Watches and steers the sign-in request (POST /api/auth/sign-in). */
interface AuthApi {
  /** How many sign-in requests the page has sent so far. */
  requests(): number;
  /** Holds sign-in requests until the returned function is called. */
  hold(): Promise<() => void>;
  /** Every sign-in request fails with a 500. */
  fail(): Promise<void>;
  /** Reading who is signed in (GET /api/auth/me) fails with a 500, for the account menu. */
  failAccount(): Promise<void>;
  /** How many sign-out requests (POST /api/auth/sign-out) the app has sent so far. */
  signOuts(): number;
  /** Holds sign-out requests until the returned function is called. */
  holdSignOut(): Promise<() => void>;
  /** Every sign-out request fails with a 500. */
  failSignOut(): Promise<void>;
  /** Every call to the API but sign-in is answered 401 `session_expired`, as for a token the API has let lapse. */
  expireSession(): Promise<void>;
  /** Every call to the API but sign-in is answered 401 with no code, as for a token the API does not accept. */
  rejectSession(): Promise<void>;
  /** The API answers as it really does again. */
  restoreSession(): Promise<void>;
}

/**
 * Watches and steers the password reset requests: asking for a link (POST /api/auth/password-reset),
 * opening one (GET /api/auth/password-reset/{token}) and choosing a password (POST .../confirm).
 */
interface PasswordResetApi {
  /** How many link requests the page has sent so far. */
  requests(): number;
  /** Holds link requests until the returned function is called. */
  holdRequest(): Promise<() => void>;
  /** Link requests fail with a 503 `email_failed` until `recoverRequest()`. */
  failRequest(): Promise<void>;
  recoverRequest(): Promise<void>;
  /** How many choose-a-password requests the page has sent so far. */
  confirms(): number;
  /** Holds choose-a-password requests until the returned function is called. */
  holdConfirm(): Promise<() => void>;
  /** Choose-a-password requests fail with a 500 until `recoverConfirm()`. */
  failConfirm(): Promise<void>;
  recoverConfirm(): Promise<void>;
  /** Holds the check of an opened link until the returned function is called. */
  holdCheck(): Promise<() => void>;
  /** The check of an opened link fails with a 500 until `recoverCheck()`. */
  failCheck(): Promise<void>;
  recoverCheck(): Promise<void>;
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

/** Watches and steers the holiday calls (GET /api/team/holidays and its writes). */
interface HolidaysApi {
  /** The holiday list (GET /api/team/holidays) comes back as `body`, whatever the database holds. */
  stubList(body: object): Promise<void>;
  /** Reading the holiday list fails with a 500 until `recoverList()`. */
  failList(): Promise<void>;
  recoverList(): Promise<void>;
  /** How many add requests (POST /api/team/holidays) the page has sent so far. */
  adds(): number;
  /** Holds add requests until the returned function is called. */
  holdAdd(): Promise<() => void>;
  /** Add requests fail with a 500 until `recoverAdd()`. */
  failAdd(): Promise<void>;
  recoverAdd(): Promise<void>;
  /** Holds remove requests (DELETE /api/team/holidays/{id}) until the returned function is called. */
  holdRemove(): Promise<() => void>;
  /** Remove requests fail with a 500 until `recoverRemove()`. */
  failRemove(): Promise<void>;
  recoverRemove(): Promise<void>;
  /** Undo (POST /api/team/holidays/{id}/restore) fails with a 500 until `recoverRestore()`. */
  failRestore(): Promise<void>;
  recoverRestore(): Promise<void>;
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
  /** How many cancel requests (POST /api/requests/{id}/cancel) the page has made so far. */
  cancels(): number;
  /** Holds cancel requests until the returned function is called. */
  holdCancel(): Promise<() => void>;
  /** Cancel requests fail with a 500 until `recoverCancel()`. */
  failCancel(): Promise<void>;
  recoverCancel(): Promise<void>;
  /** The member's own requests (GET /api/requests/mine) come back as `body`, whatever the database holds. */
  stubMine(body: object): Promise<void>;
  /** The member's own requests fail with a 500. */
  failMine(): Promise<void>;
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

/** Watches and steers the working-days saves (PUT /api/team/settings/work-week and /api/team/members/{id}/working-days). */
/** Puts the Team section's requests (GET and PUT /api/team/settings/team) into states the seeded data cannot produce. */
interface TeamSettingsApi {
  /** How many Team section saves the page has sent so far. */
  teamSaves(): number;
  /** Holds Team section saves until the returned function is called. */
  holdTeam(): Promise<() => void>;
  /** Team section saves fail with a 500 until `recoverTeam()`. */
  failTeam(): Promise<void>;
  recoverTeam(): Promise<void>;
  /** Reading the Team section fails with a 500 until `recoverLoad()`. */
  failLoad(): Promise<void>;
  recoverLoad(): Promise<void>;
}

/** Puts saving the allowance defaults (PUT /api/team/settings/allowances) into states the seeded data cannot produce. */
interface AllowanceApi {
  /** How many allowance saves the page has sent so far. */
  saves(): number;
  /** Holds allowance saves until the returned function is called. */
  hold(): Promise<() => void>;
  /** Allowance saves fail with a 500 until `recover()`. */
  fail(): Promise<void>;
  recover(): Promise<void>;
}

interface WorkingDaysApi {
  /** How many work-week saves the page has sent so far. */
  weekSaves(): number;
  /** Holds work-week saves until the returned function is called. */
  holdWeek(): Promise<() => void>;
  /** Work-week saves fail with a 500 until `recoverWeek()`. */
  failWeek(): Promise<void>;
  recoverWeek(): Promise<void>;
  /** How many member working-days saves the page has sent so far. */
  memberSaves(): number;
  /** Holds member working-days saves until the returned function is called. */
  holdMember(): Promise<() => void>;
  /** Member working-days saves fail with a 500 until `recoverMember()`. */
  failMember(): Promise<void>;
  recoverMember(): Promise<void>;
}

/** Watches and steers the coverage saves (PUT /api/team/settings/coverage). */
interface CoverageApi {
  /** How many coverage saves the page has sent so far. */
  saves(): number;
  /** Holds coverage saves until the returned function is called. */
  holdSave(): Promise<() => void>;
  /** Coverage saves fail with a 500 until `recoverSave()`. */
  failSave(): Promise<void>;
  recoverSave(): Promise<void>;
}

interface GlFixtures {
  coverageApi: CoverageApi;
  workingDaysApi: WorkingDaysApi;
  teamSettingsApi: TeamSettingsApi;
  allowanceApi: AllowanceApi;
  holidaysApi: HolidaysApi;
  requestsApi: RequestsApi;
  invitationsApi: InvitationsApi;
  passwordResetApi: PasswordResetApi;
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

/** Every call to the Greenlit API except signing in. */
const callsButSignIn = /\/api\/(?!auth\/sign-in)/;

export const test = base.extend<GlFixtures>({
  goto: async ({ page }, use) => {
    await use(async (key, options = {}) => {
      // Guarded routes start signed in, with a token from POST /api/auth/sign-in (fixtures/session.ts).
      if ((guardFor(key) || options.as) && !isBaseline && !options.signedOut) {
        const token = await signIn(page.request, options.as ?? "manager");
        await page.addInitScript(
          ([k, t]) => window.localStorage.setItem(k, t),
          [SESSION_KEY, token],
        );
      }
      if (options.expiredSession && !isBaseline) {
        await page.addInitScript(
          ([k, t]) => window.localStorage.setItem(k, t),
          [SESSION_KEY, expiredToken()],
        );
      }
      const path = pathFor(key).replace(
        ":token",
        encodeURIComponent(options.token ?? "none"),
      );
      const query = new URLSearchParams();
      if (options.month && !isBaseline) query.set("month", options.month);
      if (options.returnUrl && !isBaseline)
        query.set("returnUrl", options.returnUrl);
      await page.goto(query.size ? `${path}?${query}` : path);
    });
  },
  authApi: async ({ page }, use) => {
    const pattern = "**/api/auth/sign-in";
    let count = 0;
    let signOuts = 0;
    page.on("request", (request) => {
      if (
        request.method() === "POST" &&
        new URL(request.url()).pathname === "/api/auth/sign-in"
      )
        count++;
      if (
        request.method() === "POST" &&
        new URL(request.url()).pathname === "/api/auth/sign-out"
      )
        signOuts++;
    });
    await use({
      requests: () => count,
      signOuts: () => signOuts,
      holdSignOut: async () => {
        let release!: () => void;
        const released = new Promise<void>((resolve) => (release = resolve));
        await page.route("**/api/auth/sign-out", async (route) => {
          await released;
          await route.continue();
        });
        return release;
      },
      expireSession: async () => {
        await page.route(callsButSignIn, (route) =>
          route.request().method() === "OPTIONS"
            ? route.fallback()
            : route.fulfill({
                status: 401,
                contentType: "application/problem+json",
                headers: { "access-control-allow-origin": "*" },
                body: JSON.stringify({ status: 401, title: "Unauthorized", code: "session_expired" }),
              }),
        );
      },
      rejectSession: async () => {
        await page.route(callsButSignIn, (route) =>
          route.request().method() === "OPTIONS"
            ? route.fallback()
            : route.fulfill({
                status: 401,
                headers: { "access-control-allow-origin": "*" },
                body: "",
              }),
        );
      },
      restoreSession: async () => {
        await page.unroute(callsButSignIn);
      },
      failSignOut: async () => {
        await page.route("**/api/auth/sign-out", (route) =>
          route.fulfill({ status: 500, body: "" }),
        );
      },
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
        await page.route(pattern, (route) =>
          route.fulfill({ status: 500, body: "" }),
        );
      },
      failAccount: async () => {
        await page.route("**/api/auth/me", (route) =>
          route.fulfill({ status: 500, body: "" }),
        );
      },
    });
  },
  requestsApi: async ({ page }, use) => {
    const pattern = "**/api/requests";
    const approve = "**/api/requests/approve";
    const reopen = "**/api/requests/*/reopen";
    const decline = "**/api/requests/*/decline";
    const cancel = "**/api/requests/*/cancel";
    let cancels = 0;
    let declines = 0;
    let sends = 0;
    let approvals = 0;
    let approved: string[] = [];
    const list = (url: URL) => url.pathname === "/api/requests";
    page.on("request", (request) => {
      const path = new URL(request.url()).pathname;
      if (request.method() === "POST" && path === "/api/requests") sends++;
      if (
        request.method() === "POST" &&
        /^\/api\/requests\/[^/]+\/decline$/.test(path)
      )
        declines++;
      if (
        request.method() === "POST" &&
        /^\/api\/requests\/[^/]+\/cancel$/.test(path)
      )
        cancels++;
      if (request.method() === "POST" && path === "/api/requests/approve") {
        approvals++;
        approved = (request.postDataJSON() as { ids: string[] }).ids;
      }
    });
    await use({
      lastApproved: () => approved,
      cancels: () => cancels,
      holdCancel: async () => {
        let release!: () => void;
        const released = new Promise<void>((resolve) => (release = resolve));
        await page.route(cancel, async (route) => {
          await released;
          await route.continue();
        });
        return release;
      },
      failCancel: async () => {
        await page.route(cancel, (route) =>
          route.fulfill({ status: 500, body: "" }),
        );
      },
      recoverCancel: () => page.unroute(cancel),
      stubMine: async (body) => {
        await page.route("**/api/requests/mine", (route) =>
          route.fulfill({ json: body }),
        );
      },
      failMine: async () => {
        await page.route("**/api/requests/mine", (route) =>
          route.fulfill({ status: 500, body: "" }),
        );
      },
      failList: async () => {
        await page.route(list, (route) =>
          route.request().method() === "GET"
            ? route.fulfill({ status: 500, body: "" })
            : route.fallback(),
        );
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
          const status =
            new URL(route.request().url()).searchParams.get("status") ??
            "Pending";
          return route.request().method() === "GET" && status === "Pending"
            ? route.fulfill({ json: entries })
            : route.fallback();
        });
        await page.route("**/api/requests/counts", async (route) => {
          const response = await route.fetch();
          await route.fulfill({
            response,
            json: { ...(await response.json()), pending: entries.length },
          });
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
          route.request().method() === "POST"
            ? route.fulfill({ status: 500, body: "" })
            : route.fallback(),
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
        await page.route(approve, (route) =>
          route.fulfill({ status: 500, body: "" }),
        );
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
        await page.route(decline, (route) =>
          route.fulfill({ status: 500, body: "" }),
        );
      },
      recoverDecline: () => page.unroute(decline),
      failReopen: async () => {
        await page.route(reopen, (route) =>
          route.fulfill({ status: 500, body: "" }),
        );
      },
      recoverReopen: () => page.unroute(reopen),
    });
  },
  coverageApi: async ({ page }, use) => {
    const pattern = "**/api/team/settings/coverage";
    let saves = 0;
    page.on("request", (request) => {
      if (
        request.method() === "PUT" &&
        new URL(request.url()).pathname === "/api/team/settings/coverage"
      )
        saves++;
    });
    await use({
      saves: () => saves,
      holdSave: async () => {
        let release!: () => void;
        const released = new Promise<void>((resolve) => (release = resolve));
        await page.route(pattern, async (route) => {
          await released;
          await route.continue();
        });
        return release;
      },
      failSave: async () => {
        await page.route(pattern, (route) =>
          route.fulfill({ status: 500, body: "" }),
        );
      },
      recoverSave: () => page.unroute(pattern),
    });
  },
  allowanceApi: async ({ page }, use) => {
    const pattern = "**/api/team/settings/allowances";
    let saves = 0;
    page.on("request", (request) => {
      if (request.method() === "PUT" && new URL(request.url()).pathname === "/api/team/settings/allowances") saves++;
    });
    await use({
      saves: () => saves,
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
      recover: () => page.unroute(pattern),
    });
  },
  teamSettingsApi: async ({ page }, use) => {
    const team = "**/api/team/settings/team";
    let teamSaves = 0;
    page.on("request", (request) => {
      if (request.method() === "PUT" && new URL(request.url()).pathname === "/api/team/settings/team") teamSaves++;
    });
    await use({
      teamSaves: () => teamSaves,
      holdTeam: async () => {
        let release!: () => void;
        const released = new Promise<void>((resolve) => (release = resolve));
        await page.route(team, async (route) => {
          if (route.request().method() !== "PUT") return route.fallback();
          await released;
          await route.continue();
        });
        return release;
      },
      failTeam: async () => {
        await page.route(team, (route) =>
          route.request().method() === "PUT" ? route.fulfill({ status: 500, body: "" }) : route.fallback(),
        );
      },
      recoverTeam: () => page.unroute(team),
      failLoad: async () => {
        await page.route(team, (route) =>
          route.request().method() === "GET" ? route.fulfill({ status: 500, body: "" }) : route.fallback(),
        );
      },
      recoverLoad: () => page.unroute(team),
    });
  },
  workingDaysApi: async ({ page }, use) => {
    const week = "**/api/team/settings/work-week";
    const member = "**/api/team/members/*/working-days";
    let weekSaves = 0;
    let memberSaves = 0;
    page.on("request", (request) => {
      if (request.method() !== "PUT") return;
      const path = new URL(request.url()).pathname;
      if (path === "/api/team/settings/work-week") weekSaves++;
      if (/^\/api\/team\/members\/[^/]+\/working-days$/.test(path))
        memberSaves++;
    });
    const hold = async (pattern: string) => {
      let release!: () => void;
      const released = new Promise<void>((resolve) => (release = resolve));
      await page.route(pattern, async (route) => {
        await released;
        await route.continue();
      });
      return release;
    };
    await use({
      weekSaves: () => weekSaves,
      holdWeek: () => hold(week),
      failWeek: async () => {
        await page.route(week, (route) =>
          route.fulfill({ status: 500, body: "" }),
        );
      },
      recoverWeek: () => page.unroute(week),
      memberSaves: () => memberSaves,
      holdMember: () => hold(member),
      failMember: async () => {
        await page.route(member, (route) =>
          route.fulfill({ status: 500, body: "" }),
        );
      },
      recoverMember: () => page.unroute(member),
    });
  },
  holidaysApi: async ({ page }, use) => {
    const list = (url: URL) => url.pathname === "/api/team/holidays";
    let adds = 0;
    page.on("request", (request) => {
      if (
        request.method() === "POST" &&
        new URL(request.url()).pathname === "/api/team/holidays"
      )
        adds++;
    });
    await use({
      adds: () => adds,
      holdAdd: async () => {
        let release!: () => void;
        const released = new Promise<void>((resolve) => (release = resolve));
        await page.route(list, async (route) => {
          if (route.request().method() !== "POST") return route.fallback();
          await released;
          await route.continue();
        });
        return release;
      },
      failAdd: async () => {
        await page.route(list, (route) =>
          route.request().method() === "POST"
            ? route.fulfill({ status: 500, body: "" })
            : route.fallback(),
        );
      },
      recoverAdd: () => page.unroute(list),
      holdRemove: async () => {
        let release!: () => void;
        const released = new Promise<void>((resolve) => (release = resolve));
        await page.route("**/api/team/holidays/*", async (route) => {
          if (route.request().method() !== "DELETE") return route.fallback();
          await released;
          await route.continue();
        });
        return release;
      },
      failRemove: async () => {
        await page.route("**/api/team/holidays/*", (route) =>
          route.request().method() === "DELETE"
            ? route.fulfill({ status: 500, body: "" })
            : route.fallback(),
        );
      },
      recoverRemove: () => page.unroute("**/api/team/holidays/*"),
      failRestore: async () => {
        await page.route("**/api/team/holidays/*/restore", (route) =>
          route.fulfill({ status: 500, body: "" }),
        );
      },
      recoverRestore: () => page.unroute("**/api/team/holidays/*/restore"),
      stubList: async (body) => {
        await page.route(list, (route) =>
          route.request().method() === "GET"
            ? route.fulfill({ json: body })
            : route.fallback(),
        );
      },
      failList: async () => {
        await page.route(list, (route) =>
          route.request().method() === "GET"
            ? route.fulfill({ status: 500, body: "" })
            : route.fallback(),
        );
      },
      recoverList: () => page.unroute(list),
    });
  },
  passwordResetApi: async ({ page }, use) => {
    const request = (r: { url(): string; method(): string }) =>
      r.method() === "POST" && new URL(r.url()).pathname === "/api/auth/password-reset";
    const confirm = (r: { url(): string; method(): string }) =>
      r.method() === "POST" && new URL(r.url()).pathname === "/api/auth/password-reset/confirm";
    const check = (r: { url(): string; method(): string }) =>
      r.method() === "GET" && /^\/api\/auth\/password-reset\/[^/]+$/.test(new URL(r.url()).pathname);
    let requests = 0;
    let confirms = 0;
    page.on("request", (r) => {
      if (request(r)) requests++;
      if (confirm(r)) confirms++;
    });
    const any = "**/api/auth/password-reset**";
    const hold = async (matches: typeof request) => {
      let release!: () => void;
      const released = new Promise<void>((resolve) => (release = resolve));
      await page.route(any, async (route) => {
        if (!matches(route.request())) return route.fallback();
        await released;
        await route.continue();
      });
      return release;
    };
    const fail = async (matches: typeof request, status: number, body: object | string) => {
      await page.route(any, (route) =>
        matches(route.request())
          ? route.fulfill(typeof body === "string" ? { status, body } : { status, json: body })
          : route.fallback(),
      );
    };
    await use({
      requests: () => requests,
      holdRequest: () => hold(request),
      failRequest: () => fail(request, 503, { code: "email_failed" }),
      recoverRequest: () => page.unroute(any),
      confirms: () => confirms,
      holdConfirm: () => hold(confirm),
      failConfirm: () => fail(confirm, 500, ""),
      recoverConfirm: () => page.unroute(any),
      holdCheck: () => hold(check),
      failCheck: () => fail(check, 500, ""),
      recoverCheck: () => page.unroute(any),
    });
  },
  invitationsApi: async ({ page }, use) => {
    const read = "**/api/invitations/*";
    const accept = "**/api/invitations/*/accept";
    let accepts = 0;
    page.on("request", (request) => {
      if (
        request.method() === "POST" &&
        /^\/api\/invitations\/[^/]+\/accept$/.test(
          new URL(request.url()).pathname,
        )
      )
        accepts++;
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
          route.request().method() === "GET"
            ? route.fulfill({ status: 500, body: "" })
            : route.fallback(),
        );
      },
      recoverRead: () => page.unroute(read),
      failAccept: async () => {
        await page.route(accept, (route) =>
          route.fulfill({ status: 500, body: "" }),
        );
      },
    });
  },
  membersApi: async ({ page }, use) => {
    const pattern = "**/api/team/members";
    let count = 0;
    page.on("request", (request) => {
      if (
        request.method() === "POST" &&
        new URL(request.url()).pathname === "/api/team/members"
      )
        count++;
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
        await page.route(pattern, (route) =>
          route.fulfill({ status: 500, body: "" }),
        );
      },
    });
  },
  teamApi: async ({ page }, use) => {
    const pattern = "**/api/teams";
    let count = 0;
    page.on("request", (request) => {
      if (
        request.method() === "POST" &&
        new URL(request.url()).pathname === "/api/teams"
      )
        count++;
    });
    await use({
      requests: () => count,
      hold: async () => {
        await page.route(pattern, () => new Promise<void>(() => {}));
      },
      fail: async () => {
        await page.route(pattern, (route) =>
          route.fulfill({ status: 500, body: "" }),
        );
      },
    });
  },
  sheetApi: async ({ page }, use) => {
    const pattern = "**/api/sheet**";
    await use({
      fail: async () => {
        await page.route(pattern, (route) =>
          route.fulfill({ status: 500, body: "" }),
        );
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
          route.request().method() === "PUT"
            ? route.fulfill({ status: 500, body: "" })
            : route.fallback(),
        );
      },
      recoverSaves: () => page.unroute("**/api/sheet/days"),
      holdSaves: async () => {
        let release!: () => void;
        const released = new Promise<void>((resolve) => (release = resolve));
        await page.route("**/api/sheet/days", async (route) => {
          if (route.request().method() !== "PUT") return route.fallback();
          await released;
          await route.continue();
        });
        return release;
      },
      onlyMe: async () => {
        await page.route(pattern, async (route) => {
          const response = await route.fetch();
          const month = await response.json();
          month.members = month.members.filter(
            (m: { isYou: boolean }) => m.isYou,
          );
          await route.fulfill({ response, json: month });
        });
      },
    });
  },
  pages: async ({ page }, use) => {
    await use({
      accountMenu: new AccountMenu(page),
      acceptInvite: new AcceptInvitePage(page),
      forgotPassword: new ForgotPasswordPage(page),
      resetPassword: new ResetPasswordPage(page),
      editWorkingDays: new EditWorkingDaysDialog(page),
      addHoliday: new AddHolidayDialog(page),
      removeHoliday: new RemoveHolidayDialog(page),
      calendar: new CalendarPage(page),
      createTeam: new CreateTeamPage(page),
      inviteMember: new InviteMemberDialog(page),
      newRequest: new NewRequestDialog(page),
      marketing: new MarketingPage(page),
      notFound: new NotFoundPage(page),
      requestDetail: new RequestDetailDialog(page),
      declineRequest: new DeclineRequestDialog(page),
      cancelRequest: new CancelRequestDialog(page),
      requests: new RequestsPage(page),
      settings: new SettingsPage(page),
      sessionExpired: new SessionExpiredPage(page),
      signIn: new SignInPage(page),
      signOutDialog: new SignOutDialog(page),
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
