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
export type PageSlug = "accept-invite" | "calendar" | "create-team" | "not-found" | "requests" | "settings" | "sign-in";

interface RouteEntry {
  readonly app: string;
  readonly mock?: string;
  readonly guard?: RouteGuard;
  readonly page: PageSlug;
}

export const ROUTES = {
  acceptInvite: { app: "/accept-invite/:token", mock: "/pages/accept-invite/default.html", page: "accept-invite" },
  calendar: { app: "/", mock: "/pages/calendar/default.html", guard: "auth", page: "calendar" },
  createTeam: { app: "/create-team", mock: "/pages/create-team/default.html", guard: "auth", page: "create-team" },
  notFound: { app: "/no-such-page", mock: "/pages/not-found/default.html", page: "not-found" },
  requests: { app: "/requests", mock: "/pages/requests/default.html", guard: "manager", page: "requests" },
  settings: { app: "/settings", mock: "/pages/settings/default.html", guard: "auth", page: "settings" },
  signIn: { app: "/sign-in", mock: "/pages/sign-in/default.html", page: "sign-in" },
} as const satisfies Record<string, RouteEntry>;

export type RouteKey = keyof typeof ROUTES;

export const isBaseline = process.env.GL_BASELINE === "1";

export function pathFor(key: RouteKey): string {
  const entry: RouteEntry = ROUTES[key];
  if (!isBaseline) return entry.app;
  if (!entry.mock) throw new Error(`Route '${key}' has no mock page; it cannot be captured as a baseline.`);
  return entry.mock;
}

export function guardFor(key: RouteKey): RouteGuard | undefined {
  return (ROUTES[key] as RouteEntry).guard;
}
