import { InjectionToken } from '@angular/core';
import { Observable } from 'rxjs';

import { Session } from '../models/session';

/** What a sign-in attempt came to. */
export type SignInResult =
  | { readonly outcome: 'signed-in'; readonly session: Session }
  /** Email or password doesn't match (code `invalid_credentials`); which one is never said. */
  | { readonly outcome: 'invalid-credentials' }
  /** The API could not be reached or failed. */
  | { readonly outcome: 'failed' };

/** What asking for a password reset link came to. */
export type RequestPasswordResetResult =
  /** The same answer whether or not the address has an account. */
  | { readonly outcome: 'sent' }
  /** The email could not be sent (code `email_failed`), or the API could not be reached. */
  | { readonly outcome: 'failed' };

/** What opening a reset link came to. */
export type CheckResetLinkResult =
  | { readonly outcome: 'open' }
  /** Used, past its hour or never issued (410 `reset_link_expired`); which of them is never said. */
  | { readonly outcome: 'expired' }
  /** The API could not be reached or failed. */
  | { readonly outcome: 'failed' };

/** What choosing a new password came to. */
export type ResetPasswordResult =
  | { readonly outcome: 'updated' }
  /** The link is used, past its hour or was never issued (410 `reset_link_expired`). */
  | { readonly outcome: 'expired' }
  /** Nothing changed: the API failed, could not be reached or refused the request. */
  | { readonly outcome: 'failed' };

/**
 * Signing in (identity-and-access/sign-in) and resetting a forgotten password
 * (identity-and-access/reset-password). A successful sign-in stores the session.
 */
export interface AuthService {
  signIn(email: string, password: string): Observable<SignInResult>;
  requestPasswordReset(email: string): Observable<RequestPasswordResetResult>;
  checkResetLink(token: string): Observable<CheckResetLinkResult>;
  resetPassword(
    token: string,
    password: string,
    confirmPassword: string,
  ): Observable<ResetPasswordResult>;
}

export const AUTH_SERVICE = new InjectionToken<AuthService>('AUTH_SERVICE');
