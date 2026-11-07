import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, catchError, map, of } from 'rxjs';

import { WeekDay } from '../models/week-day';
import { API_BASE_URL, apiUrl } from './api-base-url';
import { WorkingDaysResult, WorkingDaysService } from './working-days.service';

/** GET /api/team/settings, PUT /api/team/settings/work-week and PUT /api/team/members/{id}/working-days. */
@Injectable({ providedIn: 'root' })
export class HttpWorkingDaysService implements WorkingDaysService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = inject(API_BASE_URL);

  workWeek(): Observable<readonly WeekDay[]> {
    return this.http
      .get<{ workingDays: WeekDay[] }>(apiUrl(this.baseUrl, 'api/team/settings'))
      .pipe(map((settings) => settings.workingDays));
  }

  saveWorkWeek(days: readonly WeekDay[]): Observable<WorkingDaysResult> {
    return this.http.put(apiUrl(this.baseUrl, 'api/team/settings/work-week'), { days }).pipe(
      map((): WorkingDaysResult => ({ ok: true })),
      catchError(() => of<WorkingDaysResult>({ ok: false })),
    );
  }

  setMemberDays(memberId: string, days: readonly WeekDay[]): Observable<WorkingDaysResult> {
    return this.http
      .put(apiUrl(this.baseUrl, `api/team/members/${memberId}/working-days`), { days })
      .pipe(
        map((): WorkingDaysResult => ({ ok: true })),
        catchError(() => of<WorkingDaysResult>({ ok: false })),
      );
  }
}
