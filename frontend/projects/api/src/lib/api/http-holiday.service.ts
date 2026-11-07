import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { TeamHolidays } from '../models/team-holidays';
import { API_BASE_URL, apiUrl } from './api-base-url';
import { HolidayService } from './holiday.service';

/** GET /api/team/holidays. */
@Injectable({ providedIn: 'root' })
export class HttpHolidayService implements HolidayService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = inject(API_BASE_URL);

  list(): Observable<TeamHolidays> {
    return this.http.get<TeamHolidays>(apiUrl(this.baseUrl, 'api/team/holidays'));
  }
}
