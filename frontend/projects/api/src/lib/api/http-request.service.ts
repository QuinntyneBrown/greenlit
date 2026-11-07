import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import {
  ApprovalResult,
  NewRequest,
  RequestQuote,
  RequestSummary,
  SentRequest,
} from '../models/time-off-request';
import { API_BASE_URL, apiUrl } from './api-base-url';
import { RequestService } from './request.service';

/** The requests endpoints (api/requests, quote, approve, reopen). Responses are the view models; no mapping is needed. */
@Injectable({ providedIn: 'root' })
export class HttpRequestService implements RequestService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = inject(API_BASE_URL);

  quote(firstDay: string, lastDay: string): Observable<RequestQuote> {
    const params = new HttpParams().set('first', firstDay).set('last', lastDay);
    return this.http.get<RequestQuote>(apiUrl(this.baseUrl, 'api/requests/quote'), { params });
  }

  send(request: NewRequest): Observable<SentRequest> {
    return this.http.post<SentRequest>(apiUrl(this.baseUrl, 'api/requests'), request);
  }

  list(status: SentRequest['status']): Observable<readonly RequestSummary[]> {
    const params = new HttpParams().set('status', status);
    return this.http.get<RequestSummary[]>(apiUrl(this.baseUrl, 'api/requests'), { params });
  }

  approve(ids: readonly string[]): Observable<readonly ApprovalResult[]> {
    return this.http.post<ApprovalResult[]>(apiUrl(this.baseUrl, 'api/requests/approve'), { ids });
  }

  reopen(id: string): Observable<void> {
    return this.http.post<void>(apiUrl(this.baseUrl, `api/requests/${id}/reopen`), null);
  }
}
