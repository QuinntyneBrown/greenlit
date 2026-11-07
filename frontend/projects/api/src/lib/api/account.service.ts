import { InjectionToken } from '@angular/core';
import { Observable } from 'rxjs';

import { Account } from '../models/account';

/** What saving the profile came to. */
export type UpdateProfileResult =
  /** Saved; the account as the API now has it. */
  | { readonly outcome: 'saved'; readonly account: Account }
  /** Another account uses the email (409 `email_taken`); nothing changed. */
  | { readonly outcome: 'email-taken' }
  /** Nothing changed: the API failed, could not be reached or refused the request. */
  | { readonly outcome: 'failed' };

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
  /** Saves the display name and the sign-in email. */
  updateProfile(displayName: string, email: string): Observable<UpdateProfileResult>;
  /** Changes the password; the current one must be right. */
  changePassword(current: string, next: string, confirm: string): Observable<ChangePasswordResult>;
}

export const ACCOUNT_SERVICE = new InjectionToken<AccountService>('ACCOUNT_SERVICE');
