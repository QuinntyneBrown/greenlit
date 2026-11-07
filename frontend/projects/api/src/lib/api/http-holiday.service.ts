import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, catchError, map, of } from 'rxjs';

import { Holiday, TeamHolidays } from '../models/team-holidays';
import { API_BASE_URL, apiUrl } from './api-base-url';
import { AddHolidayResult, HolidayService } from './holiday.service';
import { problemCode } from './problem';

/** GET and POST /api/team/holidays. */
@Injectable({ providedIn: 'root' })
export class HttpHolidayService implements HolidayService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = inject(API_BASE_URL);

  list(): Observable<TeamHolidays> {
    return this.http.get<TeamHolidays>(apiUrl(this.baseUrl, 'api/team/holidays'));
  }

  add(date: string, name: string): Observable<AddHolidayResult> {
    return this.http.post<Holiday>(apiUrl(this.baseUrl, 'api/team/holidays'), { date, name }).pipe(
      map((holiday): AddHolidayResult => ({ outcome: 'added', holiday })),
      catchError((error: unknown) => {
        const code = problemCode(error);
        if (code === 'day_is_weekend') return of<AddHolidayResult>({ outcome: 'weekend' });
        if (code === 'holiday_exists') {
          const detail = (error as HttpErrorResponse).error?.detail;
          return of<AddHolidayResult>({
            outcome: 'exists',
            message: typeof detail === 'string' ? detail : 'That day is already a holiday.',
          });
        }
        return of<AddHolidayResult>({ outcome: 'failed' });
      }),
    );
  }
}
