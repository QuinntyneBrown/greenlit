import { InjectionToken } from '@angular/core';
import { Observable } from 'rxjs';

import { Account } from '../models/account';

/** What changing the password came to. */
export type ChangePasswordResult =
  | { readonly outcome: 'updated' }
  /** The current password was wrong (400 `current_password_wrong`); nothing changed. */
  | { readonly outcome: 'current-wrong' }
  /** Nothing changed: the API failed, could not be reached or refused the request. */
  | { readonly outcome: 'failed' };

/**
 * The signed-in person's own account (docs/detailed-designs/identity-and-access/manage-account, L2-005):
 * read it, save the profile, change the password.
 */
export interface AccountService {
  /** The account; null when it could not be read. */
  get(): Observable<Account | null>;
  /** Changes the password; the current one must be right. */
  changePassword(current: string, next: string, confirm: string): Observable<ChangePasswordResult>;
}

export const ACCOUNT_SERVICE = new InjectionToken<AccountService>('ACCOUNT_SERVICE');
