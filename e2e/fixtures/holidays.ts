/**
 * Arranges holidays for a spec through the real API as a team's manager, so a spec that removes one starts from
 * a holiday it owns instead of the seeded ones. Safe to run again: a date that already is a holiday is left, and a
 * removed one comes back under the name.
 */

import { APIRequestContext } from "@playwright/test";
import { Day } from "./dates.js";
import { API_BASE_URL, Person, signIn } from "./session.js";

export async function ensureDayOff(request: APIRequestContext, manager: Person, day: Day, name: string): Promise<void> {
  const token = await signIn(request, manager);
  // 201 adds it (or revives it); 409 `holiday_exists` means an earlier run did.
  await request.post(`${API_BASE_URL}/api/team/holidays`, {
    headers: { Authorization: `Bearer ${token}` },
    data: { date: day.iso, name },
  });
}
