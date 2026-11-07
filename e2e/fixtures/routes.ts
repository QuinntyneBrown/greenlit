/**
 * Single source of truth for which URL serves each screen (and each static
 * screen *state*).
 *
 * - The Angular app uses the route table (`app.routes.ts`). Static states that
 *   the mocks render as separate files are reached through the dev-only
 *   `?state=` override (gated on `environment.galleryRoutes`, compile-time
 *   false in production).
 * - The mocks (`docs/mocks/pages/`) use `./pages/<name>.html`.
 * - `guard` records which session a route needs in the Angular app, so the
 *   `goto` fixture can sign in automatically. Mock pages have no auth.
 *
 * Tests reference routes by key; the fixture rewrites to the right URL
 * depending on whether we're capturing baselines (GL_BASELINE=1) or verifying
 * the Angular implementation.
 */

export type RouteGuard = "auth" | "manager";

/** `body[data-page]` value every screen stamps (route data in the app). */
export type PageSlug =
  | "account"
  | "accept-invite"
  | "calendar"
  | "create-team"
  | "forbidden"
  | "forgot-password"
  | "marketing"
  | "not-found"
  | "person"
  | "requests"
  | "server-error"
  | "reset-password"
  | "session-expired"
  | "settings"
  | "sign-in"
  | "year";

interface RouteEntry {
  readonly app: string;
  /** Another origin than the app's (the marketing site); prefixed to `app` outside baseline runs. */
  readonly origin?: string;
  readonly mock?: string;
  readonly guard?: RouteGuard;
  readonly page: PageSlug;
}

export const MARKETING_ORIGIN = "http://localhost:4300";

export const ROUTES = {
  acceptInvite: {
    app: "/accept-invite/:token",
    mock: "/pages/accept-invite/default.html",
    page: "accept-invite",
  },
  calendar: {
    app: "/",
    mock: "/pages/calendar/default.html",
    guard: "auth",
    page: "calendar",
  },
  createTeam: {
    app: "/create-team",
    mock: "/pages/create-team/default.html",
    guard: "auth",
    page: "create-team",
  },
  /** The marketing site: its own Angular application on :4300 (docs/detailed-designs/web-experience/marketing-page). */
  marketing: {
    app: "/",
    origin: MARKETING_ORIGIN,
    mock: "/pages/marketing/default.html",
    page: "marketing",
  },
  /** Where a member lands who opens a manager-only page. */
  forbidden: {
    app: "/forbidden",
    mock: "/pages/forbidden/default.html",
    guard: "auth",
    page: "forbidden",
  },
  forgotPassword: {
    app: "/forgot-password",
    mock: "/pages/forgot-password/default.html",
    page: "forgot-password",
  },
  notFound: {
    app: "/no-such-page",
    mock: "/pages/not-found/default.html",
    page: "not-found",
  },
  /** A person's page as the manager sees it: `:id` is a member's id (docs/detailed-designs/allowances/person-page). */
  person: {
    app: "/people/:id",
    mock: "/pages/person/default.html",
    guard: "auth",
    page: "person",
  },
  /** A member's own person page: read-only adjustments and "Request time off". */
  memberPerson: {
    app: "/people/:id",
    mock: "/pages/person/member.html",
    guard: "auth",
    page: "person",
  },
  /** "My time off" in the account menu: the signed-in person's own page. */
  myTimeOff: {
    app: "/person",
    mock: "/pages/person/member.html",
    guard: "auth",
    page: "person",
  },
  /** Requests as a member sees it: My requests (docs/detailed-designs/requests/my-requests). */
  myRequests: {
    app: "/requests",
    mock: "/pages/requests/member.html",
    guard: "auth",
    page: "requests",
  },
  requests: {
    app: "/requests",
    mock: "/pages/requests/default.html",
    guard: "manager",
    page: "requests",
  },
  /** Account, from the account menu (docs/detailed-designs/identity-and-access/manage-account). */
  account: {
    app: "/account",
    mock: "/pages/account/default.html",
    guard: "auth",
    page: "account",
  },
  /** The page the emailed reset link opens; `token` is the one in the link. */
  resetPassword: {
    app: "/reset-password/:token",
    mock: "/pages/reset-password/default.html",
    page: "reset-password",
  },
  /** Where a page that failed on the server lands, with the error reference in the address. */
  serverError: {
    app: "/server-error",
    mock: "/pages/server-error/default.html",
    page: "server-error",
  },
  /** Where an expired session lands (docs/detailed-designs/identity-and-access/sign-out). */
  sessionExpired: {
    app: "/session-expired",
    mock: "/pages/session-expired/default.html",
    page: "session-expired",
  },
  settings: {
    app: "/settings",
    mock: "/pages/settings/default.html",
    guard: "auth",
    page: "settings",
  },
  signIn: {
    app: "/sign-in",
    mock: "/pages/sign-in/default.html",
    page: "sign-in",
  },
  /** The team's year as the manager sees it: names link to person pages (docs/detailed-designs/allowances/year-overview). */
  year: {
    app: "/year",
    mock: "/pages/year/default.html",
    guard: "auth",
    page: "year",
  },
  /** The team's year as a member sees it: the member's row first, names not linked. */
  memberYear: {
    app: "/year",
    mock: "/pages/year/member.html",
    guard: "auth",
    page: "year",
  },
} as const satisfies Record<string, RouteEntry>;

export type RouteKey = keyof typeof ROUTES;

export const isBaseline = process.env.GL_BASELINE === "1";

export function pathFor(key: RouteKey): string {
  const entry: RouteEntry = ROUTES[key];
  if (!isBaseline) return `${entry.origin ?? ""}${entry.app}`;
  if (!entry.mock)
    throw new Error(
      `Route '${key}' has no mock page; it cannot be captured as a baseline.`,
    );
  // The mocks are served with docs/ as the root so their ../design-system imports resolve.
  return `/mocks${entry.mock}`;
}

export function guardFor(key: RouteKey): RouteGuard | undefined {
  return (ROUTES[key] as RouteEntry).guard;
}
