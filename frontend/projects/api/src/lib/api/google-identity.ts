import { InjectionToken } from '@angular/core';
import { Observable } from 'rxjs';

/** What asking Google for an access token came to (identity-and-access/sign-in-with-google, ADR-012). */
export type GoogleTokenResult =
  /** The person chose an account; the token is sent to the API once and never kept. */
  | { readonly outcome: 'token'; readonly accessToken: string }
  /** The person closed Google's window, or refused: nothing changes on the page. */
  | { readonly outcome: 'dismissed' }
  /** Google's script could not be loaded, or Google failed. */
  | { readonly outcome: 'failed' };

/** Google Identity Services' OAuth 2.0 token client behind a contract, so pages and tests never touch the script. */
export interface GoogleIdentity {
  /** Opens Google's account chooser and answers once. Loads Google's script on first use. */
  requestAccessToken(): Observable<GoogleTokenResult>;
}

export const GOOGLE_IDENTITY = new InjectionToken<GoogleIdentity>('GOOGLE_IDENTITY');

/** The OAuth 2.0 web client id, public and compiled in; the API checks every token against the same value. */
export const GOOGLE_CLIENT_ID = new InjectionToken<string>('GOOGLE_CLIENT_ID');
