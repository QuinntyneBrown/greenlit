import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, catchError, map, of } from 'rxjs';

import { SaveTeamSettingsInput, TeamSettingsTeam } from '../models/team-settings';
import { API_BASE_URL, apiUrl } from './api-base-url';
import { SaveSettingsResult, TeamSettingsService } from './team-settings.service';

/** GET and PUT /api/team/settings/team. */
@Injectable({ providedIn: 'root' })
export class HttpTeamSettingsService implements TeamSettingsService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = inject(API_BASE_URL);

  team(): Observable<TeamSettingsTeam> {
    return this.http.get<TeamSettingsTeam>(apiUrl(this.baseUrl, 'api/team/settings/team'));
  }

  saveTeam(input: SaveTeamSettingsInput): Observable<SaveSettingsResult> {
    return this.http.put(apiUrl(this.baseUrl, 'api/team/settings/team'), input).pipe(
      map((): SaveSettingsResult => ({ ok: true })),
      catchError(() => of<SaveSettingsResult>({ ok: false })),
    );
  }
}
