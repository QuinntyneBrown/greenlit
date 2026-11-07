import { InjectionToken } from '@angular/core';
import { Observable } from 'rxjs';

import {
  ApprovalResult,
  DeclineResult,
  NewRequest,
  RequestCounts,
  RequestDetail,
  RequestQuote,
  RequestSummary,
  SentRequest,
} from '../models/time-off-request';

/** Time-off requests (docs/detailed-designs/requests/send-request, approve-request, review-requests). */
export interface RequestService {
  /** The working days in a range, as the dialog asks while the dates change. */
  quote(firstDay: string, lastDay: string): Observable<RequestQuote>;
  /** Sends a request; a refusal errors with a `code` (see `problemCode`): `days_taken`, `end_before_start`, ... */
  send(request: NewRequest): Observable<SentRequest>;
  /** The team's requests with this status, oldest first; `Declined` also lists the cancelled ones. Manager only. */
  list(status: SentRequest['status']): Observable<readonly RequestSummary[]>;
  /** How many requests each ledger tab holds. Manager only. */
  counts(): Observable<RequestCounts>;
  /** One request with the team for the weeks around it. Manager only; an unknown id errors with 404. */
  get(id: string): Observable<RequestDetail>;
  /** Approves pending requests, all or none: their days turn Confirmed and the members are emailed. Manager only. */
  approve(ids: readonly string[]): Observable<readonly ApprovalResult[]>;
  /** Declines a pending request with an optional reason: its days return to Tentative and the member is emailed. Manager only. */
  decline(id: string, reason: string | null): Observable<DeclineResult>;
  /** Undo of a decision: the request is Pending again and its days Requested. Manager only. */
  reopen(id: string): Observable<void>;
}

export const REQUEST_SERVICE = new InjectionToken<RequestService>('REQUEST_SERVICE');
