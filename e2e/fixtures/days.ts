/**
 * Puts the demo team's days back after a spec has painted some: the e2e API's
 * database is shared by every viewport and every spec, so a spec that marks days
 * clears the ones it touched through the real API as the manager (Maya, unless `as` names another).
 */

import { APIRequestContext } from "@playwright/test";
import { API_BASE_URL, Person, signIn } from "./session.js";

interface Month {
  members: { id: string; name: string }[];
}

/** Clears `dates` (`yyyy-MM-dd`) on `member`'s row, whatever status they hold. */
export async function clearDays(
  request: APIRequestContext,
  member: string,
  dates: string[],
  as: Person = "manager",
): Promise<void> {
  const token = await signIn(request, as);
  const headers = { Authorization: `Bearer ${token}` };
  const month = (await (await request.get(`${API_BASE_URL}/api/sheet?month=${dates[0].slice(0, 7)}`, { headers })).json()) as Month;
  const memberId = month.members.find((m) => m.name === member)?.id;
  if (!memberId) throw new Error(`No member named ${member} on the team.`);
  // Weekends answer 400; the working days among `dates` are cleared and the rest are left as they are.
  await request.put(`${API_BASE_URL}/api/sheet/days`, { headers, data: { memberId, dates, status: null } });
}

/**
 * Sets `dates` (`yyyy-MM-dd`) on `member`'s row to `status` through the real API as the manager, to arrange a
 * year the seed does not hold. Weekends are left out by the API, so a run may include them.
 */
export async function paintDays(
  request: APIRequestContext,
  member: string,
  dates: string[],
  status: "Tentative" | "Requested" | "Confirmed",
  as: Person = "manager",
): Promise<void> {
  const token = await signIn(request, as);
  const headers = { Authorization: `Bearer ${token}` };
  const month = (await (await request.get(`${API_BASE_URL}/api/sheet?month=${dates[0].slice(0, 7)}`, { headers })).json()) as Month;
  const memberId = month.members.find((m) => m.name === member)?.id;
  if (!memberId) throw new Error(`No member named ${member} on the team.`);
  const response = await request.put(`${API_BASE_URL}/api/sheet/days`, { headers, data: { memberId, dates, status } });
  if (!response.ok()) throw new Error(`Painting ${member} ${status} answered ${response.status()}.`);
}

/** The weekdays from `first` to `last` (`yyyy-MM-dd`, inclusive). */
export function weekdays(first: string, last: string): string[] {
  const days: string[] = [];
  for (let d = new Date(`${first}T00:00:00Z`); d <= new Date(`${last}T00:00:00Z`); d.setUTCDate(d.getUTCDate() + 1)) {
    if (d.getUTCDay() !== 0 && d.getUTCDay() !== 6) days.push(d.toISOString().slice(0, 10));
  }
  return days;
}
