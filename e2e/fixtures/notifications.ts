/**
 * Arranges a team's two email switches for a spec through the real API as its manager, so a spec starts from
 * known values and leaves its team as it found it (docs/detailed-designs/teams/notification-settings).
 */

import { APIRequestContext } from "@playwright/test";
import { API_BASE_URL, Person, signIn } from "./session.js";

/** Saves the team's switches (PUT /api/team/settings/notifications). Both are on for a team that never changed them. */
export async function setNotifications(
  request: APIRequestContext,
  manager: Person,
  switches: { newRequests: boolean; decisions: boolean },
): Promise<void> {
  const token = await signIn(request, manager);
  const response = await request.put(`${API_BASE_URL}/api/team/settings/notifications`, {
    headers: { Authorization: `Bearer ${token}` },
    data: switches,
  });
  if (!response.ok()) throw new Error(`Setting the notifications failed with ${response.status()}.`);
}
