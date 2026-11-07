import { DOCUMENT } from '@angular/common';
import { Injectable, NgZone, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { GOOGLE_CLIENT_ID, GoogleIdentity, GoogleTokenResult } from './google-identity';

/** Where Google Identity Services comes from. The Playwright suite serves a stub at this address. */
export const GIS_SCRIPT_URL = 'https://accounts.google.com/gsi/client';

const SCOPE = 'openid email profile';

/** The part of Google Identity Services this uses (https://developers.google.com/identity/oauth2/web/reference/js-reference). */
interface TokenResponse {
  readonly access_token?: string;
  readonly error?: string;
}

interface TokenClientError {
  readonly type?: string;
}

interface TokenClient {
  requestAccessToken(overrides?: { prompt?: string }): void;
}

interface GoogleNamespace {
  accounts: {
    oauth2: {
      initTokenClient(config: {
        client_id: string;
        scope: string;
        prompt?: string;
        callback: (response: TokenResponse) => void;
        error_callback?: (error: TokenClientError) => void;
      }): TokenClient;
    };
  };
}

/**
 * Google Identity Services' OAuth 2.0 token client (ADR-012): loads the script once, on first use, and
 * opens Google's popup for each request. The popup being closed, or consent refused, is `dismissed`;
 * a script that will not load, or any other error, is `failed`.
 */
@Injectable({ providedIn: 'root' })
export class GisGoogleIdentity implements GoogleIdentity {
  private readonly document = inject(DOCUMENT);
  private readonly clientId = inject(GOOGLE_CLIENT_ID);
  private readonly zone = inject(NgZone);
  private script: Promise<GoogleNamespace> | null = null;

  requestAccessToken(): Observable<GoogleTokenResult> {
    return new Observable<GoogleTokenResult>((subscriber) => {
      let settled = false;
      const settle = (result: GoogleTokenResult) => {
        if (settled) return;
        settled = true;
        this.zone.run(() => {
          subscriber.next(result);
          subscriber.complete();
        });
      };
      this.load().then(
        (google) => {
          try {
            const client = google.accounts.oauth2.initTokenClient({
              client_id: this.clientId,
              scope: SCOPE,
              prompt: 'select_account',
              callback: (response) =>
                settle(
                  response.access_token
                    ? { outcome: 'token', accessToken: response.access_token }
                    : response.error === 'access_denied'
                      ? { outcome: 'dismissed' }
                      : { outcome: 'failed' },
                ),
              error_callback: (error) =>
                settle(
                  error.type === 'popup_closed' || error.type === 'access_denied'
                    ? { outcome: 'dismissed' }
                    : { outcome: 'failed' },
                ),
            });
            client.requestAccessToken();
          } catch {
            settle({ outcome: 'failed' });
          }
        },
        () => settle({ outcome: 'failed' }),
      );
    });
  }

  /** Google's script, added to the page once; a failed load is forgotten so the next attempt tries again. */
  private load(): Promise<GoogleNamespace> {
    const existing = (this.document.defaultView as (Window & { google?: GoogleNamespace }) | null)
      ?.google;
    if (existing?.accounts?.oauth2) return Promise.resolve(existing);
    this.script ??= new Promise<GoogleNamespace>((resolve, reject) => {
      const element = this.document.createElement('script');
      element.src = GIS_SCRIPT_URL;
      element.async = true;
      element.onload = () => {
        const google = (this.document.defaultView as (Window & { google?: GoogleNamespace }) | null)
          ?.google;
        if (google?.accounts?.oauth2) resolve(google);
        else reject(new Error('Google Identity Services did not load.'));
      };
      element.onerror = () => reject(new Error('Google Identity Services could not be loaded.'));
      this.document.head.appendChild(element);
    }).catch((error: unknown) => {
      this.script = null;
      throw error;
    });
    return this.script;
  }
}
