import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, catchError, map, of, tap } from 'rxjs';

import { InvitedMember, NewMember } from '../models/invited-member';
import { CreatedTeam, NewTeam } from '../models/new-team';
import { API_BASE_URL, apiUrl } from './api-base-url';
import { problemCode } from './problem';
import { SESSION_STORE } from './session-store';
import { CreateTeamResult, InviteResult, RemoveMemberResult, TeamService } from './team.service';

/** POST /api/teams, POST /api/team/members and DELETE /api/team/members/{id}; creating a team keeps the new manager's session in the session store. */
@Injectable({ providedIn: 'root' })
export class HttpTeamService implements TeamService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = inject(API_BASE_URL);
  private readonly store = inject(SESSION_STORE);

  create(team: NewTeam): Observable<CreateTeamResult> {
    return this.http.post<CreatedTeam>(apiUrl(this.baseUrl, 'api/teams'), team).pipe(
      tap((created) => this.store.setToken(created.session.accessToken)),
      map((created): CreateTeamResult => ({ outcome: 'created', team: created })),
      catchError(() => of<CreateTeamResult>({ outcome: 'failed' })),
    );
  }

  invite(member: NewMember): Observable<InviteResult> {
    return this.http.post<InvitedMember>(apiUrl(this.baseUrl, 'api/team/members'), member).pipe(
      map((invited): InviteResult => ({ outcome: 'invited', member: invited })),
      catchError((error: unknown) =>
        of<InviteResult>({ outcome: problemCode(error) === 'member_exists' ? 'exists' : 'failed' }),
      ),
    );
  }

  remove(memberId: string): Observable<RemoveMemberResult> {
    return this.http
      .delete(apiUrl(this.baseUrl, `api/team/members/${encodeURIComponent(memberId)}`))
      .pipe(
        map((): RemoveMemberResult => ({ ok: true })),
        catchError(() => of<RemoveMemberResult>({ ok: false })),
      );
  }
}
