import { InjectionToken } from '@angular/core';
import { Observable } from 'rxjs';

import { Invitation } from '../models/invitation';
import { Session } from '../models/session';

/** What opening an invitation link came to. */
export type GetInvitationResult =
  | { readonly outcome: 'open'; readonly invitation: Invitation }
  /** Used, replaced, past seven days (410), or not recognised (404, `managerName` null). */
  | { readonly outcome: 'expired'; readonly managerName: string | null }
  /** The API could not be reached or failed. */
  | { readonly outcome: 'failed' };

/** What joining the team came to. A successful join stores the session. */
export type AcceptInvitationResult =
  | { readonly outcome: 'joined'; readonly session: Session }
  | { readonly outcome: 'expired'; readonly managerName: string | null }
  /** The invitation's email already has a Greenlit account (code `account_exists`). */
  | { readonly outcome: 'exists' }
  /** Nothing was created: the API failed, could not be reached, or refused the request. */
  | { readonly outcome: 'failed' };

/** What joining with Google came to (identity-and-access/sign-in-with-google). A successful join stores the session. */
export type AcceptWithGoogleResult =
  | { readonly outcome: 'joined'; readonly session: Session }
  | { readonly outcome: 'expired'; readonly managerName: string | null }
  /** The Google account's email is not the invited address (code `google_email_mismatch`). */
  | { readonly outcome: 'mismatch' }
  /** Google has not verified the account's email (code `google_email_unverified`). */
  | { readonly outcome: 'unverified' }
  /** The invited address already has a Greenlit account (code `account_exists`). */
  | { readonly outcome: 'exists' }
  /** Nothing was created: the API failed, could not be reached, or refused the token. */
  | { readonly outcome: 'failed' };

/** The invitee's side of an invitation (identity-and-access/accept-invitation, and sign-in-with-google). */
export interface InvitationService {
  get(token: string): Observable<GetInvitationResult>;
  accept(token: string, name: string, password: string): Observable<AcceptInvitationResult>;
  /** Joins with the Google account behind the access token, which must carry the invited address. */
  acceptWithGoogle(token: string, accessToken: string): Observable<AcceptWithGoogleResult>;
}

export const INVITATION_SERVICE = new InjectionToken<InvitationService>('INVITATION_SERVICE');
