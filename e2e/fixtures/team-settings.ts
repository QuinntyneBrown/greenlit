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

interface AllowanceDefaults {
  defaultYearlyDays: number;
  leaveYearStartMonth: number;
  maxCarryOver: number;
}

/** The allowance defaults (GET /api/team/settings). */
export async function readAllowanceDefaults(request: APIRequestContext, manager: Person): Promise<AllowanceDefaults> {
  const token = await signIn(request, manager);
  const response = await request.get(`${API_BASE_URL}/api/team/settings`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!response.ok()) throw new Error(`Reading the allowance defaults failed with ${response.status()}.`);
  return (await response.json()) as AllowanceDefaults;
}

/** Puts the allowance defaults back to 25 days, a calendar year and 5 days of carry-over. */
export async function resetAllowanceDefaults(request: APIRequestContext, manager: Person): Promise<void> {
  const token = await signIn(request, manager);
  const response = await request.put(`${API_BASE_URL}/api/team/settings/allowances`, {
    headers: { Authorization: `Bearer ${token}` },
    data: { defaultYearlyDays: 25, leaveYearStartMonth: 1, maxCarryOver: 5 },
  });
  if (!response.ok()) throw new Error(`Resetting the allowance defaults failed with ${response.status()}.`);
}

/** Gives everyone on the team yearly days of their own except the last `count` rows, who use the default. */
export async function leaveWithoutAllowance(request: APIRequestContext, manager: Person, count: number): Promise<void> {
  const token = await signIn(request, manager);
  const section = await readTeamSection(request, manager);
  const response = await request.put(`${API_BASE_URL}/api/team/settings/team`, {
    headers: { Authorization: `Bearer ${token}` },
    data: {
      name: section.name,
      timeZone: section.timeZone,
      members: section.members.map((m, i) => ({
        id: m.id,
        role: m.role,
        yearlyDays: i < section.members.length - count ? 25 : null,
      })),
    },
  });
  if (!response.ok()) throw new Error(`Setting yearly days failed with ${response.status()}.`);
}
