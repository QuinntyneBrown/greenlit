import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, catchError, map, of, tap } from 'rxjs';

import { Session } from '../models/session';
import { API_BASE_URL, apiUrl } from './api-base-url';
import { AuthService, RequestPasswordResetResult, SignInResult } from './auth.service';
import { SESSION_STORE } from './session-store';

/** POST /api/auth/sign-in; keeps the token in the session store on success. */
@Injectable({ providedIn: 'root' })
export class HttpAuthService implements AuthService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = inject(API_BASE_URL);
  private readonly store = inject(SESSION_STORE);

  signIn(email: string, password: string): Observable<SignInResult> {
    return this.http
      .post<Session>(apiUrl(this.baseUrl, 'api/auth/sign-in'), { email, password })
      .pipe(
        tap((session) => this.store.setToken(session.accessToken)),
        map((session): SignInResult => ({ outcome: 'signed-in', session })),
        catchError((error: unknown) =>
          of<SignInResult>(
            error instanceof HttpErrorResponse &&
              error.status === 401 &&
              error.error?.code === 'invalid_credentials'
              ? { outcome: 'invalid-credentials' }
              : { outcome: 'failed' },
          ),
        ),
      );
  }

  requestPasswordReset(email: string): Observable<RequestPasswordResetResult> {
    return this.http.post<void>(apiUrl(this.baseUrl, 'api/auth/password-reset'), { email }).pipe(
      map((): RequestPasswordResetResult => ({ outcome: 'sent' })),
      catchError(() => of<RequestPasswordResetResult>({ outcome: 'failed' })),
    );
  }
}
