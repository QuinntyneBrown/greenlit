/**
 * Arranges working days for a spec through the real API as a team's manager, so a spec that changes the work
 * week or a part-timer's days starts from known days and leaves its team as it found it
 * (docs/detailed-designs/teams/working-days).
 */

import { APIRequestContext } from "@playwright/test";
import { API_BASE_URL, Person, signIn } from "./session.js";

export type WeekDay = "Mon" | "Tue" | "Wed" | "Thu" | "Fri" | "Sat" | "Sun";

export const MON_TO_FRI: WeekDay[] = ["Mon", "Tue", "Wed", "Thu", "Fri"];
export const MON_TO_THU: WeekDay[] = ["Mon", "Tue", "Wed", "Thu"];

/** Saves the team's work week (PUT /api/team/settings/work-week). */
export async function setWorkWeek(request: APIRequestContext, manager: Person, days: WeekDay[]): Promise<void> {
  const token = await signIn(request, manager);
  await request.put(`${API_BASE_URL}/api/team/settings/work-week`, {
    headers: { Authorization: `Bearer ${token}` },
    data: { days },
  });
}

/** Saves the days the named member works (PUT /api/team/members/{id}/working-days). */
export async function setMemberDays(request: APIRequestContext, manager: Person, member: string, days: WeekDay[]): Promise<void> {
  const token = await signIn(request, manager);
  const headers = { Authorization: `Bearer ${token}` };
  const sheet = (await (await request.get(`${API_BASE_URL}/api/sheet`, { headers })).json()) as { members: { id: string; name: string }[] };
  const id = sheet.members.find((m) => m.name === member)?.id;
  if (!id) throw new Error(`${member} is not on the team.`);
  await request.put(`${API_BASE_URL}/api/team/members/${id}/working-days`, { headers, data: { days } });
}
