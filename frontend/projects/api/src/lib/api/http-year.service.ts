import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { TeamYear } from '../models/year';
import { API_BASE_URL, apiUrl } from './api-base-url';
import { YearService } from './year.service';

/** GET /api/year. The response is the view model; no mapping is needed. */
@Injectable({ providedIn: 'root' })
export class HttpYearService implements YearService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = inject(API_BASE_URL);

  year(year: number): Observable<TeamYear> {
    return this.http.get<TeamYear>(apiUrl(this.baseUrl, 'api/year'), {
      params: new HttpParams().set('year', year),
    });
  }
}
