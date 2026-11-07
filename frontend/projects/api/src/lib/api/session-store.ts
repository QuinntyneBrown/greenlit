import { InjectionToken } from '@angular/core';

/** Where the bearer token lives in the browser. The e2e fixtures write the same key. */
export const SESSION_KEY = 'greenlit.session';

/**
 * The signed-in session: the bearer token the API expects. Sign-in
 * (identity-and-access/sign-in) writes it; the HTTP interceptor reads it.
 */
export interface SessionStore {
  token(): string | null;
  /** True while the stored token has not expired (ADR-004). */
  isSignedIn(): boolean;
  /** The team the session names; null while the person is on no team (teams/create-team). */
  teamId(): string | null;
  setToken(token: string): void;
  clear(): void;
}

export const SESSION_STORE = new InjectionToken<SessionStore>('SESSION_STORE');
