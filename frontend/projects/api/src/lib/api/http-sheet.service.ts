import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { SheetMonth } from '../models/sheet-month';
import { API_BASE_URL, apiUrl } from './api-base-url';
import { SheetService } from './sheet.service';

/** GET /api/sheet?month=yyyy-MM. The response is the view model; no mapping is needed. */
@Injectable({ providedIn: 'root' })
export class HttpSheetService implements SheetService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = inject(API_BASE_URL);

  month(month?: string): Observable<SheetMonth> {
    const params = month ? new HttpParams().set('month', month) : undefined;
    return this.http.get<SheetMonth>(apiUrl(this.baseUrl, 'api/sheet'), { params });
  }
}
