/**
 * Arranges a team's Team section for a spec through the real API as its manager, so a spec that renames the team
 * or changes a row starts from known values and puts them back (docs/detailed-designs/teams/team-settings).
 */

import { APIRequestContext } from "@playwright/test";
import { API_BASE_URL, Person, signIn } from "./session.js";

interface TeamSectionRow {
  id: string;
  name: string;
  role: string;
  yearlyDays: number | null;
}

interface TeamSection {
  name: string;
  timeZone: string;
  members: TeamSectionRow[];
}

/** The Team section as the manager sees it (GET /api/team/settings/team). */
export async function readTeamSection(request: APIRequestContext, manager: Person): Promise<TeamSection> {
  const token = await signIn(request, manager);
  const response = await request.get(`${API_BASE_URL}/api/team/settings/team`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!response.ok()) throw new Error(`Reading the Team section failed with ${response.status()}.`);
  return (await response.json()) as TeamSection;
}

/** Puts the team back to `name`, London, everyone's role as is and nobody with days of their own. */
export async function resetTeamSection(request: APIRequestContext, manager: Person, name: string): Promise<void> {
  const token = await signIn(request, manager);
  const section = await readTeamSection(request, manager);
  const response = await request.put(`${API_BASE_URL}/api/team/settings/team`, {
    headers: { Authorization: `Bearer ${token}` },
    data: {
      name,
      timeZone: "Europe/London",
      members: section.members.map((m) => ({ id: m.id, role: m.role, yearlyDays: null })),
    },
  });
  if (!response.ok()) throw new Error(`Resetting the Team section failed with ${response.status()}.`);
}
