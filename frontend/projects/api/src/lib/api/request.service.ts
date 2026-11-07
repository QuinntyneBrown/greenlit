import { InjectionToken } from '@angular/core';
import { Observable } from 'rxjs';

import { NewRequest, RequestQuote, SentRequest } from '../models/time-off-request';

/** Time-off requests (docs/detailed-designs/requests/send-request). */
export interface RequestService {
  /** The working days in a range, as the dialog asks while the dates change. */
  quote(firstDay: string, lastDay: string): Observable<RequestQuote>;
  /** Sends a request; a refusal errors with a `code` (see `problemCode`): `days_taken`, `end_before_start`, ... */
  send(request: NewRequest): Observable<SentRequest>;
}

export const REQUEST_SERVICE = new InjectionToken<RequestService>('REQUEST_SERVICE');
