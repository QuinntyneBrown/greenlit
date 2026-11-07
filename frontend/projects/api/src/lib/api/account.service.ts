import { InjectionToken } from '@angular/core';
import { Observable } from 'rxjs';

import { Account } from '../models/account';

/**
 * The signed-in person's own account (docs/detailed-designs/identity-and-access/manage-account, L2-005):
 * read it, save the profile, change the password.
 */
export interface AccountService {
  /** The account; null when it could not be read. */
  get(): Observable<Account | null>;
}

export const ACCOUNT_SERVICE = new InjectionToken<AccountService>('ACCOUNT_SERVICE');
