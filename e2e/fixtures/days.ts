/**
 * Puts the demo team's days back after a spec has painted some: the e2e API's
 * database is shared by every viewport and every spec, so a spec that marks days
 * clears the ones it touched through the real API as the manager.
 */

import { APIRequestContext } from "@playwright/test";
import { API_BASE_URL, Person, signIn } from "./session.js";

interface Month {
  members: { id: string; name: string }[];
}

/** Clears `dates` (`yyyy-MM-dd`) on `member`'s row, whatever status they hold. */
export async function clearDays(request: APIRequestContext, member: string, dates: string[]): Promise<void> {
  const token = await signIn(request, "manager" satisfies Person);
  const headers = { Authorization: `Bearer ${token}` };
  const month = (await (await request.get(`${API_BASE_URL}/api/sheet?month=${dates[0].slice(0, 7)}`, { headers })).json()) as Month;
  const memberId = month.members.find((m) => m.name === member)?.id;
  if (!memberId) throw new Error(`No member named ${member} on the demo team.`);
  // Weekends answer 400; the working days among `dates` are cleared and the rest are left as they are.
  await request.put(`${API_BASE_URL}/api/sheet/days`, { headers, data: { memberId, dates, status: null } });
}
