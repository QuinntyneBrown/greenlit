/**
 * Accounts for the Account specs, made through the real API.
 *
 * Changing a name, an email or a password must never touch a seeded person, so every spec starts from
 * `freshAccount`: a new member of the viewport's inviter team with a known password and a session token.
 */

import { APIRequestContext } from "@playwright/test";
import { Account, OLD_PASSWORD, newAccount } from "./password-reset.js";
import { API_BASE_URL, Person } from "./session.js";

export interface SignedInAccount extends Account {
  /** A bearer token for the account, for `goto(..., { session })`. */
  token: string;
}

/** A new member of `inviter`'s team called `name`, with `OLD_PASSWORD`, signed in through the real API. */
export async function freshAccount(request: APIRequestContext, inviter: Person, name = "Account Tester"): Promise<SignedInAccount> {
  const account = await newAccount(request, inviter, name);
  return { ...account, token: await tokenFor(request, account.email, OLD_PASSWORD) };
}

/** The bearer token of a sign-in, or throws. */
export async function tokenFor(request: APIRequestContext, email: string, password: string): Promise<string> {
  const response = await request.post(`${API_BASE_URL}/api/auth/sign-in`, { data: { email, password } });
  if (!response.ok()) throw new Error(`Signing in as ${email} failed with ${response.status()}.`);
  return ((await response.json()) as { accessToken: string }).accessToken;
}
