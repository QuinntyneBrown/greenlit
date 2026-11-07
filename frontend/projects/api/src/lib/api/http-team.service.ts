import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, catchError, map, of, tap } from 'rxjs';

import { CreatedTeam, NewTeam } from '../models/new-team';
import { API_BASE_URL, apiUrl } from './api-base-url';
import { SESSION_STORE } from './session-store';
import { CreateTeamResult, TeamService } from './team.service';

/** POST /api/teams; keeps the new manager's session in the session store on success. */
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
}
