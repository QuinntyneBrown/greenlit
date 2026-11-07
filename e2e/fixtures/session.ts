/**
 * Signed-in sessions for the e2e run, until sign-in (journey 2) lands.
 *
 * The app keeps the bearer token in localStorage under SESSION_KEY (the `api`
 * library's LocalStorageSessionStore). These helpers mint a token the e2e API
 * accepts: HS256, signed with the Development key from
 * backend/src/Greenlit.Api/appsettings.Development.json, for a user the demo
 * seed creates with a stable id (backend/src/Greenlit.Cli/Seed).
 */

import { createHmac } from "node:crypto";

export const SESSION_KEY = "greenlit.session";

const DEV_SIGNING_KEY = "dev-only-key-replace-in-non-dev-environments-via-env-var-please-32+bytes";
const ISSUER = "greenlit";
const AUDIENCE = "greenlit-clients";

/** The seeded people a test can sign in as. */
export const PEOPLE = {
  manager: { userId: "0d6f1c1e-7a3b-4c51-9a10-000000000001", name: "Maya Chen", role: "Manager" },
  member: { userId: "0d6f1c1e-7a3b-4c51-9a10-000000000002", name: "Ana Ruiz", role: "Member" },
} as const;

export type Person = keyof typeof PEOPLE;

function base64url(input: string | Buffer): string {
  return Buffer.from(input).toString("base64url");
}

/** A bearer token for `person`, valid for an hour. */
export function tokenFor(person: Person): string {
  const now = Math.floor(Date.now() / 1000);
  const header = base64url(JSON.stringify({ alg: "HS256", typ: "JWT" }));
  const payload = base64url(
    JSON.stringify({
      sub: PEOPLE[person].userId,
      role: PEOPLE[person].role,
      iss: ISSUER,
      aud: AUDIENCE,
      iat: now,
      nbf: now,
      exp: now + 3600,
    }),
  );
  const signature = createHmac("sha256", DEV_SIGNING_KEY).update(`${header}.${payload}`).digest("base64url");
  return `${header}.${payload}.${signature}`;
}
