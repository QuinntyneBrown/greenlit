import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import {
  ApprovalResult,
  DeclineResult,
  MyRequests,
  NewRequest,
  RequestCounts,
  RequestDetail,
  RequestQuote,
  RequestSummary,
  SentRequest,
} from '../models/time-off-request';
import { API_BASE_URL, apiUrl } from './api-base-url';
import { RequestService } from './request.service';

/** The requests endpoints (api/requests, counts, {id}, quote, approve, decline, reopen). Responses are the view models; no mapping is needed. */
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

  mine(): Observable<MyRequests> {
    return this.http.get<MyRequests>(apiUrl(this.baseUrl, 'api/requests/mine'));
  }

  counts(): Observable<RequestCounts> {
    return this.http.get<RequestCounts>(apiUrl(this.baseUrl, 'api/requests/counts'));
  }

  get(id: string): Observable<RequestDetail> {
    return this.http.get<RequestDetail>(apiUrl(this.baseUrl, `api/requests/${id}`));
  }

  approve(ids: readonly string[]): Observable<readonly ApprovalResult[]> {
    return this.http.post<ApprovalResult[]>(apiUrl(this.baseUrl, 'api/requests/approve'), { ids });
  }

  decline(id: string, reason: string | null): Observable<DeclineResult> {
    return this.http.post<DeclineResult>(apiUrl(this.baseUrl, `api/requests/${id}/decline`), {
      reason,
    });
  }

  cancel(id: string): Observable<void> {
    return this.http.post<void>(apiUrl(this.baseUrl, `api/requests/${id}/cancel`), null);
  }

  reopen(id: string): Observable<void> {
    return this.http.post<void>(apiUrl(this.baseUrl, `api/requests/${id}/reopen`), null);
  }
}
