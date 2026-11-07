/**
 * Invitations for the accept-invitation spec, made through the real API.
 *
 * The link exists only in the email, and the e2e API writes each email to its log instead of
 * sending it (ADR-006), so `invitationToken` reads the token out of that log. `eng/Start-E2eApi.ps1`
 * redirects the API's output to `.run/logs/e2e-api.out.log`. Every call invites a fresh address, so a
 * spec can run again on the same database.
 */

import { APIRequestContext } from "@playwright/test";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { API_BASE_URL, Person, signIn } from "./session.js";

const LOG = resolve(__dirname, "../../.run/logs/e2e-api.out.log");

export interface Invitation {
  /** The token in the emailed link (`/accept-invite/{token}`). */
  token: string;
  /** The id of the member row the invitation put on the sheet. */
  memberId: string;
  name: string;
  email: string;
}

let counter = 0;

/** An address no earlier run has used. */
export function freshEmail(label: string): string {
  return `${label}.${Date.now().toString(36)}${(counter++).toString(36)}@northwind.studio`;
}

/** `inviter` (a manager) invites `name` at `email`; the token comes from the API log. */
export async function invite(
  request: APIRequestContext,
  inviter: Person,
  name: string,
  email: string,
  role: "Member" | "Manager" = "Member",
): Promise<Invitation> {
  const token = await signIn(request, inviter);
  const response = await request.post(`${API_BASE_URL}/api/team/members`, {
    headers: { Authorization: `Bearer ${token}` },
    data: { name, email, role },
  });
  if (!response.ok()) throw new Error(`Inviting ${email} failed with ${response.status()}.`);
  const member = (await response.json()) as { id: string };
  return { token: await invitationToken(email), memberId: member.id, name, email };
}

/** The token in the newest email logged for `email`; waits briefly for the logger to write it. */
export async function invitationToken(email: string): Promise<string> {
  const pattern = new RegExp(`Email to ${email.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}:[\\s\\S]*?/accept-invite/([A-Za-z0-9_-]+)`, "g");
  for (let attempt = 0; attempt < 50; attempt++) {
    const log = await readFile(LOG, "utf8").catch(() => "");
    const found = [...log.matchAll(pattern)];
    if (found.length) return found[found.length - 1][1];
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  throw new Error(`No invitation email for ${email} in ${LOG}. Is the e2e API running (eng/Start-E2eApi.ps1)?`);
}

/** Marks `dates` (`yyyy-MM-dd`) as tentative on `memberId`'s row, as the manager would. */
export async function paintDays(request: APIRequestContext, manager: Person, memberId: string, dates: string[]): Promise<void> {
  const token = await signIn(request, manager);
  const response = await request.put(`${API_BASE_URL}/api/sheet/days`, {
    headers: { Authorization: `Bearer ${token}` },
    data: { memberId, dates, status: "Tentative" },
  });
  if (!response.ok()) throw new Error(`Painting ${dates.join(", ")} failed with ${response.status()}.`);
}

/** The invitee sets a password through the real API and gets the session the accept page would store. */
export async function join(request: APIRequestContext, invitation: Invitation, password: string): Promise<string> {
  const response = await request.post(`${API_BASE_URL}/api/invitations/${invitation.token}/accept`, {
    data: { name: invitation.name, password },
  });
  if (!response.ok()) throw new Error(`Accepting the invitation for ${invitation.email} failed with ${response.status()}.`);
  return ((await response.json()) as { accessToken: string }).accessToken;
}

/** What the API answers to a sign-in: the status and, for a failure, its ProblemDetails `code`. */
export async function trySignIn(
  request: APIRequestContext,
  email: string,
  password: string,
): Promise<{ status: number; code: string | null }> {
  const response = await request.post(`${API_BASE_URL}/api/auth/sign-in`, { data: { email, password } });
  const body = response.ok() ? null : ((await response.json()) as { code?: string });
  return { status: response.status(), code: body?.code ?? null };
}

/** What the API answers to a request made with an earlier session token: the status and the failure's `code`. */
export async function tryWithSession(request: APIRequestContext, token: string): Promise<{ status: number; code: string | null }> {
  const response = await request.get(`${API_BASE_URL}/api/auth/me`, { headers: { Authorization: `Bearer ${token}` } });
  const body = response.ok() ? null : ((await response.json()) as { code?: string });
  return { status: response.status(), code: body?.code ?? null };
}
