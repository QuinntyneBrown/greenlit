import { Injectable, computed, inject, signal } from '@angular/core';

import { Account, AUTH_SERVICE, SESSION_STORE } from 'api';

/**
 * Who the account menu in the top bar names (docs/detailed-designs/identity-and-access/sign-out, L2-006).
 * Read again after every navigation inside the app. While the person is not known, or could not be read,
 * the menu still offers Sign out. Forgets the person when the session changes or ends.
 */
@Injectable({ providedIn: 'root' })
export class AccountState {
  private readonly auth = inject(AUTH_SERVICE);
  private readonly session = inject(SESSION_STORE);

  readonly account = signal<Account | null>(null);
  /** True when a session is live: signed-out visitors (not found) get no account menu. */
  readonly signedIn = signal(false);

  /** "Manager · maya@northwind.studio" */
  readonly detail = computed(() => {
    const account = this.account();
    return account ? `${account.role} · ${account.email}` : null;
  });

  private loadedFor: string | null = null;

  /** Reads who is signed in. */
  refresh(): void {
    const token = this.session.isSignedIn() ? this.session.token() : null;
    this.signedIn.set(token !== null);
    if (token !== this.loadedFor) this.account.set(null);
    this.loadedFor = token;
    if (token === null) return;
    this.auth.account().subscribe((account) => {
      if (this.loadedFor === token) this.account.set(account ?? this.account());
    });
  }

  /** Forgets the person: the session has ended. */
  clear(): void {
    this.loadedFor = null;
    this.account.set(null);
    this.signedIn.set(false);
  }
}
