import { Injectable } from '@angular/core';

import { SESSION_KEY, SessionStore } from './session-store';

/** Keeps the token in localStorage so a reload stays signed in. Storage can be unavailable; then there is no session. */
@Injectable({ providedIn: 'root' })
export class LocalStorageSessionStore implements SessionStore {
  token(): string | null {
    try {
      return globalThis.localStorage?.getItem(SESSION_KEY) ?? null;
    } catch {
      return null;
    }
  }

  setToken(token: string): void {
    try {
      globalThis.localStorage?.setItem(SESSION_KEY, token);
    } catch {
      // Private mode or blocked storage: the session lasts as long as nothing reloads.
    }
  }

  clear(): void {
    try {
      globalThis.localStorage?.removeItem(SESSION_KEY);
    } catch {
      // Nothing to clear.
    }
  }
}
