/**
 * Accounts and reset links for the reset-password specs, made through the real API.
 *
 * Resetting changes a password, so a spec never uses a seeded person: `newAccount` invites a fresh
 * address and accepts the invitation, which gives an account with a known password on the viewport's
 * inviter team. The reset link exists only in the email, and the e2e API writes each email to its log
 * (ADR-006), so `resetToken` reads the token out of that log, as `invitationToken` does.
 */

import { APIRequestContext } from "@playwright/test";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { freshEmail, invite } from "./invitation.js";
import { API_BASE_URL, Person } from "./session.js";

const LOG = resolve(__dirname, "../../.run/logs/e2e-api.out.log");

export const OLD_PASSWORD = "old-secret-1234";
export const NEW_PASSWORD = "new-secret-5678";

export interface Account {
  name: string;
  email: string;
}

/** A person with an account and `OLD_PASSWORD`, invited by `inviter` and joined through the real API. */
export async function newAccount(request: APIRequestContext, inviter: Person, name = "Reset Tester"): Promise<Account> {
  const email = freshEmail("reset");
  const invitation = await invite(request, inviter, name, email);
  const response = await request.post(`${API_BASE_URL}/api/invitations/${invitation.token}/accept`, {
    data: { name, password: OLD_PASSWORD },
  });
  if (!response.ok()) throw new Error(`Accepting the invitation for ${email} failed with ${response.status()}.`);
  return { name, email };
}

/** Asks the API for a reset link for `email`, as the forgot-password page does, and returns its token. */
export async function requestResetLink(request: APIRequestContext, email: string): Promise<string> {
  const before = (await emailsTo(email)).length;
  const response = await request.post(`${API_BASE_URL}/api/auth/password-reset`, { data: { email } });
  if (!response.ok()) throw new Error(`Requesting a reset link for ${email} failed with ${response.status()}.`);
  return resetToken(email, before);
}

/** The token in the newest reset email logged for `email` after the first `skip`; waits briefly for the logger. */
export async function resetToken(email: string, skip = 0): Promise<string> {
  for (let attempt = 0; attempt < 50; attempt++) {
    const found = await emailsTo(email);
    if (found.length > skip) return found[found.length - 1];
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  throw new Error(`No reset email for ${email} in ${LOG}. Is the e2e API running (eng/Start-E2eApi.ps1)?`);
}

/** Uses the link up through the API, as a person who opened it earlier would. */
export async function useLink(request: APIRequestContext, token: string, password: string): Promise<void> {
  const response = await request.post(`${API_BASE_URL}/api/auth/password-reset/confirm`, {
    data: { token, password, confirmPassword: password },
  });
  if (!response.ok()) throw new Error(`Using the reset link failed with ${response.status()}.`);
}

/** The status of signing in with `password`: 200 when it is the current one, 401 when it is not. */
export async function signInStatus(request: APIRequestContext, email: string, password: string): Promise<number> {
  return (await request.post(`${API_BASE_URL}/api/auth/sign-in`, { data: { email, password } })).status();
}

async function emailsTo(email: string): Promise<string[]> {
  const escaped = email.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const pattern = new RegExp(`Email to ${escaped}:(?:(?!Email to )[\\s\\S])*?/reset-password/([A-Za-z0-9_-]+)`, "g");
  const log = await readFile(LOG, "utf8").catch(() => "");
  return [...log.matchAll(pattern)].map((m) => m[1]);
}
