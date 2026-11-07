/**
 * Arranges a team's coverage minimum for a spec through the real API as its manager, so a spec that sets it
 * starts from a known value and leaves its team as it found it (docs/detailed-designs/teams/coverage-minimum).
 */

import { APIRequestContext } from "@playwright/test";
import { API_BASE_URL, Person, signIn } from "./session.js";

/** Saves the team's coverage minimum (PUT /api/team/settings/coverage); 0 clears it. */
export async function setCoverageMinimum(request: APIRequestContext, manager: Person, minimum: number): Promise<void> {
  const token = await signIn(request, manager);
  const response = await request.put(`${API_BASE_URL}/api/team/settings/coverage`, {
    headers: { Authorization: `Bearer ${token}` },
    data: { minimum },
  });
  if (!response.ok()) throw new Error(`Setting the coverage minimum to ${minimum} failed with ${response.status()}.`);
}
