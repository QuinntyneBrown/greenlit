import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, catchError, map, of, tap } from 'rxjs';

import { Account } from '../models/account';
import { Session } from '../models/session';
import { API_BASE_URL, apiUrl } from './api-base-url';
import {
  AuthService,
  CheckResetLinkResult,
  RequestPasswordResetResult,
  ResetPasswordResult,
  SignInResult,
} from './auth.service';
import { problemCode } from './problem';
import { SESSION_STORE } from './session-store';

/** POST /api/auth/sign-in; keeps the token in the session store on success. */
@Injectable({ providedIn: 'root' })
export class HttpAuthService implements AuthService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = inject(API_BASE_URL);
  private readonly store = inject(SESSION_STORE);

  account(): Observable<Account | null> {
    return this.http
      .get<Account>(apiUrl(this.baseUrl, 'api/auth/me'))
      .pipe(catchError(() => of(null)));
  }

  signOut(): Observable<void> {
    return this.http.post<void>(apiUrl(this.baseUrl, 'api/auth/sign-out'), null).pipe(
      // The person asked to leave: a call that fails never keeps them signed in.
      catchError(() => of(undefined)),
      tap(() => this.store.clear()),
    );
  }

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

  checkResetLink(token: string): Observable<CheckResetLinkResult> {
    return this.http
      .get<void>(apiUrl(this.baseUrl, `api/auth/password-reset/${encodeURIComponent(token)}`))
      .pipe(
        map((): CheckResetLinkResult => ({ outcome: 'open' })),
        catchError((error: unknown) =>
          of<CheckResetLinkResult>(
            isExpired(error) ? { outcome: 'expired' } : { outcome: 'failed' },
          ),
        ),
      );
  }

  resetPassword(
    token: string,
    password: string,
    confirmPassword: string,
  ): Observable<ResetPasswordResult> {
    return this.http
      .post<void>(apiUrl(this.baseUrl, 'api/auth/password-reset/confirm'), {
        token,
        password,
        confirmPassword,
      })
      .pipe(
        map((): ResetPasswordResult => ({ outcome: 'updated' })),
        catchError((error: unknown) =>
          of<ResetPasswordResult>(
            isExpired(error) ? { outcome: 'expired' } : { outcome: 'failed' },
          ),
        ),
      );
  }
}

/** 410 `reset_link_expired`: the link is used, past its hour or was never issued. */
function isExpired(error: unknown): boolean {
  return (
    error instanceof HttpErrorResponse &&
    error.status === 410 &&
    problemCode(error) === 'reset_link_expired'
  );
}
