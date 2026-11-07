/**
 * Gives a seeded newcomer a team of their own through the real API, so a spec that adds people to a
 * team does not touch the demo team (nobody can be removed from it yet). Safe to run again: a person
 * who already manages a team keeps it.
 */

import { APIRequestContext } from "@playwright/test";
import { API_BASE_URL, Person, forgetSignIn, signIn } from "./session.js";

export async function ensureOwnTeam(request: APIRequestContext, person: Person, name: string): Promise<void> {
  const token = await signIn(request, person);
  // 201 creates the team; 409 `team_exists` means an earlier run did.
  await request.post(`${API_BASE_URL}/api/teams`, {
    headers: { Authorization: `Bearer ${token}` },
    data: { name, timeZone: "Europe/London", holidayCountry: "GB", members: [] },
  });
  // The earlier token names no team; the next sign-in does.
  forgetSignIn(person);
}

/**
 * Puts a second row on `manager`'s team through the real API, so the calendar shows a sheet instead of "No one on
 * the team yet". Safe to run again: inviting a pending address again only sends a new link.
 */
export async function ensureMember(request: APIRequestContext, manager: Person, name: string): Promise<void> {
  const token = await signIn(request, manager);
  await request.post(`${API_BASE_URL}/api/team/members`, {
    headers: { Authorization: `Bearer ${token}` },
    data: { name, email: `${name.toLowerCase().replace(/\s+/g, ".")}@holidays.example`, role: "Member" },
  });
}
