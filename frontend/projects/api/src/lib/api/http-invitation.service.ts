import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, catchError, map, of, tap } from 'rxjs';

import { Invitation } from '../models/invitation';
import { Session } from '../models/session';
import { API_BASE_URL, apiUrl } from './api-base-url';
import {
  AcceptInvitationResult,
  AcceptWithGoogleResult,
  GetInvitationResult,
  InvitationService,
  JoinWithAccountResult,
} from './invitation.service';
import { problemCode } from './problem';
import { SESSION_STORE } from './session-store';

/**
 * GET /api/invitations/{token}, POST .../accept, .../accept-google, .../sign-in and .../join; joining keeps the new
 * session in the session store.
 */
@Injectable({ providedIn: 'root' })
export class HttpInvitationService implements InvitationService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = inject(API_BASE_URL);
  private readonly store = inject(SESSION_STORE);

  get(token: string): Observable<GetInvitationResult> {
    return this.http.get<Invitation>(this.url(token)).pipe(
      map((invitation): GetInvitationResult => ({ outcome: 'open', invitation })),
      catchError((error: unknown) => {
        const expired = expiredOutcome(error);
        return of<GetInvitationResult>(expired ?? { outcome: 'failed' });
      }),
    );
  }

  accept(token: string, name: string, password: string): Observable<AcceptInvitationResult> {
    return this.http.post<Session>(`${this.url(token)}/accept`, { name, password }).pipe(
      tap((session) => this.store.setToken(session.accessToken)),
      map((session): AcceptInvitationResult => ({ outcome: 'joined', session })),
      catchError((error: unknown) => {
        const expired = expiredOutcome(error);
        if (expired) return of<AcceptInvitationResult>(expired);
        return of<AcceptInvitationResult>({
          outcome: problemCode(error) === 'account_exists' ? 'exists' : 'failed',
        });
      }),
    );
  }

  acceptWithGoogle(token: string, accessToken: string): Observable<AcceptWithGoogleResult> {
    return this.http.post<Session>(`${this.url(token)}/accept-google`, { accessToken }).pipe(
      tap((session) => this.store.setToken(session.accessToken)),
      map((session): AcceptWithGoogleResult => ({ outcome: 'joined', session })),
      catchError((error: unknown) => {
        const expired = expiredOutcome(error);
        if (expired) return of<AcceptWithGoogleResult>(expired);
        switch (problemCode(error)) {
          case 'google_email_mismatch':
            return of<AcceptWithGoogleResult>({ outcome: 'mismatch' });
          case 'google_email_unverified':
            return of<AcceptWithGoogleResult>({ outcome: 'unverified' });
          case 'account_exists':
            return of<AcceptWithGoogleResult>({ outcome: 'exists' });
          default:
            return of<AcceptWithGoogleResult>({ outcome: 'failed' });
        }
      }),
    );
  }

  signInAndJoin(token: string, password: string): Observable<JoinWithAccountResult> {
    return this.joining(this.http.post<Session>(`${this.url(token)}/sign-in`, { password }));
  }

  join(token: string): Observable<JoinWithAccountResult> {
    return this.joining(this.http.post<Session>(`${this.url(token)}/join`, null));
  }

  private joining(request: Observable<Session>): Observable<JoinWithAccountResult> {
    return request.pipe(
      tap((session) => this.store.setToken(session.accessToken)),
      map((session): JoinWithAccountResult => ({ outcome: 'joined', session })),
      catchError((error: unknown) => {
        const expired = expiredOutcome(error);
        if (expired) return of<JoinWithAccountResult>(expired);
        switch (problemCode(error)) {
          case 'invalid_credentials':
            return of<JoinWithAccountResult>({ outcome: 'wrong' });
          case 'invitation_other_account':
            return of<JoinWithAccountResult>({ outcome: 'other' });
          default:
            return of<JoinWithAccountResult>({ outcome: 'failed' });
        }
      }),
    );
  }

  private url(token: string): string {
    return apiUrl(this.baseUrl, `api/invitations/${encodeURIComponent(token)}`);
  }
}

/** 410 `invitation_expired` names the manager; 404 `invitation_not_found` names no one. */
function expiredOutcome(error: unknown): { outcome: 'expired'; managerName: string | null } | null {
  if (!(error instanceof HttpErrorResponse)) return null;
  const code = problemCode(error);
  if (error.status === 410 && code === 'invitation_expired') {
    const name = (error.error as { managerName?: unknown } | null)?.managerName;
    return { outcome: 'expired', managerName: typeof name === 'string' && name ? name : null };
  }
  if (error.status === 404 && code === 'invitation_not_found') {
    return { outcome: 'expired', managerName: null };
  }
  return null;
}
