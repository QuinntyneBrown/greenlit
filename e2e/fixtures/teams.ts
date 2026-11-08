/**
 * The teams a manager runs (L2-054, docs/detailed-designs/teams/switch-team), read and put back through the real API,
 * so every several-teams spec starts with Design team as the default.
 */

import { APIRequestContext } from "@playwright/test";
import { API_BASE_URL, Person, forgetSignIn, signIn } from "./session.js";

export interface ManagedTeam {
  id: string;
  name: string;
  active: boolean;
  isDefault: boolean;
}

/** The teams `manager` manages, oldest first (GET /api/teams/mine). */
export async function managedTeams(request: APIRequestContext, manager: Person): Promise<ManagedTeam[]> {
  const token = await signIn(request, manager);
  const response = await request.get(`${API_BASE_URL}/api/teams/mine`, { headers: { Authorization: `Bearer ${token}` } });
  if (!response.ok()) throw new Error(`Reading the teams failed with ${response.status()}.`);
  return (await response.json()) as ManagedTeam[];
}

/** Makes the team called `name` the default team of `manager` (PUT /api/teams/default). */
export async function makeDefault(request: APIRequestContext, manager: Person, name: string): Promise<void> {
  const team = (await managedTeams(request, manager)).find((t) => t.name === name);
  if (!team) throw new Error(`${manager} manages no team called ${name}.`);
  const token = await signIn(request, manager);
  const response = await request.put(`${API_BASE_URL}/api/teams/default`, {
    headers: { Authorization: `Bearer ${token}` },
    data: { teamId: team.id },
  });
  if (!response.ok()) throw new Error(`Making ${name} the default failed with ${response.status()}.`);
}

/**
 * Puts `manager` back on Design team: the default again, and the next sign-in (which `goto` makes) a fresh one that
 * names it, so a run that switched or changed the default never leaks into the next test.
 */
export async function resetTeams(request: APIRequestContext, manager: Person): Promise<void> {
  await makeDefault(request, manager, "Design team");
  forgetSignIn(manager);
}
