import { InjectionToken } from '@angular/core';
import { Observable } from 'rxjs';

import { Person } from '../models/person';

/** A person's page (docs/detailed-designs/allowances/person-page). */
export interface PersonService {
  /** The person with this id, or the signed-in person's own page for `me`. Fails 403 `own_details_only` and 404 `person_not_found`. */
  get(id: string): Observable<Person>;
}

export const PERSON_SERVICE = new InjectionToken<PersonService>('PERSON_SERVICE');
