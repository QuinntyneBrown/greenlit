/**
 * Requests for the approve spec, handled through the real API. The e2e database is shared by every
 * viewport and spec, so a spec that approves Ana's 16-20 Nov request puts it back to pending afterwards,
 * and a spec that adds a confirmed day clears it.
 */

import { APIRequestContext } from "@playwright/test";
import { readFile, stat } from "node:fs/promises";
import { resolve } from "node:path";
import { API_BASE_URL, signIn } from "./session.js";

const LOG = resolve(__dirname, "../../.run/logs/e2e-api.out.log");

interface Listed {
  id: string;
  memberName: string;
  firstDay: string;
}

/** Puts every approved request of `member` that starts on `firstDay` back to pending, as Undo does. */
export async function reopenApproved(request: APIRequestContext, member: string, firstDay: string): Promise<void> {
  const token = await signIn(request, "manager");
  const headers = { Authorization: `Bearer ${token}` };
  const approved = (await (await request.get(`${API_BASE_URL}/api/requests?status=Approved`, { headers })).json()) as Listed[];
  for (const r of approved.filter((a) => a.memberName === member && a.firstDay === firstDay)) {
    await request.post(`${API_BASE_URL}/api/requests/${r.id}/reopen`, { headers });
  }
}

/** Puts every declined request of `member` that starts on `firstDay` back to pending, as Undo does. */
export async function reopenDeclined(request: APIRequestContext, member: string, firstDay: string): Promise<void> {
  const token = await signIn(request, "manager");
  const headers = { Authorization: `Bearer ${token}` };
  const declined = (await (await request.get(`${API_BASE_URL}/api/requests?status=Declined`, { headers })).json()) as (Listed & { status: string })[];
  for (const r of declined.filter((a) => a.status === "Declined" && a.memberName === member && a.firstDay === firstDay)) {
    await request.post(`${API_BASE_URL}/api/requests/${r.id}/reopen`, { headers });
  }
}

/** Confirms `dates` (`yyyy-MM-dd`) on `memberId`'s row, as the manager would. */
export async function confirmDays(request: APIRequestContext, memberId: string, dates: string[]): Promise<void> {
  const token = await signIn(request, "manager");
  const response = await request.put(`${API_BASE_URL}/api/sheet/days`, {
    headers: { Authorization: `Bearer ${token}` },
    data: { memberId, dates, status: "Confirmed" },
  });
  if (!response.ok()) throw new Error(`Confirming ${dates.join(", ")} failed with ${response.status()}.`);
}

/** The id of the named member's row on the demo team. */
export async function memberId(request: APIRequestContext, name: string): Promise<string> {
  const token = await signIn(request, "manager");
  const month = (await (await request.get(`${API_BASE_URL}/api/sheet?month=2026-11`, { headers: { Authorization: `Bearer ${token}` } })).json()) as {
    members: { id: string; name: string }[];
  };
  const found = month.members.find((m) => m.name === name);
  if (!found) throw new Error(`No member named ${name} on the demo team.`);
  return found.id;
}

/** How long the API log is now, so a spec can read only what was logged after this point. */
export async function logMark(): Promise<number> {
  return (await stat(LOG).catch(() => ({ size: 0 }))).size;
}

/**
 * The emails the API logged to `address` since `mark` (ADR-006: the e2e API logs instead of sending),
 * each as its subject line followed by its text. Waits briefly for the logger to write.
 */
export async function emailsTo(address: string, mark: number): Promise<string[]> {
  const escaped = address.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const pattern = new RegExp(`Email to ${escaped}: ([\\s\\S]*?)(?=\\r?\\n(?:info|warn|fail|crit|dbug|trce):|$)`, "g");
  for (let attempt = 0; attempt < 50; attempt++) {
    const bytes = await readFile(LOG).catch(() => Buffer.alloc(0));
    const log = bytes.subarray(mark).toString("utf8");
    const found = [...log.matchAll(pattern)].map((m) => m[1]);
    if (found.length) return found;
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  return [];
}
