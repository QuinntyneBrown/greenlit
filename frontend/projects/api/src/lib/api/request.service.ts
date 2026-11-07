import { InjectionToken } from '@angular/core';
import { Observable } from 'rxjs';

import {
  ApprovalResult,
  NewRequest,
  RequestQuote,
  RequestSummary,
  SentRequest,
} from '../models/time-off-request';

/** Time-off requests (docs/detailed-designs/requests/send-request, requests/approve-request). */
export interface RequestService {
  /** The working days in a range, as the dialog asks while the dates change. */
  quote(firstDay: string, lastDay: string): Observable<RequestQuote>;
  /** Sends a request; a refusal errors with a `code` (see `problemCode`): `days_taken`, `end_before_start`, ... */
  send(request: NewRequest): Observable<SentRequest>;
  /** The team's requests with this status, oldest first. Manager only. */
  list(status: SentRequest['status']): Observable<readonly RequestSummary[]>;
  /** Approves pending requests, all or none: their days turn Confirmed and the members are emailed. Manager only. */
  approve(ids: readonly string[]): Observable<readonly ApprovalResult[]>;
  /** Undo of an approval: the request is Pending again and its days Requested. Manager only. */
  reopen(id: string): Observable<void>;
}

export const REQUEST_SERVICE = new InjectionToken<RequestService>('REQUEST_SERVICE');
