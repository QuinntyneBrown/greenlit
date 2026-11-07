import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { ChangeSet, DayChange, DayStroke } from '../models/change-set';
import { SheetMonth } from '../models/sheet-month';
import { API_BASE_URL, apiUrl } from './api-base-url';
import { SheetService } from './sheet.service';

/** GET /api/sheet, PUT /api/sheet/days and POST /api/sheet/days/restore. Responses are the view models; no mapping is needed. */
@Injectable({ providedIn: 'root' })
export class HttpSheetService implements SheetService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = inject(API_BASE_URL);

  month(month?: string): Observable<SheetMonth> {
    const params = month ? new HttpParams().set('month', month) : undefined;
    return this.http.get<SheetMonth>(apiUrl(this.baseUrl, 'api/sheet'), { params });
  }

  setDays(stroke: DayStroke): Observable<ChangeSet> {
    return this.http.put<ChangeSet>(apiUrl(this.baseUrl, 'api/sheet/days'), stroke);
  }

  restore(memberId: string, changes: readonly DayChange[]): Observable<ChangeSet> {
    const days = changes.map((c) => ({ date: c.date, status: c.previous }));
    return this.http.post<ChangeSet>(apiUrl(this.baseUrl, 'api/sheet/days/restore'), {
      memberId,
      days,
    });
  }
}
