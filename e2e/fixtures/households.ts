/**
 * Fresh people and teams for the several-teams and school-calendar specs (L2-055 to L2-062), made through the real
 * API so no seeded person's data changes. A fresh account comes from Continue with Google on the e2e API, whose fake
 * Google reader (ADR-012) accepts a made-up account: a new address becomes a new manager account on no team.
 */

import { APIRequestContext } from "@playwright/test";
import { invitationToken, freshEmail } from "./invitation.js";
import { API_BASE_URL } from "./session.js";

export interface FreshPerson {
  name: string;
  email: string;
  /** The latest session token: it names the team the person was last put on. */
  token: string;
}

function fakeGoogleToken(name: string, email: string): string {
  const account = { sub: `e2e-${email}`, email, name, email_verified: true };
  return "fake-google." + Buffer.from(JSON.stringify(account)).toString("base64url");
}

/** A new account called `name` on no team, signed in through Continue with Google. */
export async function freshPerson(request: APIRequestContext, name: string): Promise<FreshPerson> {
  const email = freshEmail(name.split(" ")[0].toLowerCase());
  return { name, email, token: await googleSession(request, name, email) };
}

/** A session for the account with `email` through Continue with Google (the sign-in team, L2-054 AC1, L2-056 AC4). */
export async function googleSession(request: APIRequestContext, name: string, email: string): Promise<string> {
  const response = await request.post(`${API_BASE_URL}/api/auth/google`, {
    data: { accessToken: fakeGoogleToken(name, email) },
  });
  if (!response.ok()) throw new Error(`Continue with Google as ${email} failed with ${response.status()}.`);
  return ((await response.json()) as { accessToken: string }).accessToken;
}

/** `person` creates a team called `name` with no one invited; their token then names it. Returns the team's id. */
export async function createTeam(request: APIRequestContext, person: FreshPerson, name: string): Promise<string> {
  const response = await request.post(`${API_BASE_URL}/api/teams`, {
    headers: { Authorization: `Bearer ${person.token}` },
    data: { name, timeZone: "Europe/London", holidayCountry: "GB", members: [] },
  });
  if (!response.ok()) throw new Error(`Creating ${name} failed with ${response.status()}.`);
  const created = (await response.json()) as { teamId: string; session: { accessToken: string } };
  person.token = created.session.accessToken;
  return created.teamId;
}

/** `manager` (on the team their token names) invites `email`; returns the invitation token from the API log. */
export async function inviteTo(request: APIRequestContext, manager: FreshPerson, name: string, email: string): Promise<string> {
  const response = await request.post(`${API_BASE_URL}/api/team/members`, {
    headers: { Authorization: `Bearer ${manager.token}` },
    data: { name, email, role: "Member" },
  });
  if (!response.ok()) throw new Error(`Inviting ${email} failed with ${response.status()}.`);
  return invitationToken(email);
}

/** The password fresh members choose when they accept an invitation. */
export const MEMBER_PASSWORD = "household-pass-1";

/**
 * A new person called `name` who is a member of `manager`'s active team and manages nothing: invited, then joined
 * with a password through the real API (L2-004).
 */
export async function freshMemberOf(request: APIRequestContext, manager: FreshPerson, name: string): Promise<FreshPerson> {
  const email = freshEmail(name.split(" ")[0].toLowerCase());
  const token = await inviteTo(request, manager, name, email);
  const response = await request.post(`${API_BASE_URL}/api/invitations/${token}/accept`, {
    data: { name, password: MEMBER_PASSWORD },
  });
  if (!response.ok()) throw new Error(`${email} could not join with ${response.status()}.`);
  return { name, email, token: ((await response.json()) as { accessToken: string }).accessToken };
}

/** Turns the school calendar of `manager`'s active team on (PUT /api/team/settings/school-calendar). */
export async function turnOnSchoolCalendar(request: APIRequestContext, manager: FreshPerson): Promise<void> {
  const response = await request.put(`${API_BASE_URL}/api/team/settings/school-calendar`, {
    headers: { Authorization: `Bearer ${manager.token}` },
    data: { schoolCalendar: true },
  });
  if (!response.ok()) throw new Error(`Turning the school calendar on failed with ${response.status()}.`);
}

/** Adds a child called `name` to `manager`'s active team (POST /api/team/children); returns the row's id. */
export async function addChild(request: APIRequestContext, manager: FreshPerson, name: string, email?: string): Promise<string> {
  const response = await request.post(`${API_BASE_URL}/api/team/children`, {
    headers: { Authorization: `Bearer ${manager.token}` },
    data: { name, email },
  });
  if (!response.ok()) throw new Error(`Adding ${name} failed with ${response.status()}.`);
  return ((await response.json()) as { id: string }).id;
}

/** Adds a closure on `manager`'s active team (POST /api/team/closures); `memberId` null is all children. */
export async function addClosure(
  request: APIRequestContext,
  manager: FreshPerson,
  label: string,
  firstDay: string,
  lastDay: string,
  memberId: string | null = null,
): Promise<string> {
  const response = await request.post(`${API_BASE_URL}/api/team/closures`, {
    headers: { Authorization: `Bearer ${manager.token}` },
    data: { label, firstDay, lastDay, memberId },
  });
  if (!response.ok()) throw new Error(`Adding the closure ${label} failed with ${response.status()}.`);
  return ((await response.json()) as { id: string }).id;
}

/** A school calendar file with one all-day event per `[summary, yyyy-MM-dd]` (RFC 5545, CRLF line ends). */
export function icsFile(events: [string, string][]): string {
  const day = (iso: string) => iso.replaceAll("-", "");
  const next = (iso: string) => {
    const d = new Date(`${iso}T00:00:00Z`);
    d.setUTCDate(d.getUTCDate() + 1);
    return d.toISOString().slice(0, 10);
  };
  const body = events
    .map(
      ([summary, date]) =>
        `BEGIN:VEVENT\r\nSUMMARY:${summary}\r\nDTSTART;VALUE=DATE:${day(date)}\r\nDTEND;VALUE=DATE:${day(next(date))}\r\nEND:VEVENT\r\n`,
    )
    .join("");
  return `BEGIN:VCALENDAR\r\nVERSION:2.0\r\nPRODID:-//Maple Grove PS//EN\r\n${body}END:VCALENDAR\r\n`;
}

/** Imports `text` as `memberId`'s school calendar on `manager`'s active team (L2-062). */
export async function importCalendar(request: APIRequestContext, manager: FreshPerson, memberId: string, text: string): Promise<void> {
  const response = await request.post(`${API_BASE_URL}/api/team/children/${memberId}/calendar`, {
    headers: { Authorization: `Bearer ${manager.token}` },
    multipart: { file: { name: "maple-grove.ics", mimeType: "text/calendar", buffer: Buffer.from(text, "utf8") } },
  });
  if (!response.ok()) throw new Error(`Importing the calendar failed with ${response.status()}.`);
}
