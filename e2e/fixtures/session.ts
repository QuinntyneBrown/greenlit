/**
 * Signed-in sessions for the e2e run.
 *
 * The app keeps the bearer token in localStorage under SESSION_KEY (the `api`
 * library's LocalStorageSessionStore). `signIn` gets that token the way the
 * sign-in page does, from POST /api/auth/sign-in on the e2e API, as a person
 * the demo seed creates (backend/src/Greenlit.Cli/Seed) with the demo
 * password. The sign-in specs drive the page itself; every other spec starts
 * signed in through this.
 */

import { APIRequestContext } from "@playwright/test";

export const SESSION_KEY = "greenlit.session";

/** The e2e API the Angular dev build talks to (environment.apiBaseUrl). */
export const API_BASE_URL = "http://localhost:5100";

/** The password `greenlit seed` gives every demo account (SeedCommandHandler.DemoPassword). */
export const DEMO_PASSWORD = "greenlit-demo";

/** The seeded people a test can sign in as. */
export const PEOPLE = {
  manager: { name: "Maya Chen", email: "maya@northwind.studio" },
  member: { name: "Ana Ruiz", email: "ana@northwind.studio" },
  /** On no team: opens create-team and never creates one. */
  newcomer: { name: "Noor Haddad", email: "noor@northwind.studio" },
  /** On no team until the create-team spec creates one, one per viewport (see `creatorFor`). */
  "creator-mobile": { name: "Priya Shah", email: "priya@northwind.studio" },
  "creator-tablet": { name: "Sam Lee", email: "sam@northwind.studio" },
  "creator-desktop": { name: "Tomás Silva", email: "tomas@northwind.studio" },
  /** Manage a team of their own for the invite spec, one per viewport (see `inviterFor`). */
  "inviter-mobile": { name: "Uma Singh", email: "uma@northwind.studio" },
  "inviter-tablet": { name: "Vic Alvarez", email: "vic@northwind.studio" },
  "inviter-desktop": { name: "Wren Fox", email: "wren@northwind.studio" },
  /** Manage a team of their own for the remove-a-member spec, one per viewport (see `removerFor`). */
  "remover-mobile": { name: "Xavi Moreno", email: "xavi@northwind.studio" },
  "remover-tablet": { name: "Yara Khan", email: "yara@northwind.studio" },
  "remover-desktop": { name: "Zoe Lind", email: "zoe@northwind.studio" },
} as const;

export type Person = keyof typeof PEOPLE;

/**
 * The newcomer who creates a team in this viewport's project. Each creates one
 * team per e2e database, so a second run needs a fresh one (eng/Start-E2eApi.ps1).
 */
export function creatorFor(project: string): Person {
  const person = `creator-${project}`;
  if (!(person in PEOPLE)) throw new Error(`No seeded creator for the '${project}' project.`);
  return person as Person;
}

/**
 * The manager of the team this viewport's project invites people to. Invited people cannot be
 * removed again yet, so the invite spec uses a team of its own per viewport instead of the demo team.
 */
export function inviterFor(project: string): Person {
  const person = `inviter-${project}`;
  if (!(person in PEOPLE)) throw new Error(`No seeded inviter for the '${project}' project.`);
  return person as Person;
}

/**
 * The manager of the team this viewport's project removes people from. Removal is destructive, so the
 * remove-a-member spec never touches the demo team: each viewport has a team of its own.
 */
export function removerFor(project: string): Person {
  const person = `remover-${project}`;
  if (!(person in PEOPLE)) throw new Error(`No seeded remover for the '${project}' project.`);
  return person as Person;
}

/** Tokens last eight hours (ADR-004), so one sign-in per person serves the whole run. */
const tokens = new Map<Person, string>();

/** Forgets the cached token, so the next `signIn` asks again, e.g. after the person has joined a team. */
export function forgetSignIn(person: Person): void {
  tokens.delete(person);
}

/** A bearer token for `person` from the real sign-in endpoint. */
export async function signIn(request: APIRequestContext, person: Person): Promise<string> {
  const cached = tokens.get(person);
  if (cached) return cached;
  const response = await request.post(`${API_BASE_URL}/api/auth/sign-in`, {
    data: { email: PEOPLE[person].email, password: DEMO_PASSWORD },
  });
  if (!response.ok()) {
    throw new Error(
      `Signing in as ${PEOPLE[person].email} failed with ${response.status()}. Is the e2e API up and seeded (eng/Start-E2eApi.ps1)?`,
    );
  }
  const token = ((await response.json()) as { accessToken: string }).accessToken;
  tokens.set(person, token);
  return token;
}

/**
 * A token whose time has run out, as a browser would still have it in localStorage hours after signing in.
 * Only the expiry is read by the app; the API is never asked to accept it.
 */
export function expiredToken(): string {
  const encode = (value: object) => Buffer.from(JSON.stringify(value)).toString("base64url");
  const exp = Math.floor(Date.now() / 1000) - 60;
  return `${encode({ alg: "HS256", typ: "JWT" })}.${encode({ sub: "expired", role: "Manager", exp })}.signature`;
}
