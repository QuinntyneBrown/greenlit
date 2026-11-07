/**
 * Finds a person's id for a spec through the real API, so a spec can open their page by name
 * (docs/detailed-designs/allowances/person-page).
 */

import { APIRequestContext } from "@playwright/test";
import { API_BASE_URL, Person, signIn } from "./session.js";

/** The id of `name` on the viewer's team, as the viewer's year lists it. */
export async function personIdOf(request: APIRequestContext, viewer: Person, name: string): Promise<string> {
  const token = await signIn(request, viewer);
  const year = (await (
    await request.get(`${API_BASE_URL}/api/year?year=2026`, { headers: { Authorization: `Bearer ${token}` } })
  ).json()) as { members: { id: string; name: string }[] };
  const id = year.members.find((m) => m.name === name)?.id;
  if (!id) throw new Error(`${name} is not on the team.`);
  return id;
}
