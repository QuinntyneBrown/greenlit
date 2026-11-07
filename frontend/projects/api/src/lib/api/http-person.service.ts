import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, catchError, map, of } from 'rxjs';

import { Person } from '../models/person';
import { API_BASE_URL, apiUrl } from './api-base-url';
import { AdjustmentResult, PersonService } from './person.service';

/** GET /api/people/{id} and POST /api/people/{id}/adjustments. The person response is the view model; no mapping is needed. */
@Injectable({ providedIn: 'root' })
export class HttpPersonService implements PersonService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = inject(API_BASE_URL);

  get(id: string): Observable<Person> {
    return this.http.get<Person>(apiUrl(this.baseUrl, `api/people/${encodeURIComponent(id)}`));
  }

  adjust(memberId: string, days: number, reason: string): Observable<AdjustmentResult> {
    return this.http
      .post(apiUrl(this.baseUrl, `api/people/${encodeURIComponent(memberId)}/adjustments`), {
        days,
        reason,
      })
      .pipe(
        map((): AdjustmentResult => ({ ok: true })),
        catchError(() => of<AdjustmentResult>({ ok: false })),
      );
  }
}
