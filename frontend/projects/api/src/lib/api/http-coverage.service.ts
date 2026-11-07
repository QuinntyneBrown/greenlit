import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, catchError, map, of } from 'rxjs';

import { API_BASE_URL, apiUrl } from './api-base-url';
import { CoverageResult, CoverageService, CoverageSettings } from './coverage.service';

/** GET /api/team/settings and PUT /api/team/settings/coverage. */
@Injectable({ providedIn: 'root' })
export class HttpCoverageService implements CoverageService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = inject(API_BASE_URL);

  settings(): Observable<CoverageSettings> {
    return this.http
      .get<{ coverageMinimum: number; teamSize: number }>(apiUrl(this.baseUrl, 'api/team/settings'))
      .pipe(map((s) => ({ minimum: s.coverageMinimum, teamSize: s.teamSize })));
  }

  save(minimum: number): Observable<CoverageResult> {
    return this.http.put(apiUrl(this.baseUrl, 'api/team/settings/coverage'), { minimum }).pipe(
      map((): CoverageResult => ({ ok: true })),
      catchError(() => of<CoverageResult>({ ok: false })),
    );
  }
}
