import { InjectionToken } from '@angular/core';
import { Observable } from 'rxjs';

import { Person } from '../models/person';

/** Whether an adjustment was recorded; any failure is `{ ok: false }` (the dialog says only that it could not save). */
export interface AdjustmentResult {
  readonly ok: boolean;
}

/** A person's page (docs/detailed-designs/allowances/person-page) and its allowance adjustments (adjust-allowance). */
export interface PersonService {
  /** The person with this id, or the signed-in person's own page for `me`. Fails 403 `own_details_only` and 404 `person_not_found`. */
  get(id: string): Observable<Person>;

  /** Adds `days` (negative to remove) to the member's allowance with a reason (L2-028). Manager only. */
  adjust(memberId: string, days: number, reason: string): Observable<AdjustmentResult>;
}

export const PERSON_SERVICE = new InjectionToken<PersonService>('PERSON_SERVICE');
