import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, catchError, map, of } from 'rxjs';

import { API_BASE_URL, apiUrl } from './api-base-url';
import {
  AddChildResult,
  AddedChild,
  SchoolCalendarSaveResult,
  SchoolCalendarService,
} from './school-calendar.service';

/** The school calendar endpoints of the API (docs/detailed-designs/teams/school-calendar). */
@Injectable({ providedIn: 'root' })
export class HttpSchoolCalendarService implements SchoolCalendarService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = inject(API_BASE_URL);

  save(on: boolean): Observable<SchoolCalendarSaveResult> {
    return this.http
      .put(apiUrl(this.baseUrl, 'api/team/settings/school-calendar'), { schoolCalendar: on })
      .pipe(
        map((): SchoolCalendarSaveResult => ({ ok: true })),
        catchError(() => of<SchoolCalendarSaveResult>({ ok: false })),
      );
  }

  addChild(name: string, email: string | null): Observable<AddChildResult> {
    return this.http
      .post<AddedChild>(apiUrl(this.baseUrl, 'api/team/children'), { name, email })
      .pipe(
        map((child): AddChildResult => ({ outcome: 'added', child })),
        catchError(() => of<AddChildResult>({ outcome: 'failed' })),
      );
  }
}
